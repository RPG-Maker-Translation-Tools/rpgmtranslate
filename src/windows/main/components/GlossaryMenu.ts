import { Component } from "./Component";
import { FileSelectMenu } from "./FileSelectMenu";

import { emittery } from "@lib/classes/emittery";

import { AppEvent, ElementToShow, MatchMode } from "@lib/enums";

import { DEFAULT_FUZZY_THRESHOLD } from "@utils/constants";
import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

export class GlossaryMenu extends Component {
    #glossary!: Glossary;

    readonly #fileSelectMenu: FileSelectMenu;

    #filesToCheckButton: HTMLButtonElement;
    #searchInput: HTMLInputElement;
    #tableBody: HTMLTableSectionElement;

    public constructor(fileSelectMenu: FileSelectMenu) {
        super("glossary-menu");

        this.#fileSelectMenu = fileSelectMenu;

        this.#filesToCheckButton = this.element.querySelector(
            "#files-to-check-button",
        )!;
        this.#searchInput = this.element.querySelector("#search-input")!;
        this.#tableBody = this.element.querySelector("#table-body")!;

        this.setDraggable(true);

        this.element.onchange = (e): void => {
            this.#onchange(e);
        };

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    public get terms(): Term[] {
        return this.#glossary;
    }

    public override show(x?: number, y?: number): void {
        super.show(x, y);
        this.#fileSelectMenu.selectAll();
    }

    public init(glossary: Glossary): void {
        this.#glossary = glossary;

        for (const child of this.#tableBody.children) {
            if (child == this.#tableBody.lastElementChild) {
                break;
            }

            child.remove();
        }

        for (const term of this.#glossary) {
            const row = this.#createRow(term);
            this.#tableBody.insertBefore(row, this.#tableBody.lastElementChild);
        }
    }

    public addTerm(term: Term, editable = false): void {
        const row = this.#createRow(term, editable);
        this.#tableBody.insertBefore(row, this.#tableBody.lastElementChild);
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
            fuzzyThresholdInput.type = "number";
            fuzzyThresholdInput.min = "0.0";
            fuzzyThresholdInput.max = "1.0";
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

    #onchange(event: Event): void {
        const target = event.target as
            | HTMLSelectElement
            | HTMLInputElement
            | null;

        if (!target) {
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
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id === "files-to-check-button") {
            if (this.#fileSelectMenu.hidden) {
                const rect = this.#filesToCheckButton.getBoundingClientRect();
                this.#fileSelectMenu.show(rect.x + rect.width, rect.y);
            } else {
                this.#fileSelectMenu.hide();
            }
        } else if (target.id === "match-menu-button") {
            void emittery.emit(AppEvent.ShowElement, [
                ElementToShow.MatchMenu,
                true,
            ]);
        } else if (target.id === "search-button") {
            const predicate = this.#searchInput.value;

            for (const row of this.#tableBody.children) {
                const sourceInput =
                    row.firstElementChild!.querySelector("input")!;

                if (predicate === sourceInput.value) {
                    sourceInput.classList.add("outline-primary", "outline-2");
                    sourceInput.scrollIntoView({
                        block: "center",
                        inline: "center",
                    });
                }
            }
        } else if (target.id === "qc-button") {
            const selected = this.#fileSelectMenu.selected;

            if (!selected) {
                return;
            }

            void emittery.emit(AppEvent.TermCheck, [-1, [selected, undefined]]);
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

            this.addTerm(newTerm, true);
            return;
        }

        const row = target.closest("tr");
        if (!row) {
            return;
        }

        const id = Number(row.id);

        switch (target.id) {
            case "check-button": {
                const selected = this.#fileSelectMenu.selected;

                if (!selected) {
                    return;
                }

                void emittery.emit(AppEvent.TermCheck, [
                    id,
                    [selected, undefined],
                ]);
                void emittery.emit(AppEvent.ShowElement, [
                    ElementToShow.MatchMenu,
                    false,
                ]);
                break;
            }
            case "edit-button": {
                const inputs = row.querySelectorAll<
                    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                >("input, select, textarea");

                const isEditing = !inputs[0].disabled;

                if (isEditing) {
                    const rowChildren = row.children;

                    const termInput = rowChildren[0].querySelector("input")!;
                    const translationInput =
                        rowChildren[1].querySelector("input")!;

                    const term = termInput.value.trim();
                    const translation = translationInput.value.trim();

                    let hasError = false;

                    termInput.classList.remove("outline-red-600", "outline-2");
                    translationInput.classList.remove(
                        "outline-red-600",
                        "outline-2",
                    );

                    if (!term) {
                        termInput.classList.add("outline-red-600", "outline-2");
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

                    const sourceMode = Number(
                        rowChildren[0].querySelector("select")!.value,
                    );
                    const sourceThreshold =
                        rowChildren[0].querySelector<HTMLInputElement>(
                            'input[type="number"]',
                        )!.valueAsNumber;

                    const sourceCheckboxes =
                        rowChildren[0].querySelectorAll<HTMLInputElement>(
                            'input[type="checkbox"]',
                        );
                    const sourceCS = sourceCheckboxes[0].checked;
                    const sourcePermissive = sourceCheckboxes[1].checked;

                    const translationMode = Number(
                        rowChildren[1].querySelector("select")!.value,
                    );
                    const translationThreshold =
                        rowChildren[1].querySelector<HTMLInputElement>(
                            'input[type="number"]',
                        )!.valueAsNumber;

                    const translationCheckboxes =
                        rowChildren[1].querySelectorAll<HTMLInputElement>(
                            'input[type="checkbox"]',
                        );
                    const translationCS = translationCheckboxes[0].checked;
                    const translationPermissive =
                        translationCheckboxes[1].checked;

                    const note =
                        rowChildren[2].querySelector("textarea")!.value;

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
    }
}
