import { Component } from "./Component";

import { emittery } from "@lib/classes/emittery";

import { AppEvent, ElementToShow, MatchMode, MouseButton } from "@lib/enums";

import { DEFAULT_FUZZY_THRESHOLD } from "@utils/constants";
import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

export class GlossaryMenu extends Component {
    #glossary!: Glossary;

    #searchOnlyCurrentFile = false;
    #searchInput: HTMLInputElement;
    #tableBody: HTMLTableSectionElement;

    #startX = 0;
    #startY = 0;

    public constructor() {
        super("glossary-menu");

        this.#searchInput = this.element.querySelector("#search-input")!;
        this.#tableBody = this.element.querySelector("#table-body")!;

        this.element.onchange = (e): void => {
            const target = e.target as
                | HTMLSelectElement
                | HTMLInputElement
                | null;

            if (!target) {
                return;
            }

            if (target.id === "check-only-current") {
                this.#searchOnlyCurrentFile = (
                    target as HTMLInputElement
                ).checked;
                return;
            }

            if (target.tagName !== "SELECT") {
                return;
            }

            const mode = Number(target.value) as MatchMode;

            target.nextElementSibling!.classList.toggle(
                "hidden",
                mode === MatchMode.Exact,
            );
        };

        this.element.onclick = (e): void => {
            const target = e.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (target.id === "match-menu-button") {
                void emittery.emit(AppEvent.ShowElement, [
                    ElementToShow.MatchMenu,
                    true,
                ]);
            }

            if (target.id === "search-button") {
                const predicate = this.#searchInput.value;

                for (const row of this.#tableBody.children) {
                    const sourceCell = row.firstElementChild!;
                    const sourceInput =
                        sourceCell.firstElementChild! as HTMLInputElement;

                    if (predicate === sourceInput.value) {
                        sourceInput.classList.add(
                            "outline-primary",
                            "outline-2",
                        );
                        sourceInput.scrollIntoView({
                            block: "center",
                            inline: "center",
                        });
                    }
                }
            } else if (target.id === "qc-button") {
                void emittery.emit(AppEvent.TermCheck, [
                    -1,
                    [this.#searchOnlyCurrentFile, undefined],
                ]);
                void emittery.emit(AppEvent.ShowElement, [
                    ElementToShow.MatchMenu,
                    false,
                ]);
                return;
            }

            if (target.textContent === "+") {
                const newTerm: Term = {
                    source: "",
                    sourceMatchMode: [
                        [MatchMode.Exact, DEFAULT_FUZZY_THRESHOLD],
                        true,
                        false,
                    ],
                    translation: "",
                    translationMatchMode: [
                        [MatchMode.Exact, DEFAULT_FUZZY_THRESHOLD],
                        true,
                        false,
                    ],
                    note: "",
                };

                const row = this.#createRow(newTerm, true);

                this.#glossary.push(newTerm);

                this.#tableBody.insertBefore(
                    row,
                    this.#tableBody.lastElementChild,
                );
                return;
            }

            const row = target.closest("tr");
            if (!row) {
                return;
            }

            const id = Number(row.id);

            switch (target.id) {
                case "check-button": {
                    void emittery.emit(AppEvent.TermCheck, [
                        id,
                        [this.#searchOnlyCurrentFile, undefined],
                    ]);
                    void emittery.emit(AppEvent.ShowElement, [
                        ElementToShow.MatchMenu,
                        false,
                    ]);
                    break;
                }
                case "edit-button": {
                    const inputs = row.querySelectorAll<
                        | HTMLInputElement
                        | HTMLSelectElement
                        | HTMLTextAreaElement
                    >("input, select, textarea");

                    const isEditing = !inputs[0].disabled;

                    if (isEditing) {
                        const rowChildren = row.children;

                        const termInput = rowChildren[0]
                            .firstElementChild! as HTMLInputElement;
                        const translationInput = rowChildren[1]
                            .firstElementChild! as HTMLInputElement;

                        const term = termInput.value.trim();
                        const translation = translationInput.value.trim();

                        let hasError = false;

                        termInput.classList.remove(
                            "outline-red-600",
                            "outline-2",
                        );
                        translationInput.classList.remove(
                            "outline-red-600",
                            "outline-2",
                        );

                        if (!term) {
                            termInput.classList.add(
                                "outline-red-600",
                                "outline-2",
                            );
                            hasError = true;
                        }

                        if (!translation) {
                            translationInput.classList.add(
                                "outline-red-600",
                                "outline-2",
                            );
                            hasError = true;
                        }

                        if (hasError) {
                            return;
                        }

                        const termMatchMode = rowChildren[0].lastElementChild!
                            .children as HTMLCollectionOf<HTMLInputElement>;

                        const sourceMode = Number(termMatchMode[0].value);
                        const sourceThreshold = termMatchMode[1].valueAsNumber;
                        const sourceCS = (
                            termMatchMode[2]
                                .firstElementChild! as HTMLInputElement
                        ).checked;
                        const sourcePermissive = (
                            termMatchMode[3]
                                .firstElementChild! as HTMLInputElement
                        ).checked;

                        const translationMatchMode = rowChildren[1]
                            .lastElementChild!
                            .children as HTMLCollectionOf<HTMLInputElement>;

                        const translationMode = Number(
                            translationMatchMode[0].value,
                        );
                        const translationThreshold =
                            translationMatchMode[1].valueAsNumber;
                        const translationCS = (
                            translationMatchMode[2]
                                .firstElementChild! as HTMLInputElement
                        ).checked;
                        const translationPermissive = (
                            translationMatchMode[3]
                                .firstElementChild! as HTMLInputElement
                        ).checked;

                        const note = (
                            rowChildren[2]
                                .firstElementChild! as HTMLInputElement
                        ).value;

                        this.#glossary[id] = {
                            source: term,
                            sourceMatchMode: [
                                [
                                    sourceMode,
                                    Number.isNaN(sourceThreshold)
                                        ? DEFAULT_FUZZY_THRESHOLD
                                        : sourceThreshold,
                                ],
                                sourceCS,
                                sourcePermissive,
                            ],
                            translation,
                            translationMatchMode: [
                                [
                                    translationMode,
                                    Number.isNaN(translationThreshold)
                                        ? DEFAULT_FUZZY_THRESHOLD
                                        : translationThreshold,
                                ],
                                translationCS,
                                translationPermissive,
                            ],
                            note,
                        };
                    }

                    for (const input of inputs) {
                        input.disabled = isEditing;
                    }

                    target.textContent = isEditing ? "edit" : "check";
                    break;
                }
                case "remove-button":
                    this.#glossary.splice(id, 1);
                    row.remove();

                    for (const row of Array.prototype.slice.call(
                        this.#tableBody.children,
                        id,
                    ) as HTMLElement[]) {
                        row.id = (Number(row.id) - 1).toString();
                    }
                    break;
            }
        };

