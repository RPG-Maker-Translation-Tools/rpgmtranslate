import { Component } from "./Component";

import { TranslationTable } from "./";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent, MouseButton, SearchAction } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";
import { isErr, readTextFile, writeTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { error } from "@tauri-apps/plugin-log";

export class SearchPanel extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #searchPanelContent: HTMLDivElement;

    readonly #searchCurrentPage: HTMLSpanElement;
    readonly #searchTotalPages: HTMLSpanElement;

    readonly #logFileSelect: HTMLSelectElement;
    readonly #switchPanelButton: HTMLButtonElement;
    readonly #pageSelectContainer: HTMLDivElement;
    readonly #previousPageButton: HTMLButtonElement;
    readonly #nextPageButton: HTMLButtonElement;

    #tabInfo!: TabInfo;
    #translationTable!: TranslationTable;
    #projectSettings!: ProjectSettings;
    #replacementLog!: ReplacementLog;

    public constructor() {
        super("search-panel");

        this.#searchPanelContent = this.element.querySelector(
            "#search-panel-content",
        )!;
        this.#switchPanelButton = this.element.querySelector(
            "#switch-panel-button",
        )!;
        this.#logFileSelect = this.element.querySelector("#log-file-select")!;
        this.#searchCurrentPage = this.element.querySelector(
            "#search-current-page",
        )!;
        this.#pageSelectContainer = this.element.querySelector(
            "#page-select-container",
        )!;
        this.#searchTotalPages = this.element.querySelector(
            "#search-total-pages",
        )!;
        this.#previousPageButton = this.element.querySelector(
            "#previous-page-button",
        )!;
        this.#nextPageButton = this.element.querySelector("#next-page-button")!;

        this.setDraggable(true);

        this.element.onchange = (e): void => {
            this.#onchange(e);
        };

        this.element.onmousedown = async (e): Promise<void> => {
            await this.#onmousedown(e);
        };

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    public updateResults(pages: number): void {
        if (pages === 0) {
            this.#searchCurrentPage.textContent = " - ";
            this.#searchTotalPages.textContent = " - ";
            this.#searchPanelContent.innerHTML = t`<div id="no-results" class="content-center h-full">No matches</div>`;
        } else {
            this.#searchCurrentPage.textContent = "1";
            this.#searchTotalPages.textContent = pages.toString();
            void this.loadSearchMatch(1);
        }
    }

    public init(
        tabInfo: TabInfo,
        translationTable: TranslationTable,
        projectSettings: ProjectSettings,
        replacementLog: ReplacementLog,
    ): void {
        this.#tabInfo = tabInfo;
        this.#translationTable = translationTable;
        this.#projectSettings = projectSettings;
        this.#replacementLog = replacementLog;

        this.#logFileSelect.innerHTML =
            this.#logFileSelect.firstElementChild!.outerHTML;

        for (const filename in this.#replacementLog) {
            const option = document.createElement("option");
            option.innerHTML = filename;
            option.value = filename;
            this.#logFileSelect.add(option);
        }
    }

    public addLog(filename: string): void {
        const option = document.createElement("option");
        option.innerHTML = filename;
        option.value = filename;
        this.#logFileSelect.add(option);
    }

    public removeLog(filename: string): void {
        for (const option of this.#logFileSelect.children) {
            if (option.innerHTML === filename) {
                option.remove();
            }
        }
    }

    public async loadSearchMatch(matchIndex: number): Promise<void> {
        const matchObject = await this.#loadMatchObject(matchIndex);

        for (const [
            [matchInfo, match],
            [counterpartInfo, counterpartMatch],
        ] of matchObject) {
            const matchContainer = document.createElement("div");
            matchContainer.className = tw`text-second border-primary my-1 cursor-pointer border-2 p-1`;

            const matchDiv = document.createElement("div");
            matchDiv.innerHTML = this.#escapeHtmlExceptSpans(match);
            matchDiv.className = tw`whitespace-pre-wrap`;
            matchContainer.appendChild(matchDiv);

            const matchInfoDiv = document.createElement("div");
            matchInfoDiv.className = tw`text-third text-xs`;
            matchInfoDiv.innerHTML = matchInfo;
            matchContainer.appendChild(matchInfoDiv);

            const arrowDiv = document.createElement("div");
            arrowDiv.className = tw`font-material content-center text-xl`;
            arrowDiv.innerHTML = "arrow_downward";
            matchContainer.appendChild(arrowDiv);

            const counterpartDiv = document.createElement("div");
            counterpartDiv.textContent = counterpartMatch;
            counterpartDiv.className = tw`whitespace-pre-wrap`;
            matchContainer.appendChild(counterpartDiv);

            const counterpartInfoDiv = document.createElement("div");
            counterpartInfoDiv.className = tw`text-third text-xs`;
            counterpartInfoDiv.innerHTML = counterpartInfo;
            matchContainer.appendChild(counterpartInfoDiv);

            this.#searchPanelContent.appendChild(matchContainer);
        }
    }

    async #handleSearchMatchClick(event: MouseEvent): Promise<void> {
        let searchAction: SearchAction;

        switch (event.button as MouseButton) {
            case MouseButton.Left:
                searchAction = SearchAction.Search;
                break;
            case MouseButton.Center:
                searchAction = SearchAction.Put;
                break;
            case MouseButton.Right:
                searchAction = SearchAction.Replace;
                break;
            default:
                return;
        }

        const target = (event.target as HTMLElement).closest<HTMLDivElement>(
            ".cursor-pointer",
        );

        if (!target) {
            return;
        }

        const matchInfo = target.children[1].innerHTML;
        const [filename, entry, type, columnString, row] =
            matchInfo.split(" - ");
        const columnIndex = Number(columnString[columnString.length - 2]) - 1;
        const isTranslation = type.startsWith("t");
        const rowIndex = Number(row) - 1;

        if (searchAction === SearchAction.Search) {
            if (event.ctrlKey) {
                await writeText(target.firstElementChild!.textContent);
            } else {
                await emittery.emit(AppEvent.ChangeTab, filename);
                await emittery.emit(AppEvent.ScrollIntoRow, rowIndex);
            }
        } else {
            if (searchAction === SearchAction.Replace && !isTranslation) {
                alert(t`Source text cannot be replaced.`);
                return;
            }

            await emittery.emit(AppEvent.ReplaceSingle, [
                target,
                filename,
                entry,
                columnIndex,
                rowIndex,
                searchAction,
            ]);
        }
    }

    #findRequiredRow(
        filename: string,
        entry: string,
        logSource: string,
    ): number {
        let rowIndex = -1;
        let found = false;

        for (let i = 0; i < this.#translationTable.childCount - 1; i++) {
            const row = this.#translationTable.rows[i];
            const source = utils.source(row);
            const translation = utils.translation(row)[0];

            if (source === consts.ID_COMMENT && translation === entry) {
                if (found) {
                    break;
                }

                found = true;
            } else if (found && source === logSource) {
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            alert(
                t`Can't found row with ${logSource} source text in file ${filename} and entry ${entry}.`,
            );
        }

        return rowIndex;
    }

    #findExternalRequiredRow(
        filename: string,
        entry: string,
        logSource: string,
        translationLines: string[],
    ): number {
        let rowIndex = -1;
        let found = false;

        for (let i = 0; i < translationLines.length; i++) {
            const line = translationLines[i];
            const parts = utils.parts(line);

            if (!parts) {
                utils.logSplitError(filename, i + 1);
                continue;
            }

            const source = utils.source(parts);
            const translation = utils.translation(parts)[0];

            if (source === consts.ID_COMMENT && translation === entry) {
                if (found) {
                    break;
                }

                found = true;
            } else if (found && utils.compareLB(source, logSource)) {
                rowIndex = i;
                break;
            }
        }

        return rowIndex;
    }

    async #handleLogRecordClick(event: MouseEvent): Promise<void> {
        const target = (event.target as HTMLElement).closest<HTMLDivElement>(
            ".cursor-pointer",
        )!;

        if (target.hasAttribute("reverted")) {
            return;
        }

        const button = event.button as MouseButton;

        const logSource = target.firstElementChild!.textContent;
        const logOld = target.children[1].textContent;

        const [filename, entry, columnString] =
            target.lastElementChild!.innerHTML.split(" - ");
        const columnIndex = Number(columnString[columnString.length - 2]) - 1;

        if (button === MouseButton.Left) {
            await emittery.emit(AppEvent.ChangeTab, filename);
            const rowIndex = this.#findRequiredRow(filename, entry, logSource);

            if (rowIndex === -1) {
                return;
            }

            await emittery.emit(AppEvent.ScrollIntoRow, rowIndex);
        } else if (button === MouseButton.Right) {
            if (this.#tabInfo.tabName === filename) {
                const rowIndex = this.#findRequiredRow(
                    filename,
                    entry,
                    logSource,
                );

                if (rowIndex === -1) {
                    return;
                }

                const row = this.#translationTable.rows[rowIndex];
                const textarea =
                    row.children[columnIndex + 2].querySelector("textarea")!;
                textarea.value = logOld;
            } else {
                const filePath = utils.join(
                    filename.startsWith("map")
                        ? this.#projectSettings.tempMapsPath
                        : this.#projectSettings.translationPath,
                    `${filename}${consts.TXT_EXTENSION}`,
                );

                const fileContent = await readTextFile(filePath);

                if (isErr(fileContent)) {
                    void error(fileContent[0]!);
                    return;
                }

                const translationLines = utils.lines(fileContent[1]!);

                const rowIndex = this.#findExternalRequiredRow(
                    filename,
                    entry,
                    logSource,
                    translationLines,
                );

                if (rowIndex === -1) {
                    return;
                }

                const line = translationLines[rowIndex];
                const parts = utils.parts(line)!;
                parts[columnIndex + 1] = utils.toCustomLB(logOld);
                translationLines[rowIndex] = utils.joinParts(parts);

                const result = await writeTextFile(
                    filePath,
                    translationLines.join("\n"),
                );

                if (isErr(result)) {
                    void error(result[0]!);
                }
            }

            await emittery.emit(AppEvent.LogEntryReverted, [filename, logOld]);
            target.innerHTML = t`Text was reverted to the previous state`;
            target.setAttribute("reverted", "");
        }
    }

    async #loadMatchObject(matchIndex: number): Promise<SearchMatchArray> {
        this.#searchCurrentPage.textContent = matchIndex.toString();
        this.#searchPanelContent.innerHTML = "";

        const matchFile = utils.join(
            this.#projectSettings.matchesPath,
            `match${matchIndex}${consts.JSON_EXTENSION}`,
        );

        const matchContent = await readTextFile(matchFile);

        if (isErr(matchContent)) {
            void error(matchContent[0]!);
            return [];
        }

        return JSON.parse(matchContent[1]!) as SearchMatchArray;
    }

    async #onmousedown(e: MouseEvent): Promise<void> {
        const target = e.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (this.#searchPanelContent.contains(target)) {
            if (this.#switchPanelButton.innerHTML === "menu_book") {
                await this.#handleLogRecordClick(e);
            } else {
                await this.#handleSearchMatchClick(e);
            }
        }
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target) {
            case this.#switchPanelButton: {
                this.#searchPanelContent.innerHTML = "";
                utils.toggleMultiple(
                    this.#pageSelectContainer,
                    "hidden",
                    "flex",
                );
                this.#logFileSelect.classList.toggle("hidden");

                if (target.innerHTML.trim() === "search") {
                    target.innerHTML = "menu_book";
                } else {
                    target.innerHTML = "search";
                }
                break;
            }
            case this.#previousPageButton: {
                const page = Number(this.#searchCurrentPage.textContent);

                if (page > 1) {
                    void this.loadSearchMatch(page - 1);
                }
                break;
            }
            case this.#nextPageButton: {
                const page = Number(this.#searchCurrentPage.textContent);

                if (page < Number(this.#searchTotalPages.textContent)) {
                    void this.loadSearchMatch(page + 1);
                }
                break;
            }
        }
    }

    #onchange(event: Event): void {
        if (event.target !== this.#logFileSelect) {
            return;
        }

        const filename = this.#logFileSelect.value;

        for (const source in this.#replacementLog[filename]) {
            const [entry, columnIndex, old, new_] =
                this.#replacementLog[filename][source];

            const entryContainer = document.createElement("div");
            entryContainer.className = tw`text-second border-primary bg-second my-1 cursor-pointer border-2 p-1`;

            entryContainer.append("Source:");

            const sourceDiv = document.createElement("div");
            sourceDiv.textContent = source;
            sourceDiv.className = tw`whitespace-pre-wrap`;
            entryContainer.appendChild(sourceDiv);

            entryContainer.append("Old:");

            const oldDiv = document.createElement("div");
            oldDiv.textContent = old;
            oldDiv.className = tw`whitespace-pre-wrap`;
            entryContainer.appendChild(oldDiv);

            entryContainer.append("New:");

            const newDiv = document.createElement("div");
            newDiv.textContent = new_;
            newDiv.className = tw`whitespace-pre-wrap`;
            entryContainer.appendChild(newDiv);

            const entryInfo = document.createElement("div");
            entryInfo.className = tw`text-third text-xs`;
            entryInfo.innerHTML = `${filename} - ${entry} - ${this.#projectSettings.columnName(columnIndex)} (${columnIndex + 1})`;
            entryContainer.appendChild(entryInfo);

            this.#searchPanelContent.appendChild(entryContainer);
        }
    }

    #escapeHtmlExceptSpans(input: string): string {
        let result = "";
        let i = 0;
        let inSpan = false;

        while (i < input.length) {
            if (!inSpan && input.startsWith("<span", i)) {
                const end = input.indexOf(">", i);
                inSpan = true;
                result += input.slice(i, end + 1);
                i = end + 1;
                continue;
            }

            if (inSpan && input.startsWith("</span>", i)) {
                inSpan = false;
                result += "</span>";
                i += "</span>".length;
                continue;
            }

            const char = input[i];

            if (inSpan) {
                result += char;
            } else {
                switch (char) {
                    case "&":
                        result += "&amp;";
                        break;
                    case "<":
                        result += "&lt;";
                        break;
                    case ">":
                        result += "&gt;";
                        break;
                    case '"':
                        result += "&quot;";
                        break;
                    case "'":
                        result += "&#39;";
                        break;
                    default:
                        result += char;
                }
            }

            i++;
        }

        return result;
    }
}
