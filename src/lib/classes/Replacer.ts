import { Saver } from "@classes/Saver";
import { Searcher } from "@classes/Searcher";
import { SearchAction } from "@enums/SearchAction";
import { SearchMode } from "@enums/SearchMode";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import * as _ from "radashi";

import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ProjectSettings } from "./ProjectSettings";

export class Replacer {
    public constructor(
        private readonly searcher: Searcher,
        private readonly saver: Saver,
        private readonly projectSettings: ProjectSettings,
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
        const regexp = await utils.createRegExp(
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
            const filePath = utils.join(
                filename.startsWith("map")
                    ? this.projectSettings.tempMapsPath
                    : this.projectSettings.translationPath,
                `${filename}${consts.TXT_EXTENSION}`,
            );

            const contentLines = utils.lines(await readTextFile(filePath));

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
                const filePath = utils.join(
                    resultEntry.startsWith("map")
                        ? this.projectSettings.tempMapsPath
                        : this.projectSettings.translationPath,
                    resultEntry.slice(0, resultEntry.lastIndexOf("-")),
                );

                const fileContent = utils.lines(await readTextFile(filePath));

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
            } else if (_.isEmpty(replacerText)) {
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
        const parts = utils.parts(contentLines[rowIndex]);

        if (!parts) {
            utils.logSplitError(filename, rowIndex + 1);
            return;
        }

        const source = utils.source(parts);
        const translation = utils.clbtodlb(utils.translation(parts));

        let newValue: string;

        if (searchAction === SearchAction.Replace) {
            newValue = translation.replace(regexp, replacerText);
        } else {
            newValue = replacerText;

            if (!translation) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] += 1;
            } else if (_.isEmpty(replacerText)) {
                this.tabInfo.translated[this.tabInfo.tabs[filename]] -= 1;
            }
        }

        contentLines[rowIndex] =
            `${source}${consts.SEPARATOR}${utils.dlbtoclb(newValue)}`;
        this.#addLog(
            filename,
            entry,
            utils.clbtodlb(source),
            column,
            translation,
            newValue,
        );
    }
}
