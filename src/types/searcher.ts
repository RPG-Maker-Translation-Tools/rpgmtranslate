import {
    MAP_ID_COMMENT,
    MAX_FILE_MATCHES,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
} from "../utilities/constants";
import { createRegExp, getFileComment, join } from "../utilities/functions";
import { MatchType, SearchAction, SearchFlags, SearchMode } from "./enums";
import { ProjectSettings } from "./projectsettings";
import { Settings } from "./settings";

import {
    DirEntry,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

interface Match {
    text: string;
    type: MatchType;
    column: [string, number];
}

export class Searcher {
    #searchResults: SearchResults = {
        results: {},
        pages: 0,
        regexp: / /,
    };
    #matchObject = new Map<string, string[]>();
    #searchMode?: SearchMode;
    #searchAction?: SearchAction;

    public constructor(
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
        private readonly searchFlags: SearchFlagsObject,
        private readonly tabInfo: TabInfo,
    ) {}

    #createMatchesContainer(elementText: string, matches: string[]): string {
        const result: string[] = [];
        let lastIndex = 0;

        for (const match of matches) {
            const beforeMatchIndex = elementText.indexOf(match, lastIndex);
            const beforeMatch = elementText.slice(lastIndex, beforeMatchIndex);

            const matchElement = `${beforeMatch}<span class="backgroundThird">${match}</span>`;
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
    ) {
        // Regexp.exec fucks up matches by including capturing groups
        // eslint-disable-next-line sonarjs/prefer-regexp-exec
        const matches = match.text.match(this.#searchResults.regexp);

        if (!matches) {
            return;
        }

        if (this.#searchAction === SearchAction.Search) {
            if (filename.endsWith(TXT_EXTENSION)) {
                filename = filename.slice(0, -TXT_EXTENSION_LENGTH);
            }

            const matchKey = `${filename}-${entry}-${match.type}-${match.column[0]} (${match.column[1]})-${rowNumber}`;
            const matchValue = [
                this.#createMatchesContainer(match.text, matches),
                matchCounterpart.text,
            ];

            this.#matchObject.set(matchKey, matchValue);
        } else {
            const resultEntry = `${filename}-${entry}-${match.column[1]}`;

            if (filename in this.#searchResults.results) {
                this.#searchResults.results[resultEntry].push(
                    Number(rowNumber),
                );
            } else {
                this.#searchResults.results[resultEntry] = [];
            }
        }
    }

    async #writeMatches(drain = false): Promise<void> {
        if (this.#matchObject.size === 0) {
            return;
        }

        if (this.#matchObject.size < MAX_FILE_MATCHES && !drain) {
            return;
        }

        const entries = Array.from(this.#matchObject.entries());
        const chunks: [string, string[]][][] = [];

        let i = 0;

        while (i < entries.length) {
            const count = Math.min(entries.length - i, MAX_FILE_MATCHES);
            chunks.push(entries.slice(i, i + count));
            i += count;
        }

        for (const chunk of chunks) {
            this.#searchResults.pages++;

            const filePath = join(
                this.settings.programDataPath,
                `match${this.#searchResults.pages}.json`,
            );

            await writeTextFile(
                filePath,
                JSON.stringify(Object.fromEntries(chunk)),
            );
        }

        this.#matchObject.clear();
    }

    async #removeOldMatches() {
        const files = await readDir(this.settings.programDataPath);

        for (const file of files) {
            if (file.name.startsWith("match")) {
                await removePath(
                    join(this.settings.programDataPath, file.name),
                );
            }
        }
    }

    async #searchCurrentTab() {
        let entry!: string;
        let fileComment: string;

        if (this.tabInfo.currentTab.name.startsWith("map")) {
            fileComment = MAP_ID_COMMENT;
        } else if (this.tabInfo.currentTab.name.startsWith("system")) {
            fileComment = "<!-- System Entry -->";
        } else if (this.tabInfo.currentTab.name.startsWith("scripts")) {
            fileComment = "<!-- Script ID -->";
        } else if (this.tabInfo.currentTab.name.startsWith("plugins")) {
            fileComment = "<!-- Plugin ID -->";
        } else {
            fileComment = "<!-- Event ID -->";
        }

        for (const rowContainer of this.tabInfo.currentTab.content
            .children as HTMLCollectionOf<HTMLDivElement>) {
            const searchSource =
                this.#searchMode !== SearchMode.Translation &&
                this.#searchAction !== SearchAction.Replace;
            const searchTranslation =
                this.#searchMode !== SearchMode.Source &&
                this.#searchAction !== SearchAction.Put;
            const search = searchSource || searchTranslation;

            if (!search) {
                continue;
            }

            const name = this.tabInfo.currentTab.name;
            const rowNumber = rowContainer.rowNumber();

            const source = rowContainer.source();
            const translation = rowContainer.translation();

            if (source === fileComment) {
                entry = translation;
            }

            const sourceColumnIndex = 1;
            const sourceColumnName =
                this.projectSettings.columns[sourceColumnIndex][0];

            const sourceMatch: Match = {
                text: source,
                type: MatchType.Source,
                column: [sourceColumnName, sourceColumnIndex],
            };

            if (searchSource) {
                const translationMatch: Match = {
                    text: translation,
                    type: MatchType.Translation,
                    column: ["", 1],
                };

                this.#appendSearchMatch(
                    sourceMatch,
                    translationMatch,
                    name,
                    entry,
                    rowNumber,
                );
            }

            if (searchTranslation) {
                for (const [i, translation] of rowContainer
                    .translations()
                    .entries()) {
                    if (translation.isEmpty()) {
                        continue;
                    }

                    const columnIndex = i + 2;
                    const columnName =
                        this.projectSettings.columns[columnIndex][0];

                    const translationMatch: Match = {
                        text: translation,
                        type: MatchType.Translation,
                        column: [columnName, columnIndex],
                    };

                    this.#appendSearchMatch(
                        translationMatch,
                        sourceMatch,
                        name,
                        entry,
                        rowNumber,
                    );
                }
            }
        }

        await this.#writeMatches(true);
    }

    async #getFiles(): Promise<DirEntry[]> {
        const [mapEntries, otherEntries] = await Promise.all([
            readDir(join(this.settings.tempMapsPath)),
            readDir(join(this.settings.translationPath)),
        ]);

        mapEntries.sort(
            (a, b) => Number(a.name.slice(3, -4)) - Number(b.name.slice(3, -4)),
        );

        const entries = [mapEntries, otherEntries]
            .flat()
            .filter(
                (entry) =>
                    entry.name.endsWith(TXT_EXTENSION) &&
                    entry.name.slice(0, -TXT_EXTENSION_LENGTH) !==
                        this.tabInfo.currentTab.name &&
                    entry.name !== "maps.txt",
            );

        return entries;
    }

    async #searchGlobal() {
        const entries = await this.#getFiles();

        for (const entry of entries) {
            const filename = entry.name;
            const isMap = filename.startsWith("map");

            const filePath = join(
                this.settings.programDataPath,
                isMap ? TEMP_MAPS_DIRECTORY : TRANSLATION_DIRECTORY,
                filename,
            );

            const fileContent = await readTextFile(filePath);
            const lines = fileContent.lines();

            const fileComment = getFileComment(filename);
            let fileEntry!: string;

            for (const [row, line] of lines.entries()) {
                if (line.isEmpty()) {
                    continue;
                }

                const split = line.parts();

                if (!split) {
                    await error(
                        `Couldn't split line in file ${filename} at line ${row + 1}`,
                    );
                    continue;
                }

                const searchInSource =
                    this.#searchMode !== SearchMode.Translation &&
                    this.#searchAction !== SearchAction.Replace;

                const searchInTranslation =
                    this.#searchMode !== SearchMode.Source &&
                    this.#searchAction !== SearchAction.Put;

                if (!searchInSource && !searchInTranslation) {
                    continue;
                }

                const source = split.source().clbtodlb();
                const translation = split.translation().clbtodlb();

                const sourceColumnIndex = 1;
                const sourceColumnName =
                    this.projectSettings.columns[sourceColumnIndex][0];

                const sourceMatch: Match = {
                    text: source,
                    type: MatchType.Source,
                    column: [sourceColumnName, sourceColumnIndex],
                };

                if (searchInSource) {
                    const translationMatch: Match = {
                        text: translation,
                        type: MatchType.Translation,
                        column: ["", 1],
                    };

                    this.#appendSearchMatch(
                        sourceMatch,
                        translationMatch,
                        filename,
                        fileEntry,
                        row,
                    );
                }

                if (source === fileComment) {
                    fileEntry = translation;

                    if (
                        source === MAP_ID_COMMENT &&
                        !(`map${translation}` in this.tabInfo.tabs)
                    ) {
                        break;
                    }
                }

                if (searchInTranslation) {
                    for (const [i, translation] of split
                        .translations()
                        .entries()) {
                        if (translation.isEmpty()) {
                            continue;
                        }

                        const columnIndex = i + 2;
                        const columnName =
                            this.projectSettings.columns[columnIndex][0];

                        const translationMatch: Match = {
                            text: translation.clbtodlb(),
                            type: MatchType.Translation,
                            column: [columnName, columnIndex],
                        };

                        this.#appendSearchMatch(
                            translationMatch,
                            sourceMatch,
                            filename,
                            fileEntry,
                            row,
                        );
                    }
                }
            }

            await this.#writeMatches();
        }
    }

    #reset() {
        this.#searchResults.results = {};
        this.#searchResults.pages = 0;
        this.#searchResults.regexp = / /;
        this.#matchObject.clear();
    }

    public async search(
        text: string,
        searchMode: SearchMode,
        searchAction: SearchAction,
    ): Promise<SearchResults> {
        this.#reset();

        const regexp = await createRegExp(text, this.searchFlags, searchAction);

        if (!regexp) {
            return this.#searchResults;
        }

        this.#searchMode = searchMode;
        this.#searchAction = searchAction;
        this.#searchResults.regexp = regexp;

        await this.#removeOldMatches();
        await this.#searchCurrentTab();

        if (!(this.searchFlags.flags & SearchFlags.OnlyCurrentTab)) {
            await this.#searchGlobal();
        }

        await this.#writeMatches(true);
        return this.#searchResults;
    }
}
