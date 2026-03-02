import { ProjectSettings } from "@lib/classes";
import { emittery } from "@lib/classes/emittery";
import {
    AppEvent,
    MatchType,
    SearchAction,
    SearchFlags,
    SearchMode,
} from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import {
    isErr,
    mkdir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@utils/invokes";

import { t } from "@lingui/core/macro";

import XRegExp from "xregexp";

import { message } from "@tauri-apps/plugin-dialog";
import { error, info } from "@tauri-apps/plugin-log";

interface Match {
    text: string;
    type: MatchType;
    columnName: string;
    columnNumber: number;
}

export class Searcher {
    #searchFlags: SearchFlags = SearchFlags.None;

    #searchResults: SearchResults = {
        results: {},
        pages: 0,
        regexp: / /,
    };
    #matchObject: SearchMatchArray = [];
    #searchMode?: SearchMode;
    #searchAction?: SearchAction;

    #projectSettings!: ProjectSettings;

    public toggleFlag(flag: SearchFlags): void {
        this.#searchFlags ^= flag;
    }

    public enableFlag(flag: SearchFlags): void {
        this.#searchFlags |= flag;
    }

    public disableFlag(flag: SearchFlags): void {
        this.#searchFlags &= ~flag;
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
    }

    public async search(
        tabName: string,
        files: SelectedFiles,
        text: string,
        columnIndex: number,
        searchMode: SearchMode,
        searchAction: SearchAction,
    ): Promise<SearchResults> {
        this.#reset();

        const regexp = await this.createRegExp(text, searchAction);

        if (!regexp) {
            return this.#searchResults;
        }

        this.#searchMode = searchMode;
        this.#searchAction = searchAction;
        this.#searchResults.regexp = regexp;

        await this.#removeOldMatches();

        for (const [file, range] of files) {
            if (file == tabName) {
                await emittery.emit(AppEvent.ChangeTab, "");
            }

            const filePath = utils.join(
                file.startsWith("map")
                    ? this.#projectSettings.tempMapsPath
                    : this.#projectSettings.translationPath,
                file + consts.TXT_EXTENSION,
            );

            const content = await readTextFile(filePath);

            if (isErr(content)) {
                void error(content[0]!);
                continue;
            }

            const rows = utils.lines(content[1]!);
            this.#searchRows(file, rows, columnIndex, range);

            await this.#writeMatches();
        }

        await this.#writeMatches(true);
        return this.#searchResults;
    }

    public async createRegExp(
        text: string,
        searchAction: SearchAction,
    ): Promise<RegExp | null> {
        text = text.trim();
        if (!text) {
            return null;
        }

        let expression =
            this.#searchFlags & SearchFlags.RegExp ? text : RegExp.escape(text);

        if (this.#searchFlags & SearchFlags.WholeWord) {
            expression = `(?<!\\p{L})${expression}(?!\\p{L})`;
        }

        if (searchAction === SearchAction.Put) {
            expression = `^${expression}$`;
        }

        const flags =
            this.#searchFlags & SearchFlags.CaseSensitive ? "g" : "gi";

        try {
            return XRegExp(expression, flags);
        } catch (err) {
            await message(`Invalid regular expression. (${text}), ${err})`);
            return null;
        }
    }

    #highlightMatches(elementText: string, matches: string[]): string {
        const result: string[] = [];
        let lastIndex = 0;

        for (const match of matches) {
            const beforeMatchIndex = elementText.indexOf(match, lastIndex);
            const beforeMatch = elementText.slice(lastIndex, beforeMatchIndex);

            const matchElement = `${beforeMatch}<span class="bg-third">${match}</span>`;
            result.push(matchElement);

            lastIndex = beforeMatchIndex + match.length;
        }

        const afterMatch = elementText.slice(lastIndex);
        result.push(afterMatch);

        return result.join("");
    }

    #appendSearchMatch(
        match: Match,
        matchCounterpart: Match,
        filename: string,
        entry: string,
        rowNumber: string | number,
    ): void {
        // Regexp.exec fucks up matches by including capturing groups
        // eslint-disable-next-line sonarjs/prefer-regexp-exec
        const matches = match.text.match(this.#searchResults.regexp);

        if (!matches) {
            return;
        }

        if (this.#searchAction === SearchAction.Search) {
            const matchKey = `${filename} - ${entry} - ${match.type} - ${match.columnName} (${match.columnNumber}) - ${rowNumber}`;
            const matchCounterpartKey = `${filename} - ${entry} - ${matchCounterpart.type} - ${matchCounterpart.columnName} (${matchCounterpart.columnNumber}) - ${rowNumber}`;

            this.#matchObject.push([
                [matchKey, this.#highlightMatches(match.text, matches)],
                [matchCounterpartKey, matchCounterpart.text],
            ]);
        } else {
            const resultEntry = `${filename}-${entry}-${match.columnNumber}`;

            if (!(resultEntry in this.#searchResults.results)) {
                this.#searchResults.results[resultEntry] = [];
            }

            this.#searchResults.results[resultEntry].push(Number(rowNumber));
        }
    }

    async #writeMatches(drain = false): Promise<void> {
        if (
            !this.#matchObject.length ||
            (this.#matchObject.length < consts.MAX_FILE_MATCHES && !drain)
        ) {
            return;
        }

        let i = 0;
        const chunks: SearchMatchArray[] = [];

        while (i < this.#matchObject.length) {
            const count = Math.min(
                this.#matchObject.length - i,
                consts.MAX_FILE_MATCHES,
            );
            chunks.push(this.#matchObject.slice(i, i + count));
            i += count;
        }

        await mkdir(this.#projectSettings.matchesPath);

        for (const chunk of chunks) {
            this.#searchResults.pages++;

            const filePath = utils.join(
                this.#projectSettings.matchesPath,
                `match${this.#searchResults.pages}.json`,
            );

            const result = await writeTextFile(filePath, JSON.stringify(chunk));

            if (isErr(result)) {
                void error(result[0]!);
            }
        }

        this.#matchObject = [];
    }

    async #removeOldMatches(): Promise<void> {
        await removePath(this.#projectSettings.matchesPath, {
            recursive: true,
        }).catch(error);
    }

    #searchRows(
        filename: string,
        rows: string[],
        columnIndex: number,
        range: FileRange,
    ): void {
        const searchSource =
            this.#searchMode !== SearchMode.Translation &&
            this.#searchAction !== SearchAction.Replace;
        const searchTranslation =
            this.#searchMode !== SearchMode.Source &&
            this.#searchAction !== SearchAction.Put;

        let entryIndex!: string;
        let lineIdx = 1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            if (row.startsWith(consts.COMMENT_PREFIX)) {
                if (row.startsWith(consts.ID_COMMENT)) {
                    entryIndex = row.slice(
                        consts.ID_COMMENT.length + consts.SEPARATOR.length,
                    );
                }

                if (this.#searchFlags & SearchFlags.Comment) {
                    const sourceMatch: Match = {
                        text: row.slice(0, consts.NAME_COMMENT.length),
                        type: MatchType.Source,
                        columnName: "N/A",
                        columnNumber: 0,
                    };

                    const translationMatch: Match = {
                        text: row.slice(
                            consts.NAME_COMMENT.length +
                                consts.SEPARATOR.length,
                        ),
                        type: MatchType.Translation,
                        columnName: "N/A",
                        columnNumber: 0,
                    };

                    this.#appendSearchMatch(
                        sourceMatch,
                        translationMatch,
                        filename,
                        entryIndex,
                        lineIdx,
                    );

                    this.#appendSearchMatch(
                        translationMatch,
                        sourceMatch,
                        filename,
                        entryIndex,
                        lineIdx,
                    );
                }

                continue;
            }

            const split = utils.parts(row);

            if (!split) {
                utils.logSplitError(filename, i + 1);
                continue;
            }

            if (!utils.rangeContains(range, lineIdx++)) {
                void info(`Skipped index ${lineIdx} in file ${filename}`);
                continue;
            }

            const source = utils.source(split);

            const sourceMatch: Match = {
                text: utils.toLF(source),
                type: MatchType.Source,
                columnName: t`Source`,
                columnNumber: 0,
            };

            if (searchSource) {
                let translation: string;
                let column = columnIndex;

                if (columnIndex === -1) {
                    [translation, column] = utils.translation(split);
                } else {
                    translation = utils.translations(split)[columnIndex];
                }

                const translationMatch: Match = {
                    text: utils.toLF(translation),
                    type: MatchType.Translation,
                    columnName:
                        this.#projectSettings.translationColumns[column][0],
                    columnNumber: column + 1,
                };

                this.#appendSearchMatch(
                    sourceMatch,
                    translationMatch,
                    filename,
                    entryIndex,
                    lineIdx - 1,
                );
            }

            if (searchTranslation) {
                const translations = utils.translations(split);

                const start = columnIndex === -1 ? 0 : columnIndex;
                const end =
                    columnIndex === -1 ? translations.length : columnIndex + 1;

                for (let j = start; j < end; j++) {
                    const translation = translations[j];

                    if (!translation) {
                        continue;
                    }

                    const translationMatch: Match = {
                        text: utils.toLF(translation),
                        type: MatchType.Translation,
                        columnName:
                            this.#projectSettings.translationColumns[j][0],
                        columnNumber: j + 1,
                    };

                    this.#appendSearchMatch(
                        translationMatch,
                        sourceMatch,
                        filename,
                        entryIndex,
                        lineIdx - 1,
                    );
                }
            }
        }
    }

    #reset(): void {
        this.#searchResults.results = {};
        this.#searchResults.pages = 0;
        this.#searchResults.regexp = / /;
        this.#matchObject = [];
    }
}
