import { ProjectSettings } from "@classes/ProjectSettings";
import { Replacer } from "@classes/Replacer";
import { Searcher } from "@classes/Searcher";
import { Settings } from "@classes/Settings";
import { SearchAction } from "@enums/SearchAction";
import { SearchFlags } from "@enums/SearchFlags";
import { SearchPanel } from "./SearchPanel";

import { t } from "@lingui/core/macro";

import * as utils from "@utils/functions";

export class SearchMenu {
    #searchMenu: HTMLDivElement;
    #searchButton: HTMLButtonElement;

    public searchInput: HTMLTextAreaElement;
    public replaceInput: HTMLTextAreaElement;

    #searchCaseButton: HTMLButtonElement;
    #searchWholeButton: HTMLButtonElement;
    #searchRegexButton: HTMLButtonElement;
    #searchLocationButton: HTMLButtonElement;

    #searchModeSelect: HTMLSelectElement;
    #searchColumnSelect: HTMLSelectElement;

    public searchPanel: SearchPanel;

    public constructor(
        public readonly settings: Settings,
        public readonly projectSettings: ProjectSettings,
        private readonly searcher: Searcher,
        public readonly replacer: Replacer,
        private readonly searchFlags: SearchFlagsObject,
        public readonly replacementLog: ReplacementLog,
        public readonly tabInfo: TabInfo,
    ) {
        this.#searchMenu = document.getElementById(
            "search-menu",
        ) as HTMLDivElement;
        this.#searchButton = document.getElementById(
            "search-button",
        ) as HTMLButtonElement;

        this.searchInput = this.#searchMenu.querySelector("#search-input")!;
        this.replaceInput = this.#searchMenu.querySelector("#replace-input")!;

        this.#searchCaseButton = this.#searchMenu.querySelector(
            "#search-case-button",
        )!;
        this.#searchWholeButton = this.#searchMenu.querySelector(
            "#search-whole-button",
        )!;
        this.#searchRegexButton = this.#searchMenu.querySelector(
            "#search-regex-button",
        )!;
        this.#searchLocationButton = this.#searchMenu.querySelector(
            "#search-location-button",
        )!;

        this.#searchModeSelect = this.#searchMenu.querySelector(
            "#search-mode-select",
        )!;
        this.#searchColumnSelect = this.#searchMenu.querySelector(
            "#search-column-select",
        )!;

        this.searchPanel = new SearchPanel(this);
        this.#fetchColumns();

        this.#searchMenu.addEventListener("change", (event) => {
            this.#handleSearchMenuChange(event);
        });

        this.#searchMenu.addEventListener("keydown", async (event) => {
            await this.#handleSearchMenuKeydown(event);
        });

        this.#searchMenu.addEventListener("click", async (event) => {
            await this.#handleSearchMenuClick(event);
        });

        this.#searchColumnSelect.addEventListener("click", () => {
            this.#fetchColumns();
        });
    }

    #fetchColumns() {
        this.#searchColumnSelect.innerHTML =
            this.#searchColumnSelect.firstElementChild!.outerHTML;

        for (const [i, [column]] of this.projectSettings.columns
            .slice(2)
            .entries()) {
            const option = document.createElement("option");
            option.id = (i + 2).toString();
            option.textContent = column;
            this.#searchColumnSelect.appendChild(option);
        }
    }

    public focus() {
        this.searchInput.focus();
    }

    public show() {
        this.#searchMenu.classList.remove("hidden");
        this.#searchMenu.style.left = `${this.#searchButton.offsetLeft}px`;
        this.#searchMenu.style.top = `${this.#searchButton.offsetTop + this.#searchButton.clientHeight}px`;
    }

    public hide() {
        this.#searchMenu.classList.add("hidden");
    }

    public isHidden(): boolean {
        return this.#searchMenu.classList.contains("hidden");
    }

    async #handleSearchInputKeypress(event: KeyboardEvent) {
        if (!this.settings.project) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.searchInput.value += "\n";
                utils.calculateHeight(this.searchInput);
                return;
            }

            const predicate = this.searchInput.value;

            if (predicate.trim()) {
                await this.#searchText(predicate, SearchAction.Search);
            }
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    this.#toggleCaseSensitive();
                    break;
                case "KeyW":
                    this.#toggleWholeWordSearch();
                    break;
                case "KeyR":
                    this.#toggleRegExpSearch();
                    break;
                case "KeyL":
                    this.#toggleLocalSearch();
                    break;
            }
        }

        requestAnimationFrame(() => {
            utils.calculateHeight(this.searchInput);
        });
    }

    #handleReplaceInputKeypress(event: KeyboardEvent) {
        if (!this.settings.project) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.replaceInput.value += "\n";
                utils.calculateHeight(this.replaceInput);
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                utils.calculateHeight(this.replaceInput);
            });
        }
    }

    async #handleSearchMenuKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;

        switch (target) {
            case this.searchInput:
                await this.#handleSearchInputKeypress(event);
                break;
            case this.replaceInput:
                this.#handleReplaceInputKeypress(event);
                break;
            default:
                break;
        }
    }

    #handleSearchMenuChange(event: Event) {
        const target = event.target as HTMLElement;

        switch (target) {
            case this.searchInput:
            case this.replaceInput:
                utils.calculateHeight(this.replaceInput);
                break;
            default:
                break;
        }
    }

    async #handleSearchMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case "apply-search-button": {
                const predicate = this.searchInput.value;

                if (predicate.trim()) {
                    await this.#searchText(predicate, SearchAction.Search);
                }
                break;
            }
            case "replace-button":
            case "put-button": {
                const predicate = this.searchInput.value;

                if (predicate.trim()) {
                    const replacer = this.replaceInput.value;

                    await this.replacer.replaceAll(
                        predicate,
                        replacer,
                        Number(this.#searchModeSelect.value),
                        target.id === "replace-button"
                            ? SearchAction.Replace
                            : SearchAction.Put,
                    );
                }
                break;
            }
            case "case-button":
                this.#toggleCaseSensitive();
                break;
            case "whole-button":
                this.#toggleWholeWordSearch();
                break;
            case "regex-button":
                this.#toggleRegExpSearch();
                break;
            case "location-button":
                this.#toggleLocalSearch();
                break;
        }
    }

    #toggleCaseSensitive() {
        this.#searchCaseButton.classList.toggle("backgroundThird");
        this.searchFlags.flags ^= SearchFlags.CaseSensitive;
    }

    #toggleWholeWordSearch() {
        this.#searchWholeButton.classList.toggle("backgroundThird");
        this.searchFlags.flags ^= SearchFlags.WholeWord;
    }

    #toggleRegExpSearch() {
        this.#searchRegexButton.classList.toggle("backgroundThird");
        this.searchFlags.flags ^= SearchFlags.RegExp;
    }

    #toggleLocalSearch() {
        this.#searchLocationButton.classList.toggle("backgroundThird");
        this.searchFlags.flags ^= SearchFlags.OnlyCurrentTab;
    }

    async #searchText(predicate: string, searchAction: SearchAction) {
        const results = await this.searcher.search(
            predicate,
            Number(this.#searchModeSelect.value),
            searchAction,
        );

        if (searchAction === SearchAction.Search) {
            this.searchPanel.searchCurrentPage.innerHTML = "0";

            if (results.pages === 0) {
                this.searchPanel.searchTotalPages.innerHTML = "0";
                this.searchPanel.searchPanelContent.innerHTML = t`<div id="no-results" class="content-center h-full">No matches</div>`;
            } else {
                this.searchPanel.searchTotalPages.innerHTML =
                    results.pages.toString();
                void this.searchPanel.loadSearchMatch(1);
            }

            this.searchPanel.show();
        }
    }
}
