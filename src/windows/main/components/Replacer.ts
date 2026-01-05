import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent, SearchAction } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { isErr, readTextFile, writeTextFile } from "@utils/invokes";

import { error } from "@tauri-apps/plugin-log";

export class Replacer {
    #tempMapsPath = "";
    #translationPath = "";

    public init(projectSettings: ProjectSettings): void {
        this.#tempMapsPath = projectSettings.tempMapsPath;
        this.#translationPath = projectSettings.translationPath;
    }

    public async replaceSingle(
        rows: Rows,
        tabName: string,
        regexp: RegExp,
        replacerText: string,
        filename: string,
        entry: string,
        columnIndex: number,
        rowIndex: number,
        searchAction: SearchAction,
    ): Promise<void> {
        if (filename === tabName) {
            this.#replaceCurrentTab(
                rows,
                regexp,
                replacerText,
                filename,
                entry,
                columnIndex,
                rowIndex,
                searchAction,
            );
        } else {
            const filePath = utils.join(
                filename.startsWith("map")
                    ? this.#tempMapsPath
                    : this.#translationPath,
                `${filename}${consts.TXT_EXTENSION}`,
            );

            const fileContent = await readTextFile(filePath);

            if (isErr(fileContent)) {
                void error(fileContent[0]!);
                return;
            }

            const lines = utils.lines(fileContent[1]!);

            this.#replaceExternalFile(
                regexp,
                replacerText,
                lines,
                filename,
                entry,
                columnIndex,
                rowIndex,
                searchAction,
            );

            const result = await writeTextFile(filePath, lines.join("\n"));

            if (isErr(result)) {
                void error(result[0]!);
            }
        }

        await emittery.emit(AppEvent.UpdateSaved, false);
    }

    public async replaceAll(
        results: SearchResults,
        rows: Rows,
        tabName: string,
        replacerText: string,
        searchAction: SearchAction,
    ): Promise<void> {
        for (const [resultEntry, rowNumbers] of Object.entries(
            results.results,
        )) {
            const [filename, entry, columnString] = resultEntry.split("-");
            const column = Number(columnString);

            let changedCount = 0;

            if (tabName.startsWith(resultEntry)) {
                for (const rowNumber of rowNumbers) {
                    changedCount += this.#replaceCurrentTab(
                        rows,
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
                        ? this.#tempMapsPath
                        : this.#translationPath,
                    resultEntry.slice(0, resultEntry.lastIndexOf("-")),
                );

                const fileContent = await readTextFile(filePath);

                if (isErr(fileContent)) {
                    void error(fileContent[0]!);
                    return;
                }

                const lines = utils.lines(fileContent[1]!);

                for (const rowIndex of rowNumbers) {
                    changedCount += this.#replaceExternalFile(
                        results.regexp,
                        replacerText,
                        lines,
                        filename,
                        entry,
                        column,
                        rowIndex,
                        searchAction,
                    );
                }

                const result = await writeTextFile(filePath, lines.join("\n"));

                if (isErr(result)) {
                    void error(result[0]!);
                }
            }

            await emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                changedCount,
                filename,
            ]);
        }

        await emittery.emit(AppEvent.UpdateSaved, false);
    }

    #addLog(
        filename: string,
        entry: string,
        source: string,
        columnIndex: number,
        old: string,
        new_: string,
    ): void {
        void emittery.emit(AppEvent.AddLog, [
            filename,
            source,
            [entry, columnIndex, old, new_],
        ]);
    }

    #replaceCurrentTab(
        rows: Rows,
        regexp: RegExp,
        replacerText: string,
        filename: string,
        entry: string,
        columnIndex: number,
        rowIndex: number,
        searchAction: SearchAction,
    ): number {
        const textarea = rows[rowIndex].children[columnIndex + 2];

        let changedCount = 0;
        let newValue: string;

        if (searchAction === SearchAction.Replace) {
            newValue = textarea.value.replace(regexp, replacerText);
        } else {
            newValue = replacerText;

            if (!textarea.value) {
                changedCount = 1;
            } else if (!replacerText) {
                changedCount = -1;
            }
        }

        textarea.value = newValue;

        this.#addLog(
            filename,
            entry,
            utils.source(rows[rowIndex]),
            columnIndex,
            textarea.value,
            newValue,
        );

        return changedCount;
    }

    #replaceExternalFile(
        regexp: RegExp,
        replacerText: string,
        contentLines: string[],
        filename: string,
        entry: string,
        columnIndex: number,
        rowIndex: number,
        searchAction: SearchAction,
    ): number {
        const parts = utils.parts(contentLines[rowIndex]);

        if (!parts) {
            utils.logSplitError(filename, rowIndex + 1);
            return 0;
        }

        const source = utils.source(parts);
        const translations = utils.translations(parts);
        const translation = utils.clbtodlb(translations[columnIndex]);

        let changedCount = 0;
        let newValue: string;

        if (searchAction === SearchAction.Replace) {
            newValue = translation.replace(regexp, replacerText);
        } else {
            newValue = replacerText;

            if (!translation) {
                changedCount = 1;
            } else if (!replacerText) {
                changedCount = -1;
            }
        }

        translations[columnIndex] = utils.dlbtoclb(newValue);
        contentLines[rowIndex] =
            `${source}${consts.SEPARATOR}${translations.join(consts.SEPARATOR)}`;

        this.#addLog(
            filename,
            entry,
            utils.clbtodlb(source),
            columnIndex,
            translation,
            newValue,
        );

        return changedCount;
    }
}