        this.element.onmousedown = (e): void => {
            if (
                (e.target as HTMLElement).tagName === "THEAD" &&
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

    public get terms(): Term[] {
        return this.#glossary;
    }

    public init(glossary: Glossary): void {
        this.#glossary = glossary;

        for (const term of this.#glossary) {
            const row = this.#createRow(term);
            this.#tableBody.appendChild(row);
        }

        const addButton = document.createElement("tr");
        addButton.innerHTML =
            '<td class="text-center"><button class="bg-second w-8 rounded-sm text-xl">+</button></td>';
        this.#tableBody.appendChild(addButton);
    }

    public addTerm(term: Term): void {
        const row = this.#createRow(term);
        this.#tableBody.appendChild(row);
        this.#glossary.push(term);
    }

    #createRow(term: Term, editable = false): HTMLTableRowElement {
        const row = document.createElement("tr");
        row.id = (this.#tableBody.childElementCount - 1).toString();

        const createTextCell = (
            value: string,
            data: MatchModeData,
        ): HTMLTableCellElement => {
            const cell = document.createElement("td");
            const container = document.createElement("div");
            container.className = tw`flex flex-col gap-2`;

            const input = document.createElement("input");
            input.className = tw`w-full rounded-sm`;
            input.type = "text";
            input.value = value;
            input.disabled = !editable;

            const matchModeContainer = document.createElement("div");
            matchModeContainer.className = tw`flex flex-row gap-2`;

            const matchModeSelect = document.createElement("select");
            matchModeSelect.innerHTML = `
                <option value="0">${t`Exact`}</option>
                <option value="1">${t`Fuzzy`}</option>
                <option value="2">${t`Both`}</option>
            `;
            matchModeSelect.disabled = !editable;

            const fuzzyThresholdInput = document.createElement("input");
            fuzzyThresholdInput.type = "text";
            fuzzyThresholdInput.disabled = !editable;

            const permissiveContainer = document.createElement("label");
            permissiveContainer.className = tw`custom-checkbox inline`;

            const permissiveCheckbox = document.createElement("input");
            permissiveCheckbox.type = "checkbox";
            permissiveCheckbox.disabled = !editable;

            const permissiveLabel = document.createElement("span");
            permissiveLabel.setAttribute("data-i18n", "Permissive");
            permissiveLabel.innerHTML = t`Permissive`;

            permissiveContainer.append(permissiveCheckbox, permissiveLabel);

            const csContainer = document.createElement("label");
            csContainer.className = tw`custom-checkbox inline`;

            const csCheckbox = document.createElement("input");
            csCheckbox.type = "checkbox";
            csCheckbox.disabled = !editable;

            const csLabel = document.createElement("span");
            csLabel.setAttribute("data-i18n", "Case Sensitive");
            csLabel.innerHTML = t`Case Sensitive`;

            csContainer.append(csCheckbox, csLabel);

            const [[mode, threshold], caseSensitive, permissive] = data;

            matchModeSelect.value = mode.toString();
            fuzzyThresholdInput.value = threshold.toString();
            csCheckbox.checked = caseSensitive;
            permissiveCheckbox.checked = permissive;

            if (mode === MatchMode.Exact) {
                fuzzyThresholdInput.classList.add("hidden");
            }

            matchModeContainer.append(
                matchModeSelect,
                fuzzyThresholdInput,
                csContainer,
                permissiveContainer,
            );

            container.append(input, matchModeContainer);
            cell.appendChild(container);
            return cell;
        };

        const createNoteCell = (value: string): HTMLTableCellElement => {
            const cell = document.createElement("td");

            const textarea = document.createElement("textarea");
            textarea.className = tw`w-full rounded-sm`;
            textarea.value = value;
            textarea.disabled = !editable;

            cell.appendChild(textarea);
            return cell;
        };

        const checkCell = document.createElement("td");
        checkCell.className = tw`text-center`;
        checkCell.innerHTML =
            '<button class="font-material p-1" id="check-button">search</button>';

        const editCell = document.createElement("td");
        editCell.className = tw`text-center`;
        editCell.innerHTML = `
            <button class="font-material p-1" id="edit-button">
                ${editable ? "check" : "edit"}
            </button>
        `;

        const removeCell = document.createElement("td");
        removeCell.className = tw`text-center`;
        removeCell.innerHTML =
            '<button class="font-material p-1" id="remove-button">close</button>';

        row.append(
            createTextCell(term.source, term.sourceMatchMode),
            createTextCell(term.translation, term.translationMatchMode),
            createNoteCell(term.note),
            checkCell,
            editCell,
            removeCell,
        );

        return row;
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
