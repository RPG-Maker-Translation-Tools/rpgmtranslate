import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
    LINES_SEPARATOR,
    NEW_LINE,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION_LENGTH,
} from "../utilities/constants";
import { createRegExp, join } from "../utilities/functions";
import { ReplaceMode, SearchMode } from "./enums";
import { Searcher } from "./searcher";
import { Settings } from "./settings";

export class Replacer {
    replacedText = false;

    constructor(
        private readonly settings: Settings,
        private readonly replacementLog: Record<
            string,
            { old: string; new: string }
        >,
        private readonly searchFlags: SearchFlagsObject,
        private readonly currentTab: CurrentTab,
        private readonly searcher: Searcher,
    ) {}

    public async replaceText(
        text: string,
        replacer: string,
        searchMode: SearchMode,
        replaceMode: ReplaceMode,
    ): Promise<string | undefined> {
        const [results] = await this.searcher.search(
            text,
            searchMode,
            replaceMode,
        );

        if (!results.size) {
            return;
        }

        const regexp: RegExp | null = await createRegExp(
            text,
            this.searchFlags,
        );
        if (!regexp) {
            return;
        }

        for (const [file, rowNumberArray] of results.entries()) {
            if (this.currentTab.name?.startsWith(file)) {
                this.replaceInCurrentTab(
                    rowNumberArray,
                    regexp,
                    replacer,
                    replaceMode,
                );
            } else {
                await this.replaceInExternalFile(
                    file,
                    rowNumberArray,
                    regexp,
                    replacer,
                    replaceMode,
                );
            }
        }

        this.replacedText = true;
    }

    public async replaceTextHTML(
        textarea: HTMLTextAreaElement,
        replacerText: string,
        replaceMode: ReplaceMode,
    ): Promise<string | undefined> {
        const text = textarea.value;

        const regexp: RegExp | null = await createRegExp(
            text,
            this.searchFlags,
        );

        if (!regexp) {
            return;
        }

        let newValue: string;

        if (replaceMode === ReplaceMode.Replace) {
            newValue = textarea.value
                .split(regexp)
                .flatMap((part, i, arr) => [
                    part,
                    i < arr.length - 1
                        ? `<span class="bg-red-600">${replacerText}</span>`
                        : "",
                ])
                .join("");

            this.replacementLog[textarea.id] = {
                old: textarea.value,
                new: newValue,
            };
            textarea.value = newValue.replaceAll(/<span(.*?)>|<\/span>/g, "");
            this.replacedText = true;
        } else {
            textarea.value = replacerText;
            newValue = `<span class="bg-red-600">${replacerText}</span>`;
        }

        return newValue;
    }

    private replaceInCurrentTab(
        rowNumberArray: number[],
        regexp: RegExp,
        replacerText: string,
        replaceMode: ReplaceMode,
    ) {
        for (const rowNumber of rowNumberArray) {
            const textarea = this.currentTab.content.children[rowNumber - 1]
                .lastElementChild! as HTMLTextAreaElement;

            if (replaceMode === ReplaceMode.Replace) {
                const newValue = textarea.value.replace(regexp, replacerText);

                this.replacementLog[
                    textarea.closest(`[id^="${this.currentTab.name}"]`)!.id
                ] = {
                    old: textarea.value,
                    new: newValue,
                };

                textarea.value = newValue;
            } else {
                textarea.value = replacerText;
            }
        }
    }

    private async replaceInExternalFile(
        file: string,
        rowNumberArray: number[],
        regexp: RegExp,
        replacer: string,
        replaceMode: ReplaceMode,
    ) {
        const filePath = join(
            this.settings.programDataPath,
            file.startsWith("maps")
                ? TEMP_MAPS_DIRECTORY
                : TRANSLATION_DIRECTORY,
            file,
        );

        const fileContent = (await readTextFile(filePath)).split("\n");

        for (const rowNumber of rowNumberArray) {
            const [original, translated] =
                fileContent[rowNumber].split(LINES_SEPARATOR);
            const translatedNormalized = translated.replaceAll(NEW_LINE, "\n");

            const newValue =
                replaceMode === ReplaceMode.Replace
                    ? translatedNormalized.replace(regexp, replacer)
                    : replacer;

            if (replaceMode === ReplaceMode.Replace) {
                this.replacementLog[
                    `${file.slice(0, -TXT_EXTENSION_LENGTH)}-${rowNumber}`
                ] = {
                    old: translatedNormalized,
                    new: newValue,
                };
            }

            fileContent[rowNumber] =
                `${original}${LINES_SEPARATOR}${newValue.replaceAll("\n", NEW_LINE)}`;
        }

        await writeTextFile(filePath, fileContent.join("\n"));
    }
}
