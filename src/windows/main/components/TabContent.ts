import { emittery } from "@classes/emittery";
import { ProjectSettings, Settings } from "@lib/classes";
import {
    AppEvent,
    JumpDirection,
    RowDeleteMode,
    TextAreaStatus,
} from "@lib/enums";
import { Component } from "./Component";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask } from "@tauri-apps/plugin-dialog";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";

export class TabContent extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #tabContentContainer: HTMLDivElement;

    #textareaStatus = TextAreaStatus.None;
    #currentFocusedElement: [HTMLTextAreaElement, string] | [] = [];
    #multipleTextAreasSelected = false;
    #activeGhostLines: HTMLDivElement[] = [];

    #lastCharacters = "";
    #lastSubstitutionCharacter: { char: string; pos: number } | null = null;

    readonly #selectedTextareas = new Map<HTMLTextAreaElement, string>();
    readonly #replacedTextareas = new Map<HTMLTextAreaElement, string>();

    #font = "";
    #displayGhostLines = false;
    #rowDeleteMode = RowDeleteMode.Disabled;

    #projectSettings!: ProjectSettings;

    public constructor() {
        super("tab-content");

        this.#tabContentContainer = this.element
            .parentElement as HTMLDivElement;

        this.element.onmousedown = (event): void => {
            if (event.shiftKey && event.buttons === 1) {
                event.preventDefault();
            }
        };

        this.element.addEventListener("focusin", (e) => {
            this.#onfocusin(e);
        });

        this.element.addEventListener("focusout", (e) => {
            this.#onfocusout(e);
        });

        this.element.onkeyup = (e): void => {
            this.#onkeyup(e);
        };

        this.element.oninput = (e): void => {
            this.#oninput(e);
        };

        this.element.oncut = (e): void => {
            this.#oncut(e);
        };

        this.element.onpaste = (e): void => {
            this.#onpaste(e);
        };

        this.element.oncopy = (e): void => {
            this.#oncopy(e);
        };

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };

        this.element.onkeydown = async (e): Promise<void> => {
            await this.#onkeydown(e);
        };
    }

    public get lastRow(): RowContainer {
        return this.element.lastChild as RowContainer;
    }

    public get firstRow(): RowContainer {
        return this.element.firstChild as RowContainer;
    }

    public override get children(): HTMLCollectionOf<RowContainer> {
        return this.element.children as HTMLCollectionOf<RowContainer>;
    }

    public set scroll(pos: number) {
        this.#tabContentContainer.scrollLeft = pos;
    }

    public init(settings: Settings, projectSettings: ProjectSettings): void {
        this.#font = settings.font;
        this.#displayGhostLines = settings.displayGhostLines;
        this.#rowDeleteMode = settings.rowDeleteMode;

        this.#projectSettings = projectSettings;
    }

    public row(index: number): RowContainer {
        return this.children[index];
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

        const content = await readTextFile(contentPath).catch((err) => {
            utils.logErrorIO(contentPath, err);
            return null;
        });

        if (content === null) {
            return;
        }

        const contentLines = utils.lines(content);

        if (filename === "system") {
            contentLines.pop();
        }

        const fragment = document.createDocumentFragment();

        let maxColumns = 0;

        for (const line of contentLines) {
            const columnCount = utils.count(line, consts.SEPARATOR) + 1;

            if (columnCount > maxColumns) {
                maxColumns = columnCount;
            }
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

            while (translations.length < translationColumnCount - 1) {
                translations.push("");
            }

            const rowDiv = this.#createRow(source, translations, rowIndex);
            fragment.appendChild(rowDiv);
        }

        this.element.appendChild(fragment);
    }

    public addTextAreaCell(
        rowContainer: HTMLDivElement,
        translation: string,
        height: number,
        width: number,
    ): void {
        const translationdlb = utils.clbtodlb(translation);
        const translationTextArea = document.createElement("textarea");
        translationTextArea.rows = utils.countLines(translationdlb);
        translationTextArea.className = tw`outline-primary focus-outline-primary bg-primary font resize-none p-1 outline outline-2 focus:z-10`;
        translationTextArea.style.minWidth =
            translationTextArea.style.width = `${width}px`;
        translationTextArea.style.minHeight = `${height}px`;

        translationTextArea.spellcheck = false;
        translationTextArea.autocomplete = "off";
        translationTextArea.autocapitalize = "off";
        translationTextArea.autofocus = false;

        if (this.#font) {
            translationTextArea.style.fontFamily = "font";
        }

        translationTextArea.value = translationdlb;
        rowContainer.appendChild(translationTextArea);
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

        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            const textWidth = context.measureText(`${line} `).width;
            const left = textarea.offsetLeft + textWidth;

            positions.push({ left, top });
            top += Number(lineHeight);
        }

        return positions;
    }

    #updateRowIds(startIndex: number): void {
        const children = this.element.children;

        for (let i = startIndex; i < children.length; i++) {
            const element = children[i] as RowContainer;
            const newRowNumber = (i + 1).toString();

            utils.rowNumberElement(element).textContent = newRowNumber;
            // eslint-disable-next-line sonarjs/slow-regex
            element.id = element.id.replace(/\d+$/, newRowNumber);
        }
    }

    #createRow(
        source: string,
        translations: string[],
        rowIndex: number,
    ): HTMLDivElement {
        const rowContainer = document.createElement("div");
        rowContainer.className = tw`flex min-w-full flex-row py-px`;

        const rowNumberContainer = document.createElement("div");
        rowNumberContainer.className = tw`outline-primary bg-primary flex flex-row p-1 outline outline-2`;
        rowNumberContainer.style.minWidth = `${this.#projectSettings.rowColumnWidth}px`;

        const rowNumberSpan = document.createElement("span");
        rowNumberSpan.textContent = (rowIndex + 1).toString();

        const rowNumberButtonDiv = document.createElement("div");
        rowNumberButtonDiv.className = tw`text-third flex w-full items-start justify-end gap-0.5 p-0.5 text-lg`;

        const bookmarkButton = document.createElement("button");
        bookmarkButton.className = tw`border-primary hover-bg-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        bookmarkButton.textContent = "bookmark";

        const deleteButton = document.createElement("button");
        deleteButton.className = tw`border-primary hover-bg-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        deleteButton.textContent = "close";

        rowNumberButtonDiv.appendChild(deleteButton);
        rowNumberButtonDiv.appendChild(bookmarkButton);
        rowNumberContainer.appendChild(rowNumberSpan);
        rowNumberContainer.appendChild(rowNumberButtonDiv);
        rowContainer.appendChild(rowNumberContainer);

        const sourceTextDiv = document.createElement("div");
        sourceTextDiv.className = tw`outline-primary bg-primary font cursor-pointer p-1 whitespace-pre-wrap outline outline-2`;
        sourceTextDiv.style.minWidth =
            sourceTextDiv.style.width = `${this.#projectSettings.sourceColumnWidth}px`;
        sourceTextDiv.textContent = utils.clbtodlb(source);
        rowContainer.appendChild(sourceTextDiv);

        if (this.#font) {
            sourceTextDiv.style.fontFamily = "font";
        }

        // From text-lg:
        // font-size: var(--text-lg); /* 1.125rem (18px) */
        // line-height: var(--text-lg--line-height); /* calc(1.75 / 1.125) */
        const lineHeight = 28;

        // Padding: p-1 is 4px, account for top and bottom
        const padding = 8;

        const minHeight =
            lineHeight * utils.countLines(sourceTextDiv.textContent) + padding;

        for (let i = 0; i < translations.length; i++) {
            this.addTextAreaCell(
                rowContainer,
                utils.clbtodlb(translations[i]),
                minHeight,
                this.#projectSettings.translationColumns[i][1],
            );
        }

        rowContainer.insertBefore(
            sourceTextDiv,
            rowNumberContainer.nextElementSibling,
        );

        rowContainer.style.minHeight =
            rowNumberContainer.style.minHeight =
            sourceTextDiv.style.minHeight =
                `${minHeight}px`;
        return rowContainer;
    }

    #jumpToRow(
        focusedTextArea: HTMLTextAreaElement,
        direction: JumpDirection,
    ): void {
        if (!(focusedTextArea instanceof HTMLTextAreaElement)) {
            return;
        }

        const rowContainer = focusedTextArea.parentElement! as RowContainer;
        const rowNumber = utils.rowNumber(rowContainer);

        if (
            (rowNumber === 1 && direction === JumpDirection.Up) ||
            (rowNumber === this.childCount && direction === JumpDirection.Down)
        ) {
            return;
        }

        const columnIndex = Array.prototype.findIndex.call(
            rowContainer.children,
            (element) => {
                return element === focusedTextArea;
            },
        );

        const step = direction === JumpDirection.Down ? 1 : -1;
        const rowIndex = rowNumber - 1 + step;

        const childrenCount = this.childCount;
        if (childrenCount - 1 < rowIndex || rowIndex < 0) {
            return;
        }

        const nextRowContainer = this.children[rowIndex];
        const nextTextArea = nextRowContainer.children[
            columnIndex
        ] as HTMLTextAreaElement;

        focusedTextArea.blur();
        nextTextArea.scrollIntoView({ block: "center", inline: "center" });
        nextTextArea.focus();
        nextTextArea.setSelectionRange(0, 0);
    }

    async #handleCloseButtonClick(target: HTMLElement): Promise<void> {
        switch (this.#rowDeleteMode) {
            case RowDeleteMode.Disabled:
                alert(t`Deleting is disabled in settings.`);
                return;
            // @ts-expect-error Fallthrough because of shared behavior
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
                const rowContainer = target.parentElement!.parentElement!
                    .parentElement as RowContainer;

                const rowNumber = utils.rowNumber(rowContainer);
                const rowIndex = rowNumber - 1;
                const source = utils.source(rowContainer);
                const translation = utils.translation(rowContainer)[0];

                if (source === "<!-- Bookmark -->") {
                    await emittery.emit(AppEvent.RemoveBookmark, rowNumber);
                }

                rowContainer.remove();
                this.#updateRowIds(rowIndex);

                void emittery.emit(AppEvent.UpdateSourceLineCount, [
                    -1,
                    undefined,
                ]);

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

    #handleBookmarkButtonClick(target: HTMLElement): void {
        const rowContainer = target.parentElement!.parentElement!
            .parentElement as RowContainer;
        const rowNumber = utils.rowNumber(rowContainer);

        const bookmarkDescriptionInput = document.createElement("input");
        bookmarkDescriptionInput.className = tw`input text-second bg-second absolute z-50 h-7 w-auto p-1 text-base`;
        bookmarkDescriptionInput.style.left = `${target.offsetLeft + target.clientWidth}px`;
        bookmarkDescriptionInput.style.top = `${target.offsetTop}px`;
        document.body.appendChild(bookmarkDescriptionInput);

        requestAnimationFrame(() => {
            bookmarkDescriptionInput.focus();
        });

        bookmarkDescriptionInput.onkeydown = (event): void => {
            if (event.code === "Enter") {
                const description = bookmarkDescriptionInput.value;
                bookmarkDescriptionInput.remove();

                const bookmarkRow = this.#createRow(
                    `<!-- Bookmark -->`,
                    [description],
                    rowNumber,
                );

                this.element.insertBefore(
                    bookmarkRow,
                    target.parentElement!.parentElement!.parentElement,
                );

                this.#updateRowIds(rowNumber - 1);

                void emittery.emit(AppEvent.AddBookmark, [
                    undefined,
                    description,
                    rowNumber,
                ]);
            } else if (event.code === "Escape") {
                bookmarkDescriptionInput.remove();
            }
        };
    }

    #trackFocus(focusedElement: Event): void {
        for (const ghost of this.#activeGhostLines) {
            ghost.remove();
        }

        const result = this.#getNewLinePositions(
            focusedElement.target as HTMLTextAreaElement,
        );

        for (const { left, top } of result) {
            const ghostNewLineDiv = document.createElement("div");
            ghostNewLineDiv.className = tw`text-third pointer-events-none absolute z-50 cursor-default select-none`;
            ghostNewLineDiv.style.left = `${left}px`;
            ghostNewLineDiv.style.top = `${top}px`;
            ghostNewLineDiv.textContent = "\\n";

            this.#activeGhostLines.push(ghostNewLineDiv);
            document.body.appendChild(ghostNewLineDiv);
        }
    }

    #onfocusin(event: FocusEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (!(target instanceof HTMLTextAreaElement)) {
            return;
        }

        if (target !== this.#currentFocusedElement[0]) {
            this.#currentFocusedElement = [target, target.value];

            this.#textareaStatus = target.value
                ? TextAreaStatus.Translated
                : TextAreaStatus.Untranslated;
        }
    }

    #onfocusout(event: FocusEvent): void {
        requestAnimationFrame(() => {
            const target = event.target as HTMLTextAreaElement;

            if (!(target instanceof HTMLTextAreaElement)) {
                return;
            }

            target.placeholder = "";

            for (const ghost of this.#activeGhostLines) {
                ghost.remove();
            }

            if (
                this.#currentFocusedElement[0]?.value !==
                this.#currentFocusedElement[1]
            ) {
                void emittery.emit(AppEvent.UpdateSaved, false);
            }

            let source: HTMLElement = target;

            while (!(source instanceof HTMLDivElement)) {
                source = source.previousElementSibling as HTMLElement;
            }

            let changedCount = 0;
            if (!source.textContent.startsWith(consts.COMMENT_PREFIX)) {
                switch (this.#textareaStatus) {
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
                    case TextAreaStatus.None:
                        break;
                }
            }

            this.#textareaStatus = TextAreaStatus.None;
            void emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                changedCount,
                undefined,
            ]);
        });
    }

    #onkeyup(event: KeyboardEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (target instanceof HTMLTextAreaElement) {
            utils.calculateHeight(target);
        }
    }

    #oninput(event: Event): void {
        const target = event.target as HTMLTextAreaElement;

        if (target instanceof HTMLTextAreaElement && this.#displayGhostLines) {
            this.#trackFocus(event);
        }
    }

    #oncut(event: ClipboardEvent): void {
        if (
            this.#multipleTextAreasSelected &&
            document.activeElement instanceof HTMLTextAreaElement
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

        if (!(document.activeElement instanceof HTMLTextAreaElement)) {
            return;
        }

        const startRowContainer = document.activeElement
            .parentElement as RowContainer;

        if (normalized.includes(consts.CLIPBOARD_SEPARATOR)) {
            event.preventDefault();
            const clipboardTextSplit = normalized.split(
                consts.CLIPBOARD_SEPARATOR,
            );
            const textRows = clipboardTextSplit.length;
            const startIndex = utils.rowNumber(startRowContainer);

            if (textRows === 0) {
                return;
            } else {
                const columnIndex = Array.prototype.findIndex.call(
                    startRowContainer.children,
                    (element) => element === document.activeElement,
                );

                let changedCount = 0;

                for (let i = 0; i < textRows; i++) {
                    const rowIndex = startIndex + i - 1;

                    if (rowIndex > this.element.childElementCount) {
                        return;
                    }

                    const rowContainer = this.element.children[
                        rowIndex
                    ] as HTMLDivElement;

                    const textarea = rowContainer.children[
                        columnIndex
                    ] as HTMLTextAreaElement;

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
    }

    #oncopy(event: ClipboardEvent): void {
        if (
            this.#multipleTextAreasSelected &&
            document.activeElement instanceof HTMLTextAreaElement
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

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (
            target instanceof HTMLDivElement &&
            target.parentElement!.parentElement === this.element
        ) {
            await writeText(target.textContent);
        }

        switch (target.textContent) {
            case "bookmark": {
                this.#handleBookmarkButtonClick(target);
                break;
            }
            case "close": {
                await this.#handleCloseButtonClick(target);
                break;
            }
            default: {
                if (!(target instanceof HTMLTextAreaElement)) {
                    return;
                }

                if (!event.shiftKey) {
                    this.#multipleTextAreasSelected = false;

                    for (const textarea of this.#selectedTextareas.keys()) {
                        textarea.style.outlineColor = "";
                    }

                    target.focus();
                } else {
                    this.#selectedTextareas.clear();
                    this.#multipleTextAreasSelected = true;

                    const clickedRowContainer =
                        target.parentElement as RowContainer;
                    const clickedRowContainerNumber =
                        utils.rowNumber(clickedRowContainer);

                    const selectedRowContainer = document.activeElement!
                        .parentElement as RowContainer;
                    const selectedRowContainerNumber =
                        utils.rowNumber(selectedRowContainer);
                    const columnIndex = Array.prototype.findIndex.call(
                        selectedRowContainer.children,
                        (element) => element === document.activeElement,
                    );

                    const rowsRange =
                        clickedRowContainerNumber - selectedRowContainerNumber;
                    const rowsToSelect = Math.abs(rowsRange);

                    const direction = rowsRange > 0 ? 1 : -1;

                    for (let i = 0; i <= Math.abs(rowsToSelect); i++) {
                        const rowIndex =
                            selectedRowContainerNumber + direction * i - 1;

                        const nextRowContainer = this.element.children[
                            rowIndex
                        ] as HTMLDivElement;
                        const nextTextArea = nextRowContainer.children[
                            columnIndex
                        ] as HTMLTextAreaElement;

                        nextTextArea.style.outlineColor =
                            "var(--focus-outline-primary)";
                        this.#selectedTextareas.set(
                            nextTextArea,
                            nextTextArea.value,
                        );
                    }
                }
            }
        }
    }

    async #handleCtrlKeydown(event: KeyboardEvent): Promise<void> {
        const target = event.target as HTMLTextAreaElement;

        if (!(target instanceof HTMLTextAreaElement)) {
            return;
        }

        switch (event.code) {
            case "ArrowUp":
                this.#jumpToRow(target, JumpDirection.Up);
                break;
            case "ArrowDown":
                this.#jumpToRow(target, JumpDirection.Down);
                break;
            case "ArrowLeft":
                (
                    target.previousElementSibling as HTMLTextAreaElement | null
                )?.focus();
                break;
            case "ArrowRight":
                (
                    target.nextElementSibling as HTMLTextAreaElement | null
                )?.focus();
                break;
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
            case "KeyT": {
                const selectedTextArea = event.target as HTMLTextAreaElement;
                const rowContainer =
                    selectedTextArea.parentElement as RowContainer;
                const sourceText = utils.source(rowContainer);

                await emittery.emit(AppEvent.TranslateTextArea, [
                    sourceText,
                    selectedTextArea,
                ]);
                break;
            }
        }
    }

    #handleKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLTextAreaElement;

        if (!(target instanceof HTMLTextAreaElement)) {
            return;
        }

        const key = event.code;
        const { selectionStart, selectionEnd } = target;

        if (key === "Escape") {
            target.blur();
        } else if (key === "Backspace") {
            if (
                this.#lastSubstitutionCharacter &&
                selectionStart === selectionEnd &&
                selectionStart === this.#lastSubstitutionCharacter.pos + 1 &&
                target.value[selectionStart - 1] ===
                    this.#lastSubstitutionCharacter.char
            ) {
                event.preventDefault();

                const original =
                    Object.entries(consts.CHARACTER_SUBSTITUTIONS).find(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ([_, subChar]) =>
                            subChar === this.#lastSubstitutionCharacter!.char,
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

                this.#lastSubstitutionCharacter = null;
            } else {
                this.#lastCharacters = "";
                this.#lastSubstitutionCharacter = null;
            }
        } else {
            if (consts.INTERRUPTING_KEYS.includes(key)) {
                this.#lastCharacters = "";
                this.#lastSubstitutionCharacter = null;
                return;
            }

            if (key.length === 1) {
                this.#lastCharacters += key;

                const match =
                    Object.keys(consts.CHARACTER_SUBSTITUTIONS).find(
                        (sequence) => this.#lastCharacters.endsWith(sequence),
                    ) ?? "";

                if (match) {
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

                    this.#lastSubstitutionCharacter = {
                        char: substitution,
                        pos: before.length,
                    };
                    this.#lastCharacters = "";
                } else if (
                    this.#lastCharacters.length >
                    Math.max(
                        ...Object.keys(consts.CHARACTER_SUBSTITUTIONS).map(
                            (key) => key.length,
                        ),
                    )
                ) {
                    this.#lastCharacters = this.#lastCharacters.slice(-2);
                }
            } else {
                this.#lastCharacters = "";
                this.#lastSubstitutionCharacter = null;
            }
        }
    }

    async #onkeydown(event: KeyboardEvent): Promise<void> {
        const target = event.target as HTMLElement;

        if (target === this.element) {
            switch (event.code) {
                case "ArrowDown":
                    await emittery.emit(AppEvent.JumpToTab, JumpDirection.Down);
                    break;
                case "ArrowUp":
                    await emittery.emit(AppEvent.JumpToTab, JumpDirection.Up);
                    break;
            }
        }

        if (!(target instanceof HTMLTextAreaElement)) {
            return;
        }

        if (event.ctrlKey) {
            await this.#handleCtrlKeydown(event);
        } else {
            this.#handleKeydown(event);
        }
    }
}
