import { MainWindowLocalization } from "../utilities/localization";
import { MouseButton, SearchAction, SearchFlags } from "./enums";
import { ProjectSettings } from "./projectsettings";
import { Replacer } from "./replacer";
import { Searcher } from "./searcher";
import { SearchPanel } from "./searchpanel";
import { Settings } from "./settings";

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
        private readonly projectSettings: ProjectSettings,
        private readonly searcher: Searcher,
        public readonly replacer: Replacer,
        private readonly searchFlags: SearchFlagsObject,
        public readonly replacementLog: ReplacementLog,
        public readonly tabInfo: TabInfo,
        public readonly localization: MainWindowLocalization,
    ) {
        this.#searchMenu = document.getElementById(
            "search-menu",
        ) as HTMLDivElement;
        this.#searchButton = document.getElementById(
            "search-button",
        ) as HTMLButtonElement;

        this.searchInput = this.#searchMenu.getElementById("search-input")!;
        this.replaceInput = this.#searchMenu.getElementById("replace-input")!;

        this.#searchCaseButton =
            this.#searchMenu.getElementById("search-case-button")!;
        this.#searchWholeButton = this.#searchMenu.getElementById(
            "search-whole-button",
        )!;
        this.#searchRegexButton = this.#searchMenu.getElementById(
            "search-regex-button",
        )!;
        this.#searchLocationButton = this.#searchMenu.getElementById(
            "search-location-button",
        )!;

        this.#searchModeSelect =
            this.#searchMenu.getElementById("search-mode-select")!;
        this.#searchColumnSelect = this.#searchMenu.getElementById(
            "search-column-select",
        )!;

        this.searchPanel = new SearchPanel(this);

        for (const [i, [column]] of this.projectSettings.columns
            .slice(2)
            .entries()) {
            const option = document.createElement("option");
            option.id = (i + 2).toString();
            option.textContent = column;
            this.#searchColumnSelect.appendChild(option);
        }

        this.#searchMenu.addEventListener("change", (event) => {
            this.#handleSearchMenuChange(event);
        });

        this.#searchMenu.addEventListener("keydown", async (event) => {
            await this.#handleSearchMenuKeydown(event);
        });

        this.#searchMenu.addEventListener("click", async (event) => {
            await this.#handleSearchMenuClick(event);
        });

        this.#searchColumnSelect.addEventListener("click", (event) => {
            const button = event.button as MouseButton;

            if (button === MouseButton.Left)
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
        });
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
        if (!this.settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.searchInput.value += "\n";
                this.searchInput.calculateHeight();
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
            this.searchInput.calculateHeight();
        });
    }

    #handleReplaceInputKeypress(event: KeyboardEvent) {
        if (!this.settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.replaceInput.value += "\n";
                this.replaceInput.calculateHeight();
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                this.replaceInput.calculateHeight();
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
                this.replaceInput.calculateHeight();
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
                this.searchPanel.searchPanelContent.innerHTML = `<div id="no-results" class="content-center h-full">${this.localization.noMatches}</div>`;
            } else {
                this.searchPanel.searchTotalPages.innerHTML =
                    results.pages.toString();
                void this.searchPanel.loadSearchMatch(1);
            }

            this.searchPanel.show();
        }
    }
}
