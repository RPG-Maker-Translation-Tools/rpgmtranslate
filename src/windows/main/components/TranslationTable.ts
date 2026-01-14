import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings, Settings } from "@lib/classes";
import {
    AppEvent,
    JumpDirection,
    MouseButton,
    RowDeleteMode,
    TextAreaStatus,
} from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";

import { isErr, readTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

const enum ResizeDirection {
    Left,
    Right,
}

const EDGE_THRESHOLD = 8;
const RESIZE_TOOLTIP_PADDING = 12;

export class TranslationTable extends Component {
    declare protected readonly element: HTMLTableElement;

    readonly #thead: HTMLTableSectionElement;
    readonly #headRow: HTMLTableRowElement;
    readonly #tbody: HTMLTableSectionElement;

    #textareaStatus = TextAreaStatus.None;
    #currentFocusedElement: readonly [HTMLTextAreaElement, string] | [] = [];
    #multipleTextAreasSelected = false;
    #activeGhostLines: HTMLDivElement[] = [];

    #lastInputChars = "";
    #lastInputSubChar: { char: string; pos: number } | null = null;

    readonly #selectedTextareas = new Map<HTMLTextAreaElement, string>();
    readonly #replacedTextareas = new Map<HTMLTextAreaElement, string>();

    #displayGhostLines = false;
    #rowDeleteMode = RowDeleteMode.Disabled;

    #hintDiv: HTMLDivElement | null = null;

    #resized = false;
    #resizing = false;
    #resizeDirection = ResizeDirection.Left;
    #dragStartX = 0;

    #resizedColumns: readonly [
        resizedColumn: [
            resizedColumn: HTMLTableCellElement,
            resizedIndex: number,
            resizedInitialWidth: number,
            resizedPreviewWidth: number,
        ],
        adjacentColumn: [
            adjacentColumn: HTMLTableCellElement,
            adjacentIndex: number,
            adjacentInitialWidth: number,
            adjacentPreviewWidth: number,
        ],
    ] = [
        [null as unknown as HTMLTableCellElement, 0, 0, 0],
        [null as unknown as HTMLTableCellElement, 0, 0, 0],
    ];

    #resizeTooltip: HTMLDivElement | null = null;
    #widthInput: HTMLInputElement | null = null;

    #projectSettings!: ProjectSettings;

    public constructor() {
        super("translation-table");

        this.#thead = this.element.querySelector("thead")!;
        this.#headRow = this.#thead.firstElementChild as HTMLTableRowElement;
        this.#tbody = this.element.querySelector("tbody")!;

        this.#tbody.onmousedown = (event): void => {
            if (event.shiftKey && event.buttons === 1) {
                event.preventDefault();
            }
        };

        this.#tbody.addEventListener("focusin", (e) => {
            this.#onfocusin(e);
        });

        this.#tbody.addEventListener("focusout", (e) => {
            this.#onfocusout(e);
        });

        this.#tbody.onkeyup = (e): void => {
            this.#onkeyup(e);
        };

        this.#tbody.oninput = (e): void => {
            this.#oninput(e);
        };

        this.#tbody.oncut = (e): void => {
            this.#oncut(e);
        };

        this.#tbody.onpaste = (e): void => {
            this.#onpaste(e);
        };

        this.#tbody.oncopy = (e): void => {
            this.#oncopy(e);
        };

        this.#tbody.onclick = async (e): Promise<void> => {
            await this.#onBodyClick(e);
        };

        this.#tbody.onkeydown = async (e): Promise<void> => {
            await this.#onBodyKeydown(e);
        };

        this.#thead.onclick = (e): void => {
            if ((e.target as HTMLElement).textContent === "+") {
                this.addTranslationColumn();
            }
        };

        this.#thead.onmousemove = (e): void => {
            this.#onHeaderMousemove(e);
        };

        this.#thead.onmousedown = (e): void => {
            this.#onHeaderMousedown(e);
        };

        this.#thead.onmouseup = (): void => {
            this.#onHeaderMouseup();
        };

        this.#thead.oncontextmenu = (e): void => {
            this.#onHeaderContextmenu(e);
        };

        document.addEventListener("focusout", (e) => {
            this.#onHeaderFocusout(e);
        });
    }

    public get lastRow(): TabRow {
        return this.#tbody.lastElementChild as TabRow;
    }

    public get firstRow(): TabRow {
        return this.#tbody.firstElementChild as TabRow;
    }

    public get rows(): HTMLCollectionOf<TabRow> {
        return this.#tbody.children as HTMLCollectionOf<TabRow>;
    }

    public get rowCount(): number {
        return this.rows.length;
    }

    public override set innerHTML(html: string) {
        this.#tbody.innerHTML = html;
    }

    public init(settings: Settings, projectSettings: ProjectSettings): void {
        this.#displayGhostLines = settings.appearance.displayGhostLines;
        this.#rowDeleteMode = settings.core.rowDeleteMode;
        this.#projectSettings = projectSettings;

        this.#initHeader();
    }

    public row(index: number): TabRow {
        return this.rows[index];
    }

    public clearTextAreaHistory(): void {
        this.#selectedTextareas.clear();
        this.#replacedTextareas.clear();
    }

    public async fill(
        filename: string,
        translationColumnCount: number,
    ): Promise<void> {
        const formatted = `${filename}${consts.TXT_EXTENSION}`;
        let contentPath = utils.join(
            this.#projectSettings.translationPath,
            formatted,
        );

        if (filename.startsWith("plugins") && !(await exists(contentPath))) {
            if (
                await exists(
                    utils.join(
                        this.#projectSettings.translationPath,
                        "scripts.txt",
                    ),
                )
            ) {
                contentPath = utils.join(
                    this.#projectSettings.translationPath,
                    formatted,
                );
            }
        } else if (filename.startsWith("map")) {
            contentPath = utils.join(
                this.#projectSettings.tempMapsPath,
                formatted,
            );
        }

        const content = await readTextFile(contentPath);

        if (isErr(content)) {
            void error(content[0]!);
            return;
        }

        const contentLines = utils.lines(content[1]!);

        if (filename === "system") {
            contentLines.pop();
        }

        let maxColumns = 0;

        for (const line of contentLines) {
            const columnCount = utils.count(line, consts.SEPARATOR);
            maxColumns = Math.max(maxColumns, columnCount);
        }

        for (let rowIndex = 0; rowIndex < contentLines.length; rowIndex++) {
            const line = contentLines[rowIndex];

            if (!line) {
                continue;
            }

            const parts = utils.parts(line);

            if (!parts) {
                utils.logSplitError(filename, rowIndex + 1);
                continue;
            }

            const source = utils.source(parts);
            const translations = utils.translations(parts);

            while (maxColumns > translationColumnCount) {
                await emittery.emit(AppEvent.AdditionalColumnRequired);
                translationColumnCount++;
            }

            while (translations.length < translationColumnCount) {
                translations.push("");
            }

            const row = this.#createRow(source, translations, rowIndex);
            this.#tbody.appendChild(row);
        }
    }

    public addTextAreaCell(row: TabRow, translation: string): void {
        const translationCell = document.createElement("td");
        translationCell.className = tw`border-primary border-2 -outline-offset-2 focus-within:outline-2`;
        translation = utils.toLF(translation);

        const textarea = document.createElement("textarea");
        textarea.rows = utils.countLines(translation);
        textarea.className = tw`w-full resize-none overflow-y-hidden align-top`;
        textarea.style.backgroundColor = "var(--bg-primary)";
        textarea.autocomplete = "off";
        textarea.autocapitalize = "off";
        textarea.autofocus = false;
        textarea.value = translation;
        textarea.style.padding = "0";

        translationCell.appendChild(textarea);
        row.appendChild(translationCell);
    }

    public addTranslationColumn(): void {
        void emittery.emit(AppEvent.ColumnAdded);

        const columnElement = document.createElement("th");
        columnElement.className = tw`border-primary border-2 p-1`;
        columnElement.id = (this.#headRow.children.length - 1).toString();
        columnElement.style.width = `${consts.DEFAULT_COLUMN_WIDTH}px`;

        const columnInput = document.createElement("input");
        columnInput.type = "text";
        columnInput.className = tw`w-full p-0`;
        columnInput.style.backgroundColor = "var(--bg-primary)";
        columnInput.spellcheck = false;
        columnInput.autocomplete = "off";
        columnInput.autocapitalize = "off";
        columnInput.autofocus = false;
        columnInput.value = t`Translation`;

        columnElement.appendChild(columnInput);
        this.#headRow.insertBefore(
            columnElement,
            this.#headRow.lastElementChild,
        );
    }

    #getLineLengthHintX(textarea: HTMLTextAreaElement): number {
        const { fontSize, fontFamily } = window.getComputedStyle(textarea);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize} ${fontFamily}`;

        const width = context.measureText(
            "a".repeat(this.#projectSettings.lineLengthHint),
        ).width;

        const rect = textarea.getBoundingClientRect();

        if (width > textarea.clientWidth) {
            return rect.left + window.scrollX + textarea.clientWidth;
        }

        return rect.left + window.scrollX + width;
    }

    #getNewLinePositions(
        textarea: HTMLTextAreaElement,
    ): { left: number; top: number }[] {
        const positions: { left: number; top: number }[] = [];
        const lines = utils.lines(textarea.value);

        const { lineHeight, fontSize, fontFamily } =
            window.getComputedStyle(textarea);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize} ${fontFamily}`;

        let top = textarea.offsetTop;

        for (let l = 0; l < lines.length - 1; l++) {
            const line = lines[l];
            const textWidth = context.measureText(`${line} `).width;
            const left = textarea.offsetLeft + textWidth;

            positions.push({ left, top });
            top += Number.parseFloat(lineHeight);
        }

        return positions;
    }

    #updateRowIds(startIndex: number): void {
        const rows = this.rows;

        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            const newRowNumber = (i + 1).toString();
            utils.rowNumberElement(row).textContent = newRowNumber;
        }
    }

    #createRow(
        source: string,
        translations: string[],
        rowIndex: number,
    ): TabRow {
        const row = document.createElement("tr") as TabRow;
        row.className = tw`border-primary border-2`;

        const rowIDCell = document.createElement("td");
        rowIDCell.className = tw`border-primary border-2`;

        const rowIDContainer = document.createElement("div");
        rowIDContainer.className = tw`flex flex-row`;

        const rowNumberSpan = document.createElement("span");
        rowNumberSpan.textContent = (rowIndex + 1).toString();

        const rowNumberButtonDiv = document.createElement("div");
        rowNumberButtonDiv.className = tw`text-third flex w-full items-start justify-end gap-0.5 p-0.5 text-lg`;

        const bookmarkButton = document.createElement("button");
        bookmarkButton.className = tw`border-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        bookmarkButton.textContent = "bookmark";

        const deleteButton = document.createElement("button");
        deleteButton.className = tw`border-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        deleteButton.textContent = "close";

        rowNumberButtonDiv.append(deleteButton, bookmarkButton);
        rowIDContainer.append(rowNumberSpan, rowNumberButtonDiv);
        rowIDCell.appendChild(rowIDContainer);
        row.appendChild(rowIDCell);

        const sourceTextCell = document.createElement("td");
        sourceTextCell.tabIndex = 0;
        sourceTextCell.className = tw`border-primary border-2 whitespace-pre-wrap select-text`;
        sourceTextCell.textContent = utils.toLF(source);
        row.appendChild(sourceTextCell);

        for (const translation of translations) {
            this.addTextAreaCell(row, translation);
        }

        return row;
    }

    #jumpToRow(
        focusedTextArea: HTMLTextAreaElement,
        direction: JumpDirection,
    ): void {
        const row = focusedTextArea.closest("tr") as TabRow;
        const rowNumber = utils.rowNumber(row);

        if (
            (rowNumber === 1 && direction === JumpDirection.Up) ||
            (rowNumber === this.rowCount && direction === JumpDirection.Down)
        ) {
            return;
        }

        const columnIndex = Array.prototype.indexOf.call(
            row.children,
            focusedTextArea.closest("td"),
        );

        const step = direction === JumpDirection.Down ? 1 : -1;
        const rowIndex = rowNumber - 1 + step;

        const childrenCount = this.rowCount;
        if (childrenCount - 1 < rowIndex || rowIndex < 0) {
            return;
        }

        const nextRow = this.rows[rowIndex];
        const nextTextArea =
            nextRow.children[columnIndex].querySelector("textarea")!;

        focusedTextArea.blur();
        nextTextArea.scrollIntoView({ block: "center", inline: "center" });
        nextTextArea.focus();
        nextTextArea.setSelectionRange(0, 0);
    }

    async #onCloseClick(target: HTMLElement): Promise<void> {
        switch (this.#rowDeleteMode) {
            case RowDeleteMode.Disabled:
                alert(t`Deleting is disabled in settings.`);
                return;
            case RowDeleteMode.Confirmation: {
                const confirm = await ask(
                    t`Do you really want to delete this row? This action is irreversible!`,
                );

                if (!confirm) {
                    return;
                }
            }
            // eslint-disable-next-line no-fallthrough
            case RowDeleteMode.Allowed: {
                const row = target.closest("tr") as TabRow;
                const rowNumber = utils.rowNumber(row);
                const rowIndex = rowNumber - 1;
                const source = utils.source(row);

                if (source === consts.BOOKMARK_COMMENT) {
                    await emittery.emit(AppEvent.RemoveBookmark, rowNumber);
                }

                row.remove();
                this.#updateRowIds(rowIndex);

                void emittery.emit(AppEvent.UpdateSourceLineCount, [
                    -1,
                    undefined,
                ]);

                const translation = utils.translation(row)[0];

                if (translation) {
                    void emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                        -1,
                        undefined,
                    ]);
                }
                break;
            }
        }
    }

    #onBookmarkClick(target: HTMLElement): void {
        const row = target.closest("tr") as TabRow;
        const rowNumber = utils.rowNumber(row);

        const bookmarkDescInput = document.createElement("input");
        bookmarkDescInput.type = "text";
        bookmarkDescInput.className = tw`text-second fixed z-50 h-8 w-auto p-1 text-base`;
        bookmarkDescInput.style.left = `${target.offsetLeft + target.clientWidth}px`;
        bookmarkDescInput.style.top = `${target.offsetTop}px`;
        document.body.appendChild(bookmarkDescInput);

        requestAnimationFrame(() => {
            bookmarkDescInput.focus();
        });

        bookmarkDescInput.onkeydown = (event): void => {
            if (event.code === "Enter") {
                const description = bookmarkDescInput.value;
                bookmarkDescInput.remove();

                const bookmarkRow = this.#createRow(
                    consts.BOOKMARK_COMMENT,
                    [description],
                    rowNumber,
                );

                this.#tbody.insertBefore(bookmarkRow, target.closest("tr"));

                this.#updateRowIds(rowNumber - 1);

                void emittery.emit(AppEvent.AddBookmark, [
                    undefined,
                    description,
                    rowNumber,
                ]);
            } else if (event.code === "Escape") {
                bookmarkDescInput.remove();
            }
        };
    }

    #trackLength(textarea: HTMLTextAreaElement): void {
        if (this.#hintDiv) {
            for (const line of textarea.value.split("\n")) {
                this.#hintDiv.style.backgroundColor =
                    line.length > this.#projectSettings.lineLengthHint
                        ? "red"
                        : "lime";
            }
        }
    }

    #trackFocus(textarea: HTMLTextAreaElement): void {
        for (const ghost of this.#activeGhostLines) {
            ghost.remove();
        }

        const result = this.#getNewLinePositions(textarea);

        for (const { left, top } of result) {
            const ghostNewLineDiv = document.createElement("div");
            ghostNewLineDiv.className = tw`text-third pointer-events-none fixed z-50 cursor-default select-none`;
            ghostNewLineDiv.style.left = `${left}px`;
            ghostNewLineDiv.style.top = `${top}px`;
            ghostNewLineDiv.textContent = "\\n";

            this.#activeGhostLines.push(ghostNewLineDiv);
            document.body.appendChild(ghostNewLineDiv);
        }
    }

    #onfocusin(event: FocusEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName !== "TEXTAREA") {
            return;
        }

        const cell = target.closest("td")!;

        void emittery.emit(AppEvent.TermCheck, [
            -1,
            [undefined, utils.rowNumber(cell.closest("tr") as TabRow) - 1],
        ]);

        let sourceCell = cell.previousElementSibling!;

        while (sourceCell.childElementCount !== 0) {
            sourceCell = sourceCell.previousElementSibling!;
        }

        void emittery.emit(AppEvent.ShowTranslations, sourceCell.textContent);

        if (this.#projectSettings.lineLengthHint !== 0) {
            const hintX = this.#getLineLengthHintX(target);

            this.#hintDiv = document.createElement("div");
            this.#hintDiv.className = tw`absolute z-50`;
            this.#hintDiv.style.backgroundColor = "lime";
            this.#hintDiv.style.width = "2px";
            this.#hintDiv.style.height = `${target.clientHeight}px`;
            this.#hintDiv.style.left = `${hintX}px`;
            this.#hintDiv.style.top = `${target.offsetTop}px`;

            document.body.appendChild(this.#hintDiv);
        }

        this.#currentFocusedElement = [target, target.value];

        this.#textareaStatus = target.value
            ? TextAreaStatus.Translated
            : TextAreaStatus.Untranslated;
    }

    #onfocusout(event: FocusEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName !== "TEXTAREA") {
            return;
        }

        const cell = target.closest("td")!;

        for (const ghost of this.#activeGhostLines) {
            ghost.remove();
        }

        if (
            this.#currentFocusedElement[0]?.value !==
            this.#currentFocusedElement[1]
        ) {
            void emittery.emit(AppEvent.UpdateSaved, false);
        }

        let source = cell.previousElementSibling!;

        while (source.tagName !== "TD") {
            source = source.previousElementSibling!;
        }

        let changedCount = 0;

        if (!source.textContent.startsWith(consts.COMMENT_PREFIX)) {
            switch (this.#textareaStatus) {
                case TextAreaStatus.None:
                    break;
                case TextAreaStatus.Translated:
                    if (!target.value) {
                        changedCount--;
                    }
                    break;
                case TextAreaStatus.Untranslated:
                    if (target.value) {
                        changedCount++;
                    }
                    break;
            }
        }

        this.#textareaStatus = TextAreaStatus.None;
        void emittery.emit(AppEvent.UpdateTranslatedLineCount, [
            changedCount,
            undefined,
        ]);

        this.#hintDiv?.remove();
        this.#hintDiv = null;
    }

    #onkeyup(event: KeyboardEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName === "TEXTAREA") {
            utils.calculateHeight(target);
        }
    }

    #oninput(event: Event): void {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName === "TEXTAREA") {
            if (this.#displayGhostLines) {
                this.#trackFocus(target);
            }

            if (this.#projectSettings.lineLengthHint) {
                this.#trackLength(target);
            }
        }
    }

    #oncut(event: ClipboardEvent): void {
        if (
            this.#multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();

            event.clipboardData!.setData(
                "text",
                this.#selectedTextareas
                    .values()
                    .toArray()
                    .join(consts.CLIPBOARD_SEPARATOR),
            );

            let changedCount = 0;

            for (const textarea of this.#selectedTextareas.keys()) {
                if (textarea.value) {
                    changedCount -= 1;
                    textarea.value = "";
                }
            }

            this.#textareaStatus = TextAreaStatus.None;

            void emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                changedCount,
                undefined,
            ]);
            void emittery.emit(AppEvent.UpdateSaved, false);
        }
    }

    #onpaste(event: ClipboardEvent): void {
        const normalized = event.clipboardData!.getData("text");
        const target = document.activeElement as HTMLTextAreaElement | null;
        if (target?.tagName !== "TEXTAREA") {
            return;
        }

        const startRow = target.closest("tr") as TabRow;

        if (normalized.includes(consts.CLIPBOARD_SEPARATOR)) {
            event.preventDefault();
            const clipboardTextSplit = normalized.split(
                consts.CLIPBOARD_SEPARATOR,
            );
            const textRows = clipboardTextSplit.length;
            const startIndex = utils.rowNumber(startRow);

            if (textRows === 0) {
                return;
            }

            const columnIndex = Array.prototype.indexOf.call(
                startRow.children,
                target.closest("td"),
            );

            let changedCount = 0;

            for (let i = 0; i < textRows; i++) {
                const rowIndex = startIndex + i - 1;

                if (rowIndex >= this.rows.length) {
                    return;
                }

                const row = this.rows[rowIndex];
                const cell = row.children[columnIndex];
                const textarea = cell.querySelector("textarea")!;

                if (!textarea.value && clipboardTextSplit[i]) {
                    changedCount++;
                }

                this.#replacedTextareas.set(
                    textarea,
                    textarea.value.replaceAll(normalized, ""),
                );
                textarea.value = clipboardTextSplit[i];
                utils.calculateHeight(textarea);
            }

            this.#textareaStatus = TextAreaStatus.None;

            void emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                changedCount,
                undefined,
            ]);
            void emittery.emit(AppEvent.UpdateSaved, false);
        }
    }

    #oncopy(event: ClipboardEvent): void {
        if (
            this.#multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            event.clipboardData!.setData(
                "text",
                this.#selectedTextareas
                    .values()
                    .toArray()
                    .join(consts.CLIPBOARD_SEPARATOR),
            );
        }
    }

    async #onBodyClick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (
            target.tagName === "TD" &&
            target.childElementCount === 0 &&
            event.ctrlKey
        ) {
            await writeText(target.textContent);
        }

        switch (target.textContent) {
            case "bookmark": {
                this.#onBookmarkClick(target);
                break;
            }
            case "close": {
                await this.#onCloseClick(target);
                break;
            }
            default: {
                if (target.tagName !== "TEXTAREA") {
                    return;
                }

                if (!event.shiftKey) {
                    this.#multipleTextAreasSelected = false;

                    for (const textarea of this.#selectedTextareas.keys()) {
                        textarea.closest("td")!.classList.remove("outline-2");
                    }

                    target.focus();
                } else {
                    this.#selectedTextareas.clear();
                    this.#multipleTextAreasSelected = true;

                    const startRow = target.closest("tr") as TabRow;
                    const startRowNumber = utils.rowNumber(startRow);

                    const targetRow = document.activeElement!.closest(
                        "tr",
                    ) as TabRow;
                    const targetRowNumber = utils.rowNumber(targetRow);
                    const columnIndex = Array.prototype.indexOf.call(
                        targetRow.children,
                        document.activeElement?.closest("td"),
                    );

                    const rowsRange = startRowNumber - targetRowNumber;
                    const rowsToSelect = Math.abs(rowsRange);

                    const direction = rowsRange > 0 ? 1 : -1;

                    for (let i = 0; i <= rowsToSelect; i++) {
                        const rowIndex = targetRowNumber + direction * i - 1;

                        const nextRow = this.rows[rowIndex];
                        const nextCell = nextRow.children[columnIndex];
                        const nextTextArea =
                            nextCell.querySelector("textarea")!;

                        nextCell.classList.add("outline-2");
                        this.#selectedTextareas.set(
                            nextTextArea,
                            nextTextArea.value,
                        );
                    }
                }
            }
        }
    }

    async #onCtrlKeydown(event: KeyboardEvent): Promise<void> {
        const target = event.target as
            | HTMLTextAreaElement
            | HTMLTableCellElement;

        if (target.tagName !== "TEXTAREA") {
            if (target.tagName === "TD" && target.childElementCount === 0) {
                const selection = window.getSelection();

                if (!selection || selection.rangeCount === 0) {
                    return;
                }

                const selectedText = selection.toString();
                const range = selection.getRangeAt(0);
                const isInside = target.contains(range.commonAncestorContainer);

                if (!isInside) {
                    return;
                }

                if (event.code === "KeyE") {
                    void emittery.emit(AppEvent.AddTerm, selectedText);
                } else if (event.code === "KeyC") {
                    await writeText(selectedText);
                }
            }

            return;
        }

        switch (event.code) {
            case "ArrowUp":
                this.#jumpToRow(
                    target as HTMLTextAreaElement,
                    JumpDirection.Up,
                );
                break;
            case "ArrowDown":
                this.#jumpToRow(
                    target as HTMLTextAreaElement,
                    JumpDirection.Down,
                );
                break;
            case "ArrowLeft": {
                const prevCell = target.closest("td")!
                    .previousElementSibling as HTMLTableCellElement | null;
                prevCell?.querySelector("textarea")?.focus();
                break;
            }
            case "ArrowRight": {
                const nextCell = target.closest("td")!
                    .nextElementSibling as HTMLTableCellElement | null;
                nextCell?.querySelector("textarea")?.focus();
                break;
            }
            case "KeyZ":
                if (!this.#replacedTextareas.size) {
                    return;
                }

                event.preventDefault();

                for (const [
                    textarea,
                    value,
                ] of this.#selectedTextareas.entries()) {
                    textarea.value = value;
                }

                for (const [
                    textarea,
                    value,
                ] of this.#replacedTextareas.entries()) {
                    textarea.value = value;
                    utils.calculateHeight(textarea);
                }

                this.#replacedTextareas.clear();
                break;
        }
    }

    #onKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName !== "TEXTAREA") {
            return;
        }

        const key = event.code;
        const { selectionStart, selectionEnd } = target;

        if (key === "Escape") {
            target.blur();
        } else if (key === "Backspace") {
            if (
                this.#lastInputSubChar &&
                selectionStart === selectionEnd &&
                selectionStart === this.#lastInputSubChar.pos + 1 &&
                target.value[selectionStart - 1] === this.#lastInputSubChar.char
            ) {
                event.preventDefault();

                const original =
                    Object.entries(consts.CHARACTER_SUBSTITUTIONS).find(
                        ([_, subChar]) =>
                            subChar === this.#lastInputSubChar!.char,
                    )?.[0] ?? "";

                if (original) {
                    const value = target.value;
                    target.value =
                        value.slice(0, selectionStart - 1) +
                        original +
                        value.slice(selectionStart);
                    target.setSelectionRange(
                        selectionStart + 1,
                        selectionStart + 1,
                    );
                }

                this.#lastInputSubChar = null;
            } else {
                this.#lastInputChars = "";
                this.#lastInputSubChar = null;
            }
        } else {
            if (
                consts.INTERRUPTING_KEYS.includes(
                    key as (typeof consts.INTERRUPTING_KEYS)[number],
                )
            ) {
                this.#lastInputChars = "";
                this.#lastInputSubChar = null;
                return;
            }

            if (key.length === 1) {
                this.#lastInputChars += key;

                const maybeEmptyMatch =
                    Object.keys(consts.CHARACTER_SUBSTITUTIONS).find(
                        (sequence) => this.#lastInputChars.endsWith(sequence),
                    ) ?? "";

                if (maybeEmptyMatch) {
                    const match =
                        maybeEmptyMatch as keyof typeof consts.CHARACTER_SUBSTITUTIONS;
                    event.preventDefault();

                    const substitution = consts.CHARACTER_SUBSTITUTIONS[match];
                    const before = target.value.slice(
                        0,
                        selectionStart - match.length + 1,
                    );
                    const after = target.value.slice(selectionEnd);
                    target.value = before + substitution + after;

                    const newCaretPosition = before.length + 1;
                    target.setSelectionRange(
                        newCaretPosition,
                        newCaretPosition,
                    );

                    this.#lastInputSubChar = {
                        char: substitution,
                        pos: before.length,
                    };
                    this.#lastInputChars = "";
                } else if (
                    this.#lastInputChars.length >
                    Math.max(
                        ...Object.keys(consts.CHARACTER_SUBSTITUTIONS).map(
                            (key) => key.length,
                        ),
                    )
                ) {
                    this.#lastInputChars = this.#lastInputChars.slice(-2);
                }
            } else {
                this.#lastInputChars = "";
                this.#lastInputSubChar = null;
            }
        }
    }

    async #onBodyKeydown(event: KeyboardEvent): Promise<void> {
        const target = event.target as HTMLElement;

        if (target === this.#tbody) {
            switch (event.code) {
                case "ArrowDown":
                    await emittery.emit(AppEvent.JumpToTab, JumpDirection.Down);
                    break;
                case "ArrowUp":
                    await emittery.emit(AppEvent.JumpToTab, JumpDirection.Up);
                    break;
            }
        }

        if (event.ctrlKey) {
            await this.#onCtrlKeydown(event);
        } else {
            this.#onKeydown(event);
        }
    }

    #resizeColumn(
        columnIndex: number,
        width: number,
        column: HTMLTableCellElement,
    ): void {
        if (columnIndex === 0) {
            this.#projectSettings.rowColumnWidth = width;
        } else if (columnIndex === 1) {
            this.#projectSettings.sourceColumnWidth = width;
        } else {
            this.#projectSettings.translationColumns[columnIndex - 2][1] =
                width;
        }

        column.style.width = `${width}px`;
        void emittery.emit(AppEvent.ColumnResized, [columnIndex, width]);
    }

    #onHeaderMousemove(event: MouseEvent): void {
        const target = event.target as HTMLTableCellElement | null;

        if (!target) {
            return;
        }

        if (!this.#resizing) {
            const rect = target.getBoundingClientRect();
            const distanceToLeft = Math.abs(event.x - rect.left);
            const distanceToRight = Math.abs(event.x - rect.right);

            if (
                (distanceToLeft <= EDGE_THRESHOLD &&
                    target.previousElementSibling) ||
                (distanceToRight <= EDGE_THRESHOLD && target.nextElementSibling)
            ) {
                document.body.style.cursor = "col-resize";
            } else {
                document.body.style.cursor = "auto";
            }

            return;
        }

        this.#resized = true;
        const dx = event.x - this.#dragStartX;

        const [
            [resizedColumn, _rI, resizedInitialWidth, _rPW],
            [adjacentColumn, _aI, adjacentInitialWidth, _aPW],
        ] = this.#resizedColumns;

        if (this.#resizeDirection === ResizeDirection.Right) {
            this.#resizedColumns[0][3] = resizedInitialWidth + dx;

            if (adjacentColumn.textContent !== "+") {
                this.#resizedColumns[1][3] = adjacentInitialWidth - dx;
            }
        } else {
            this.#resizedColumns[0][3] = resizedInitialWidth - dx;
            this.#resizedColumns[1][3] = adjacentInitialWidth + dx;
        }

        resizedColumn.style.outline = "1px dashed red";

        if (adjacentColumn.textContent !== "+") {
            adjacentColumn.style.outline = "1px dashed red";
        }

        if (this.#resizeTooltip) {
            this.#resizeTooltip.textContent = `${Math.max(this.#resizedColumns[0][3], 0)}px`;
            this.#resizeTooltip.style.left = `${event.x + RESIZE_TOOLTIP_PADDING}px`;
            this.#resizeTooltip.style.top = `${event.y + RESIZE_TOOLTIP_PADDING}px`;
        }
    }

    #onHeaderMousedown(event: MouseEvent): void {
        if ((event.button as MouseButton) !== MouseButton.Left) {
            return;
        }

        const cell = (
            event.target as HTMLElement
        ).closest<HTMLTableCellElement>("th");

        if (!cell) {
            return;
        }

        const target =
            cell.textContent === "+"
                ? (cell.previousElementSibling as HTMLTableCellElement)
                : cell;

        const { left, right } = target.getBoundingClientRect();

        const onLeft = Math.abs(event.x - left) <= EDGE_THRESHOLD;
        const onRight = Math.abs(event.x - right) <= EDGE_THRESHOLD;

        const adjacentColumn = (
            onLeft
                ? target.previousElementSibling
                : onRight
                  ? target.nextElementSibling
                  : null
        ) as HTMLTableCellElement | null;

        if (!adjacentColumn) {
            return;
        }

        this.#resizeDirection = onLeft
            ? ResizeDirection.Left
            : ResizeDirection.Right;

        event.preventDefault();

        this.#resized = false;
        this.#resizing = true;
        this.#dragStartX = event.x;

        this.#resizedColumns = [
            [target, Number(target.id), target.offsetWidth, 0],
            [
                adjacentColumn,
                Number(adjacentColumn.id),
                adjacentColumn.offsetWidth,
                0,
            ],
        ];

        document.body.style.cursor = "col-resize";

        this.#resizeTooltip = document.createElement("div");
        this.#resizeTooltip.className = tw`fixed z-50 p-1 text-base`;
        this.#resizeTooltip.style.background = "#333";
        this.#resizeTooltip.style.color = "#fff";

        document.body.appendChild(this.#resizeTooltip);
    }

    #onHeaderMouseup(): void {
        if (!this.#resizing || !this.#resized) {
            return;
        }

        this.#resizing = false;
        document.body.style.cursor = "";

        this.#resizeTooltip?.remove();
        this.#resizeTooltip = null;

        const [
            [resizedColumn, resizedIndex, _rIW, resizedPreviewWidth],
            [adjacentColumn, adjacentIndex, _aIW, adjacentPreviewWidth],
        ] = this.#resizedColumns;

        this.#resizeColumn(resizedIndex, resizedPreviewWidth, resizedColumn);
        resizedColumn.style.outline = "";

        if (adjacentColumn.textContent !== "+") {
            this.#resizeColumn(
                adjacentIndex,
                adjacentPreviewWidth,
                adjacentColumn,
            );
            adjacentColumn.style.outline = "";
        }
    }

    #onHeaderContextmenu(event: MouseEvent): void {
        event.preventDefault();

        if (this.#widthInput) {
            this.#widthInput.remove();
            this.#widthInput = null;
            return;
        }

        const target = (event.target as HTMLElement).closest("th");

        if (!target) {
            return;
        }

        this.#widthInput = document.createElement("input");
        this.#widthInput.type = "number";
        this.#widthInput.min = "128";
        this.#widthInput.value = Number.parseInt(target.style.width).toString();
        this.#widthInput.className = tw`outline-primary fixed z-50 rounded-sm p-1 text-base outline-2`;
        this.#widthInput.style.left = `${event.x}px`;
        this.#widthInput.style.top = `${event.y}px`;

        this.#widthInput.onkeydown = (event): void => {
            switch (event.code) {
                case "Escape":
                    this.#widthInput!.remove();
                    this.#widthInput = null;
                    break;
                case "Enter":
                    this.#resizeColumn(
                        Number(target.id),
                        this.#widthInput!.valueAsNumber,
                        target,
                    );
                    this.#widthInput!.remove();
                    this.#widthInput = null;
                    break;
            }
        };

        document.body.appendChild(this.#widthInput);
    }

    #onHeaderFocusout(event: FocusEvent): void {
        if (this.hidden) {
            return;
        }

        const target = event.target as HTMLInputElement;

        if (target.tagName !== "INPUT") {
            return;
        }

        const columnIndex = Number(target.closest("th")!.id);
        const columnName = target.value;

        void emittery.emit(AppEvent.ColumnRenamed, [columnIndex, columnName]);
    }

    #initHeader(): void {
        const columns = this.#projectSettings.translationColumns;
        const initialized = this.#thead.children.length > 3;

        (this.#headRow.children[0] as HTMLTableCellElement).style.width =
            `${this.#projectSettings.rowColumnWidth}px`;
        (this.#headRow.children[1] as HTMLTableCellElement).style.width =
            `${this.#projectSettings.sourceColumnWidth}px`;

        for (let i = 0; i < columns.length; i++) {
            const [columnName, columnWidth] = columns[i];

            const columnCell = document.createElement("th");
            columnCell.className = tw`border-primary border-2 p-1`;
            columnCell.id = (i + 2).toString();
            columnCell.style.width = `${columnWidth}px`;

            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.className = tw`w-full p-0`;
            titleInput.style.backgroundColor = "var(--bg-primary)";
            titleInput.spellcheck = false;
            titleInput.value = columnName;
            columnCell.appendChild(titleInput);

            if (initialized) {
                this.#headRow.replaceChild(
                    columnCell,
                    this.#headRow.children[i + 2],
                );
            } else {
                this.#headRow.insertBefore(
                    columnCell,
                    this.#headRow.lastElementChild,
                );
            }
        }
    }
}
