import {
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
    LINES_SEPARATOR,
    MAX_FILE_MATCHES,
    NEW_LINE,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
} from "../utilities/constants";
import { createRegExp, escapeHTML, join } from "../utilities/functions";
import { ReplaceMode, SearchFlags, SearchMode } from "./enums";
import { Settings } from "./settings";

export class Searcher {
    #matchesResult = new Map<string, number[]>();
    #matchesObject = new Map<string, string[]>();
    #matchPagesCount = -1;
    #regexp?: RegExp;
    #searchMode?: SearchMode;
    #replaceMode?: ReplaceMode;

    constructor(
        private readonly settings: Settings,
        private readonly searchFlags: SearchFlagsObject,
        private readonly currentTab: CurrentTab,
    ) {}

    private createMatchesContainer(
        elementText: string,
        matches: string[],
    ): string {
        const result: string[] = [];
        let lastIndex = 0;

        for (const match of matches) {
            const start = elementText.indexOf(match, lastIndex);
            const end = start + match.length;

            const matchDiv = `${elementText.slice(lastIndex, start)}<span class="backgroundThird">${match}</span>`;
            result.push(matchDiv);

            lastIndex = end;
        }

        const afterDiv = elementText.slice(lastIndex);
        result.push(afterDiv);

        return result.join("");
    }

    private appendSearchMatch(
        text: string,
        counterpartIsOriginal: boolean,
        filename: string,
        rowNumber: string,
        counterpartText = "",
    ) {
        // Regexp.exec fucks up matches by including capturing groups
        // eslint-disable-next-line sonarjs/prefer-regexp-exec
        const matches = text.match(this.#regexp!);

        if (!matches) {
            return;
        }

        text = escapeHTML(text);

        if (this.#replaceMode === ReplaceMode.Search) {
            if (filename.endsWith(TXT_EXTENSION)) {
                filename = filename.slice(0, -TXT_EXTENSION_LENGTH);
            }

            const matchKey = `${filename}-${counterpartIsOriginal ? "translated" : "original"}-${rowNumber}`;
            const matchValue = [
                this.createMatchesContainer(text, matches),
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

    private async writeMatches(drain = false): Promise<void> {
        if (
            this.#matchesObject.size < MAX_FILE_MATCHES ||
            !drain ||
            this.#matchesObject.size == 0
        ) {
            return;
        }

        this.#matchPagesCount++;

        const filePath = join(
            this.settings.programDataPath,
            `matches-${this.#matchPagesCount}.json`,
        );
        await writeTextFile(
            filePath,
            JSON.stringify(Object.fromEntries(this.#matchesObject)),
        );

        this.#matchesObject.clear();
    }

    private async removeOldMatches() {
        const files = await readDir(this.settings.programDataPath);

        for (const file of files) {
            if (file.name.startsWith("matches-")) {
                await removePath(
                    join(this.settings.programDataPath, file.name),
                );
            }
        }
    }

    private async searchCurrentTab() {
        for (const rowContainer of this.currentTab.content.children) {
            const searchTranslation =
                this.#searchMode !== SearchMode.OnlyOriginal &&
                this.#replaceMode !== ReplaceMode.Put;
            const shouldAppend =
                searchTranslation ||
                (this.#searchMode !== SearchMode.OnlyTranslation &&
                    this.#replaceMode !== ReplaceMode.Replace);

            if (!shouldAppend) {
                continue;
            }

            const text = searchTranslation
                ? (rowContainer.children[2] as HTMLTextAreaElement).value
                : (rowContainer.children[1] as HTMLDivElement).innerHTML;

            const [name, row] = rowContainer.id.split("-");

            this.appendSearchMatch(text, searchTranslation, name, row);
            await this.writeMatches();
        }
    }

    private async searchGlobal() {
        const [mapsEntries, otherEntries] = await Promise.all([
            readDir(join(this.settings.tempMapsPath)),
            readDir(join(this.settings.translationPath)),
        ]);

        mapsEntries.sort(
            (a, b) => Number(a.name.slice(4, -4)) - Number(b.name.slice(4, -4)),
        );

        const entries = [mapsEntries, otherEntries]
            .flat()
            .filter(
                (entry) =>
                    entry.name.endsWith(TXT_EXTENSION) &&
                    !entry.name.startsWith(this.currentTab.name ?? "\0") &&
                    entry.name !== "maps.txt",
            );

        for (const entry of entries) {
            const fileName = entry.name;
            const isTempMap = !Number.isNaN(Number.parseInt(fileName[4]));

            const filePath = join(
                this.settings.programDataPath,
                isTempMap ? TEMP_MAPS_DIRECTORY : TRANSLATION_DIRECTORY,
                fileName,
            );

            const fileContent = await readTextFile(filePath);
            const lines = fileContent.split("\n");

            for (const [lineNumber, line] of lines.entries()) {
                if (!line.trim()) {
                    continue;
                }

                let [original, translation] = line.split(LINES_SEPARATOR);

                if ((translation as string | undefined) === undefined) {
                    console.error(
                        "Couldn't split line at line in file:",
                        lineNumber + 1,
                        fileName,
                    );
                    continue;
                }

                original = original.replaceAll(NEW_LINE, "\n").trim();
                translation = translation.replaceAll(NEW_LINE, "\n").trim();

                const matchOriginal =
                    this.#searchMode !== SearchMode.OnlyTranslation &&
                    this.#replaceMode !== ReplaceMode.Replace;
                const matchTranslation =
                    this.#searchMode !== SearchMode.OnlyOriginal &&
                    this.#replaceMode !== ReplaceMode.Put &&
                    translation;

                if (!matchOriginal && !matchTranslation) {
                    continue;
                }

                this.appendSearchMatch(
                    matchOriginal ? original : translation,
                    matchOriginal,
                    fileName,
                    lineNumber.toString(),
                    matchOriginal ? translation : original,
                );
            }

            await this.writeMatches();
        }
    }

    private reset() {
        this.#matchesResult.clear();
        this.#matchesObject.clear();
        this.#matchPagesCount = 0;
    }

    public async search(
        text: string,
        searchMode: SearchMode,
        replaceMode: ReplaceMode,
    ): Promise<[Map<string, number[]>, number]> {
        const regexp = await createRegExp(text, this.searchFlags);

        if (!regexp) {
            return [new Map<string, number[]>(), 0];
        }

        this.reset();

        this.#searchMode = searchMode;
        this.#replaceMode = replaceMode;
        this.#regexp = regexp;

        await this.removeOldMatches();
        await this.searchCurrentTab();

        if (!(this.searchFlags.flags & SearchFlags.OnlyLocal)) {
            await this.searchGlobal();
        }

        await this.writeMatches(true);
        return [this.#matchesResult, this.#matchPagesCount];
    }
}
