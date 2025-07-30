import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
    SEPARATOR,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
} from "../utilities/constants";
import { createRegExp, join } from "../utilities/functions";
import { SearchAction, SearchMode } from "./enums";
import { Searcher } from "./searcher";
import { Settings } from "./settings";

// TODO: Increment translation counter on puts, or decrement on putting empty

export class Replacer {
    public constructor(
        private readonly settings: Settings,
        private readonly replacementLog: ReplacementLog,
        private readonly searchFlags: SearchFlagsObject,
        private readonly currentTab: CurrentTab,
        private readonly searcher: Searcher,
    ) {}

    #addLog(filename: string, source: string, old: string, new_: string) {
        if (!(filename in this.replacementLog)) {
            this.replacementLog[filename] = {};
        }

        this.replacementLog[filename][source] = [old, new_];
    }

    public async replaceSingle(
        searchText: string,
        replacerText: string,
        filename: string,
        rowNumber: number,
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

        let replacedText: string;

        if (filename === this.currentTab.name) {
            replacedText = this.replaceCurrentTab(
                regexp,
                replacerText,
                filename,
                rowNumber,
                searchAction,
                true,
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

            replacedText = this.replaceExternalFile(
                regexp,
                replacerText,
                contentLines,
                filename,
                rowNumber,
                searchAction,
                true,
            );

            await writeTextFile(filePath, contentLines.join("\n"));
        }

        return replacedText;
    }

    public async replaceAll(
        searchText: string,
        replacerText: string,
        searchMode: SearchMode,
        searchAction: SearchAction,
    ): Promise<string | undefined> {
        const [results] = await this.searcher.search(
            searchText,
            searchMode,
            searchAction,
        );

        if (!results.size) {
            return;
        }

        const regexp = await createRegExp(
            searchText,
            this.searchFlags,
            searchAction,
        );

        if (!regexp) {
            return;
        }

        for (const [filename, rowNumbers] of results.entries()) {
            if (this.currentTab.name?.startsWith(filename)) {
                for (const rowNumber of rowNumbers) {
                    this.replaceCurrentTab(
                        regexp,
                        replacerText,
                        filename,
                        rowNumber - 1,
                        searchAction,
                        false,
                    );
                }
            } else {
                const filePath = join(
                    this.settings.programDataPath,
                    filename.startsWith("map")
                        ? TEMP_MAPS_DIRECTORY
                        : TRANSLATION_DIRECTORY,
                    filename,
                );

                const fileContent = (await readTextFile(filePath)).lines();

                for (const rowNumber of rowNumbers) {
                    this.replaceExternalFile(
                        regexp,
                        replacerText,
                        fileContent,
                        filename,
                        rowNumber,
                        searchAction,
                        false,
                    );
                }

                await writeTextFile(filePath, fileContent.join("\n"));
            }
        }
    }

    private replaceCurrentTab(
        regexp: RegExp,
        replacerText: string,
        filename: string,
        rowNumber: number,
        searchAction: SearchAction,
        single: boolean,
    ): string {
        const textarea = this.currentTab.content.children[rowNumber]
            .lastElementChild! as HTMLTextAreaElement;

        let replacedText = "";
        let newValue = "";

        if (searchAction === SearchAction.Replace) {
            newValue = textarea.value.replace(regexp, replacerText);

            if (single) {
                replacedText = textarea.value.replace(
                    regexp,
                    `<span class="bg-red-600">${replacerText}</span>`,
                );
            }
        } else {
            newValue = replacerText;

            if (single) {
                replacedText = `<span class="bg-red-600">${replacerText}</span>`;
            }
        }

        if (newValue) {
            this.#addLog(
                filename,
                this.currentTab.content.children[rowNumber].children[1]
                    .textContent!,
                textarea.value,
                newValue,
            );
            textarea.value = newValue;
        }

        return replacedText;
    }

    private replaceExternalFile(
        regexp: RegExp,
        replacerText: string,
        contentLines: string[],
        filename: string,
        rowNumber: number,
        searchAction: SearchAction,
        single: boolean,
    ): string {
        const [source_, translation_] =
            contentLines[rowNumber].split(SEPARATOR);
        const translation = translation_.denormalize();

        let replacedText = "";
        let newValue = "";

        if (searchAction === SearchAction.Replace) {
            newValue = translation.replace(regexp, replacerText);

            if (single) {
                replacedText = translation.replace(
                    regexp,
                    `<span class="bg-red-600">${replacerText}</span>`,
                );
            }
        } else {
            newValue = replacerText;

            if (single) {
                replacedText = `<span class="bg-red-600">${replacerText}</span>`;
            }
        }

        if (newValue) {
            contentLines[rowNumber] =
                `${source_}${SEPARATOR}${newValue.nnormalize()}`;

            this.#addLog(filename, source_, translation, newValue);
        }

        return replacedText;
    }
}
