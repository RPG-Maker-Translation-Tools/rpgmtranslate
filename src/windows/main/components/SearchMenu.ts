import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { AppEvent, MouseButton, SearchAction, SearchFlags } from "@lib/enums";

import { t } from "@lingui/core/macro";

import * as utils from "@utils/functions";
import { tw } from "@utils/functions";

export class SearchMenu extends Component {
    declare protected readonly element: HTMLDivElement;

    readonly #searchInput: HTMLTextAreaElement;
    readonly #replaceInput: HTMLTextAreaElement;

    readonly #searchCaseButton: HTMLButtonElement;
    readonly #searchWholeButton: HTMLButtonElement;
    readonly #searchRegexButton: HTMLButtonElement;
    readonly #searchLocationButton: HTMLButtonElement;

    readonly #searchModeSelect: HTMLSelectElement;
    readonly #searchColumnSelect: HTMLSelectElement;

    readonly #searchButton: HTMLButtonElement;
    readonly #replaceButton: HTMLButtonElement;
    readonly #putButton: HTMLButtonElement;

    #startX = 0;
    #startY = 0;

    public constructor() {
        super("search-menu");

        this.#searchInput = this.element.querySelector("#search-input")!;
        this.#replaceInput = this.element.querySelector("#replace-input")!;

        this.#searchCaseButton = this.element.querySelector("#case-button")!;
        this.#searchWholeButton = this.element.querySelector("#whole-button")!;
        this.#searchRegexButton = this.element.querySelector("#regex-button")!;
        this.#searchLocationButton =
            this.element.querySelector("#location-button")!;

        this.#searchButton = this.element.querySelector("#search-button")!;
        this.#replaceButton = this.element.querySelector("#replace-button")!;
        this.#putButton = this.element.querySelector("#button-button")!;

        this.#searchModeSelect = this.element.querySelector(
            "#search-mode-select",
        )!;
        this.#searchColumnSelect = this.element.querySelector(
            "#search-column-select",
        )!;

        this.element.onkeydown = async (e): Promise<void> => {
            await this.#onkeydown(e);
        };

        this.element.onchange = (e): void => {
            this.#onchange(e);
        };

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };

        this.element.onmousedown = (e): void => {
            if (
                (e.target as HTMLElement).tagName === "HEADER" &&
                (e.button as MouseButton) === MouseButton.Left
            ) {
                this.element.style.cursor = "grabbing";

                this.#startX = e.clientX - this.x;
                this.#startY = e.clientY - this.y;

                this.element.onmousemove = (e): void => {
                    this.x = e.clientX - this.#startX;
                    this.y = e.clientY - this.#startY;

                    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

                    this.element.onmouseup = (): void => {
                        this.element.style.cursor = "auto";
                        this.element.onmouseup = null;
                        this.element.onmousemove = null;
                    };
                };
            }
        };

        this.element.oncontextmenu = (e): void => {
            this.#oncontextmenu(e);
        };
    }

    public get searchText(): string {
        return this.#searchInput.value;
    }

    public get replaceText(): string {
        return this.#replaceInput.value;
    }

    public updateColumn(columnIndex: number, columnName: string): void {
        let columnExists = false;

        for (const option of this.#searchColumnSelect
            .children as HTMLCollectionOf<HTMLOptionElement>) {
            if (Number(option.value) === columnIndex) {
                option.textContent = `${columnName} (${columnIndex + 1})`;
                columnExists = true;
            }
        }

        if (!columnExists) {
            const option = document.createElement("option");
            option.value = columnIndex.toString();
            option.textContent = `${columnName} (${columnIndex + 1})`;
            this.#searchColumnSelect.add(option);
        }
    }

    public init(translationColumns: [string, number][]): void {
        this.#searchColumnSelect.innerHTML =
            this.#searchColumnSelect.firstElementChild!.outerHTML;

        for (let i = 0; i < translationColumns.length; i++) {
            const option = document.createElement("option");
            option.value = i.toString();
            option.textContent = `${translationColumns[i][0]} (${i + 1})`;
            this.#searchColumnSelect.add(option);
        }
    }

    public override focus(): void {
        this.#searchInput.focus();
    }

    async #onkeydown(event: KeyboardEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target) {
            case this.#searchInput:
                await this.#handleSearchInputKeypress(event);
                break;
            case this.#replaceInput:
                this.#handleReplaceInputKeypress(event);
                break;
            default:
                break;
        }
    }

    #onchange(event: Event): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target) {
            case this.#searchInput:
            case this.#replaceInput:
                utils.calculateHeight(this.#replaceInput);
                break;
            default:
                break;
        }
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement;

        switch (target) {
            case this.#searchButton: {
                const predicate = this.#searchInput.value;

                if (predicate.trim()) {
                    await emittery.emit(AppEvent.SearchText, [
                        predicate,
                        Number(this.#searchColumnSelect.value),
                        Number(this.#searchModeSelect.value),
                        SearchAction.Search,
                    ]);
                }
                break;
            }
            case this.#replaceButton:
            case this.#putButton: {
                const predicate = this.#searchInput.value;

                if (predicate.trim()) {
                    const replacer = this.#replaceInput.value;

                    await emittery.emit(AppEvent.ReplaceText, [
                        predicate,
                        replacer,
                        Number(this.#searchColumnSelect.value),
                        Number(this.#searchModeSelect.value),
                        target === this.#replaceButton
                            ? SearchAction.Replace
                            : SearchAction.Put,
                    ]);
                }
                break;
            }
            case this.#searchCaseButton:
                this.#toggleCaseSensitive();
                break;
            case this.#searchWholeButton:
                this.#toggleWholeWordSearch();
                break;
            case this.#searchRegexButton:
                this.#toggleRegExpSearch();
                break;
            case this.#searchLocationButton:
                this.#toggleLocalSearch();
                break;
        }
    }

    async #handleSearchInputKeypress(event: KeyboardEvent): Promise<void> {
        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.#searchInput.value += "\n";
                utils.calculateHeight(this.#searchInput);
                return;
            }

            const predicate = this.#searchInput.value;

            if (predicate.trim()) {
                await emittery.emit(AppEvent.SearchText, [
                    predicate,
                    Number(this.#searchModeSelect.value),
                    Number(this.#searchColumnSelect.value),
                    SearchAction.Search,
                ]);
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
            utils.calculateHeight(this.#searchInput);
        });
    }

    #handleReplaceInputKeypress(event: KeyboardEvent): void {
        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                this.#replaceInput.value += "\n";
                utils.calculateHeight(this.#replaceInput);
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                utils.calculateHeight(this.#replaceInput);
            });
        }
    }

    #toggleCaseSensitive(): void {
        this.#searchCaseButton.classList.toggle("bg-third");
        void emittery.emit(
            AppEvent.SearchFlagChanged,
            SearchFlags.CaseSensitive,
        );
    }

    #toggleWholeWordSearch(): void {
        this.#searchWholeButton.classList.toggle("bg-third");
        void emittery.emit(AppEvent.SearchFlagChanged, SearchFlags.WholeWord);
    }

    #toggleRegExpSearch(): void {
        this.#searchRegexButton.classList.toggle("bg-third");
        void emittery.emit(AppEvent.SearchFlagChanged, SearchFlags.RegExp);
    }

    #toggleLocalSearch(): void {
        this.#searchLocationButton.classList.toggle("bg-third");
        void emittery.emit(
            AppEvent.SearchFlagChanged,
            SearchFlags.OnlyCurrentTab,
        );
    }

    #oncontextmenu(e: MouseEvent): void {
        e.preventDefault();

        const target = e.target as HTMLElement;

        if (target.tagName !== "HEADER") {
            return;
        }

        this.contextMenu = document.createElement("div");
        this.contextMenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

        for (const [id, label] of [t`Restore Position`].entries()) {
            const button = document.createElement("button");
            button.className = tw`h-fit w-full p-1`;
            button.innerHTML = label;
            button.id = id.toString();
            this.contextMenu.appendChild(button);
        }

        this.contextMenu.style.top = `${e.y}px`;
        this.contextMenu.style.left = `${e.x}px`;

        this.contextMenu.onclick = (e): void => {
            const target = e.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (target.id === "0") {
                this.move(0, 0);
            }
        };

        document.body.appendChild(this.contextMenu);

        void emittery.emit(AppEvent.ContextMenuChanged, this.contextMenu);
    }
}
