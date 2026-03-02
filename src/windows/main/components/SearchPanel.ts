import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent, MouseButton, SearchAction } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";
import { isErr, readTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { error } from "@tauri-apps/plugin-log";

export class SearchPanel extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #searchPanelContent: HTMLDivElement;

    readonly #searchCurrentPage: HTMLSpanElement;
    readonly #searchTotalPages: HTMLSpanElement;

    readonly #previousPageButton: HTMLButtonElement;
    readonly #nextPageButton: HTMLButtonElement;

    #projectSettings!: ProjectSettings;

    public constructor() {
        super("search-panel");

        this.#searchPanelContent = this.element.querySelector(
            "#search-panel-content",
        )!;
        this.#searchCurrentPage = this.element.querySelector(
            "#search-current-page",
        )!;
        this.#searchTotalPages = this.element.querySelector(
            "#search-total-pages",
        )!;
        this.#previousPageButton = this.element.querySelector(
            "#previous-page-button",
        )!;
        this.#nextPageButton = this.element.querySelector("#next-page-button")!;

        this.setDraggable(true);

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

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
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
            await this.#handleSearchMatchClick(e);
        }
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target) {
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
