import {
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";
import {
    MAP_COMMENT,
    MAX_FILE_MATCHES,
    SEPARATOR,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
} from "../utilities/constants";
import { createRegExp, join } from "../utilities/functions";
import { SearchAction, SearchFlags, SearchMode } from "./enums";
import { Settings } from "./settings";

export class Searcher {
    #matchesResult = new Map<string, number[]>();
    #matchesObject = new Map<string, string[]>();
    #matchPagesCount = -1;
    #regexp?: RegExp;
    #searchMode?: SearchMode;
    #searchAction?: SearchAction;

    public constructor(
        private readonly settings: Settings,
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
        text: string,
        filename: string,
        rowNumber: string,
        counterpartIsSource: boolean,
        counterpartText = "",
    ) {
        // Regexp.exec fucks up matches by including capturing groups
        // eslint-disable-next-line sonarjs/prefer-regexp-exec
        const matches = text.match(this.#regexp!);

        if (!matches) {
            return;
        }

        if (this.#searchAction === SearchAction.Search) {
            if (filename.endsWith(TXT_EXTENSION)) {
                filename = filename.slice(0, -TXT_EXTENSION_LENGTH);
            }

            const matchKey = `${filename}-${counterpartIsSource ? "translation" : "source"}-${rowNumber}`;
            const matchValue = [
                this.#createMatchesContainer(text, matches),
                counterpartText,
            ];

            this.#matchesObject.set(matchKey, matchValue);
        } else {
            if (!this.#matchesResult.has(filename)) {
                this.#matchesResult.set(filename, []);
            }

            this.#matchesResult.get(filename)!.push(Number(rowNumber));
        }
    }

    async #writeMatches(drain = false): Promise<void> {
        if (this.#matchesObject.size === 0) {
            return;
        }

        if (this.#matchesObject.size < MAX_FILE_MATCHES && !drain) {
            return;
        }

        const entries = Array.from(this.#matchesObject.entries());

        while (entries.length > 0) {
            const chunk = entries.splice(0, MAX_FILE_MATCHES);
            this.#matchPagesCount++;

            const filePath = join(
                this.settings.programDataPath,
                `match${this.#matchPagesCount}.json`,
            );

            await writeTextFile(
                filePath,
                JSON.stringify(Object.fromEntries(chunk)),
            );
        }

        this.#matchesObject.clear();
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
        for (const rowContainer of this.tabInfo.currentTab.content.children) {
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

            const sourceText = (rowContainer.children[1] as HTMLDivElement)
                .innerHTML;
            const translationText = (
                rowContainer.children[2] as HTMLTextAreaElement
            ).value;

            const [name, row] = rowContainer.id.split("-");

            if (searchSource) {
                this.#appendSearchMatch(
                    sourceText,
                    name,
                    row,
                    false,
                    translationText,
                );
            }

            if (searchTranslation) {
                this.#appendSearchMatch(
                    translationText,
                    name,
                    row,
                    true,
                    sourceText,
                );
            }
        }

        await this.#writeMatches(true);
    }

    async #searchGlobal() {
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

        for (const entry of entries) {
            const filename = entry.name;
            const isTempMap = filename.startsWith("map");

            const filePath = join(
                this.settings.programDataPath,
                isTempMap ? TEMP_MAPS_DIRECTORY : TRANSLATION_DIRECTORY,
                filename,
            );

            const fileContent = await readTextFile(filePath);
            const lines = fileContent.lines();

            let skip = false;

            for (const [lineNumber, line] of lines.entries()) {
                if (!line.trim()) {
                    continue;
                }

                let [source, translation] = line.split(SEPARATOR);

                if (
                    source === MAP_COMMENT &&
                    !(`map${translation}` in this.tabInfo.tabs)
                ) {
                    skip = true;
                }

                if (skip) {
                    continue;
                }

                if ((translation as string | undefined) === undefined) {
                    await error(
                        `Couldn't split line in file ${filename} at line ${lineNumber + 1}`,
                    );
                    continue;
                }

                source = source.denormalize().trim();
                translation = translation.denormalize().trim();

                const searchInSource =
                    this.#searchMode !== SearchMode.Translation &&
                    this.#searchAction !== SearchAction.Replace;
                const searchInTranslation =
                    this.#searchMode !== SearchMode.Source &&
                    this.#searchAction !== SearchAction.Put &&
                    !translation.empty();

                if (!searchInSource && !searchInTranslation) {
                    continue;
                }

                if (searchInSource) {
                    this.#appendSearchMatch(
                        source,
                        filename,
                        lineNumber.toString(),
                        false,
                        translation,
                    );
                }

                if (searchInTranslation) {
                    this.#appendSearchMatch(
                        translation,
                        filename,
                        lineNumber.toString(),
                        true,
                        source,
                    );
                }
            }

            await this.#writeMatches();
        }
    }

    #reset() {
        this.#matchesResult.clear();
        this.#matchesObject.clear();
        this.#matchPagesCount = -1;
    }

    public async search(
        text: string,
        searchMode: SearchMode,
        searchAction: SearchAction,
    ): Promise<[Map<string, number[]>, number]> {
        const regexp = await createRegExp(text, this.searchFlags, searchAction);

        if (!regexp) {
            return [new Map<string, number[]>(), 0];
        }

        this.#reset();

        this.#searchMode = searchMode;
        this.#searchAction = searchAction;
        this.#regexp = regexp;

        await this.#removeOldMatches();
        await this.#searchCurrentTab();

        if (!(this.searchFlags.flags & SearchFlags.OnlyCurrentTab)) {
            await this.#searchGlobal();
        }

        await this.#writeMatches(true);
        return [this.#matchesResult, this.#matchPagesCount];
    }
}
