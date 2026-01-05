import { ProjectSettings } from "@lib/classes";
import { MatchType, SearchAction, SearchFlags, SearchMode } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import {
    isErr,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@utils/invokes";

import { t } from "@lingui/core/macro";

import XRegExp from "xregexp";

import { message } from "@tauri-apps/plugin-dialog";
import { error } from "@tauri-apps/plugin-log";

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
    #matchObject: MatchObject = [];
    #searchMode?: SearchMode;
    #searchAction?: SearchAction;

    #projectSettings!: ProjectSettings;

    public toggleFlag(flag: SearchFlags): void {
        this.#searchFlags ^= flag;
    }

    public addSearchFlag(flag: SearchFlags): void {
        this.#searchFlags |= flag;
    }

    public removeSearchFlag(flag: SearchFlags): void {
        this.#searchFlags &= ~flag;
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
    }

    public async search(
        tabName: string | null,
        tabs: Tabs,
        rows: Rows | null,
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

        if (tabName !== null) {
            await this.#searchCurrentTab(tabName, columnIndex, rows!);
        }

        if (!(this.#searchFlags & SearchFlags.OnlyCurrentTab)) {
            await this.#searchGlobal(tabName, columnIndex, tabs);
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
            if (filename.endsWith(consts.TXT_EXTENSION)) {
                filename = filename.slice(0, -consts.TXT_EXTENSION_LENGTH);
            }

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
        const chunks: MatchObject[] = [];

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
        });
    }

    #searchRows(
        filename: string,
        rows: string[] | Rows,
        columnIndex: number,
        tabs?: Tabs,
    ): void {
        const isArray = Array.isArray(rows);

        const searchSource =
            this.#searchMode !== SearchMode.Translation &&
            this.#searchAction !== SearchAction.Replace;
        const searchTranslation =
            this.#searchMode !== SearchMode.Source &&
            this.#searchAction !== SearchAction.Put;

        let entryIndex!: string;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let parts!: string[];

            if (isArray) {
                const _parts = utils.parts(row as string);

                if (!_parts) {
                    utils.logSplitError(filename, i + 1);
                    continue;
                }

                parts = _parts;
            }

            const source = utils.source(
                isArray ? parts : (row as RowContainer),
            );

            if (source === consts.ID_COMMENT) {
                entryIndex = utils.translations(
                    isArray ? parts : (row as RowContainer),
                )[0];

                if (
                    tabs &&
                    filename.startsWith("map") &&
                    !(`map${entryIndex}` in tabs)
                ) {
                    break;
                }
            }

            const sourceMatch: Match = {
                text: isArray ? utils.clbtodlb(source) : source,
                type: MatchType.Source,
                columnName: t`Source`,
                columnNumber: 0,
            };

            if (searchSource) {
                let translation: string;
                let column = columnIndex;

                if (columnIndex === -1) {
                    [translation, column] = utils.translation(
                        isArray ? parts : (row as RowContainer),
                    );
                } else {
                    const translations = utils.translations(
                        isArray ? parts : (row as RowContainer),
                    );

                    translation = translations[columnIndex];
                }

                const translationMatch: Match = {
                    text: isArray ? utils.clbtodlb(translation) : translation,
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
                    i + 1,
                );
            }

            if (searchTranslation) {
                const translations = utils.translations(
                    isArray ? parts : (row as RowContainer),
                );

                const start = columnIndex === -1 ? 0 : columnIndex;
                const end =
                    columnIndex === -1 ? translations.length : columnIndex + 1;

                for (let j = start; j < end; j++) {
                    const translation = translations[j];

                    if (!translation) {
                        continue;
                    }

                    const translationMatch: Match = {
                        text: isArray
                            ? utils.clbtodlb(translation)
                            : translation,
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
                        i + 1,
                    );
                }
            }
        }
    }

    async #searchCurrentTab(
        tabName: string,
        columnIndex: number,
        rows: Rows,
    ): Promise<void> {
        this.#searchRows(tabName, rows, columnIndex);
        await this.#writeMatches(true);
    }

    async #searchGlobal(
        tabName: string | null,
        columnIndex: number,
        tabs: Tabs,
    ): Promise<void> {
        const mapsEntries = await readDir(this.#projectSettings.tempMapsPath);

        if (isErr(mapsEntries)) {
            void error(mapsEntries[0]!);
            return;
        }

        const maps = mapsEntries[1]!.sort(
            (a, b) => Number(a.name.slice(3, -4)) - Number(b.name.slice(3, -4)),
        );

        const other = await readDir(this.#projectSettings.translationPath);

        if (isErr(other)) {
            void error(other[0]!);
            return;
        }

        for (let f = 0; f < maps.length + other.length - 1; f++) {
            const name = (
                f >= maps.length ? other[1]![f - maps.length] : maps[f]
            ).name;

            if (
                !name.endsWith(consts.TXT_EXTENSION) ||
                name.slice(0, -consts.TXT_EXTENSION_LENGTH) === tabName ||
                name === "maps.txt"
            ) {
                continue;
            }

            const filePath = utils.join(
                name.startsWith("map")
                    ? this.#projectSettings.tempMapsPath
                    : this.#projectSettings.translationPath,
                name,
            );

            const content = await readTextFile(filePath);

            if (isErr(content)) {
                void error(content[0]!);
                continue;
            }

            const lines = utils.lines(content[1]!);
            this.#searchRows(name, lines, columnIndex, tabs);

            await this.#writeMatches();
        }
    }

    #reset(): void {
        this.#searchResults.results = {};
        this.#searchResults.pages = 0;
        this.#searchResults.regexp = / /;
        this.#matchObject = [];
    }
}
