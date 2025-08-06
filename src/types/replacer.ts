import {
    SEPARATOR,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
} from "../utilities/constants";
import { createRegExp, join } from "../utilities/functions";
import { SearchAction, SearchMode } from "./enums";
import { Saver } from "./saver";
import { Searcher } from "./searcher";
import { Settings } from "./settings";

import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export class Replacer {
    public constructor(
        private readonly searcher: Searcher,
        private readonly saver: Saver,
        private readonly settings: Settings,
        private readonly replacementLog: ReplacementLog,
        private readonly searchFlags: SearchFlagsObject,
        private readonly tabInfo: TabInfo,
    ) {}

    #addLog(
        filename: string,
        entry: string,
        source: string,
        column: number,
        old: string,
        new_: string,
    ) {
        if (!(filename in this.replacementLog)) {
            this.replacementLog[filename] = {};
        }

        this.replacementLog[filename][source] = [entry, column, old, new_];
    }

    public async replaceSingle(
        searchText: string,
        replacerText: string,
        filename: string,
        entry: string,
        column: number,
        rowIndex: number,
        searchAction: SearchAction,
    ) {
        const regexp = await createRegExp(
            searchText,
            this.searchFlags,
            searchAction,
        );

        if (!regexp) {
            return;
        }

        if (filename === this.tabInfo.currentTab.name) {
            this.#replaceCurrentTab(
                regexp,
                replacerText,
                filename,
                entry,
                column,
                rowIndex,
                searchAction,
            );
        } else {
            const filePath = join(
                this.settings.programDataPath,
                filename.startsWith("map")
                    ? TEMP_MAPS_DIRECTORY
                    : TRANSLATION_DIRECTORY,
                `${filename}${TXT_EXTENSION}`,
            );

            const contentLines = (await readTextFile(filePath)).lines();

            this.#replaceExternalFile(
                regexp,
                replacerText,
                contentLines,
                filename,
                entry,
                column,
                rowIndex,
                searchAction,
            );

            await writeTextFile(filePath, contentLines.join("\n"));
        }

        this.saver.saved = false;
    }

    public async replaceAll(
        searchText: string,
        replacerText: string,
        searchMode: SearchMode,
        searchAction: SearchAction,
    ) {
        const results = await this.searcher.search(
            searchText,
            searchMode,
            searchAction,
        );

        if (results.pages === 0) {
            return;
        }

        for (const [resultEntry, rowNumbers] of Object.entries(
            results.results,
        )) {
            const [filename, entry, columnString] = resultEntry.split("-");
            const column = Number(columnString);

            if (this.tabInfo.currentTab.name.startsWith(resultEntry)) {
                for (const rowNumber of rowNumbers) {
                    this.#replaceCurrentTab(
                        results.regexp,
                        replacerText,
                        filename,
                        entry,
                        column,
                        rowNumber - 1,
                        searchAction,
                    );
                }
            } else {
                const filePath = join(
                    this.settings.programDataPath,
                    resultEntry.startsWith("map")
                        ? TEMP_MAPS_DIRECTORY
                        : TRANSLATION_DIRECTORY,
                    resultEntry.slice(0, resultEntry.lastIndexOf("-")),
                );

                const fileContent = (await readTextFile(filePath)).lines();

                for (const rowIndex of rowNumbers) {
                    this.#replaceExternalFile(
                        results.regexp,
                        replacerText,
                        fileContent,
                        filename,
                        entry,
                        column,
                        rowIndex,
                        searchAction,
                    );
                }

                await writeTextFile(filePath, fileContent.join("\n"));
            }
        }

        this.saver.saved = false;
    }

    #replaceCurrentTab(
        regexp: RegExp,
        replacerText: string,
        filename: string,
        entry: string,
        column: number,
        rowIndex: number,
        searchAction: SearchAction,
    ) {
        const textarea = this.tabInfo.currentTab.content.children[rowIndex]
            .lastElementChild! as HTMLTextAreaElement;

        let newValue: string;

        if (searchAction === SearchAction.Replace) {
            newValue = textarea.value.replace(regexp, replacerText);
        } else {
            newValue = replacerText;

            if (!textarea.value) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] += 1;
            } else if (replacerText.isEmpty()) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] -= 1;
            }
        }

        this.#addLog(
            filename,
            entry,
            this.tabInfo.currentTab.content.children[rowIndex].children[1]
                .textContent,
            column,
            textarea.value,
            newValue,
        );

        textarea.value = newValue;
    }

    #replaceExternalFile(
        regexp: RegExp,
        replacerText: string,
        contentLines: string[],
        filename: string,
        entry: string,
        column: number,
        rowIndex: number,
        searchAction: SearchAction,
    ) {
        const split = contentLines[rowIndex].parts();

        if (!split) {
            // TODO: handle error
            return;
        }

        const source = split.source();
        const translation = split.translation().clbtodlb();

        let newValue: string;

        if (searchAction === SearchAction.Replace) {
            newValue = translation.replace(regexp, replacerText);
        } else {
            newValue = replacerText;

            if (!translation) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] += 1;
            } else if (replacerText.isEmpty()) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] -= 1;
            }
        }

        contentLines[rowIndex] = `${source}${SEPARATOR}${newValue.dlbtoclb()}`;
        this.#addLog(
            filename,
            entry,
            source.clbtodlb(),
            column,
            translation,
            newValue,
        );
    }
}
