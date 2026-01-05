import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings, TranslationSettings } from "@lib/classes";
import {
    AppEvent,
    BatchAction,
    MouseButton,
    TokenizerAlgorithm,
} from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";
import { isErr, readTextFile, translate, writeTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { message } from "@tauri-apps/plugin-dialog";
import { error, warn } from "@tauri-apps/plugin-log";

export class BatchMenu extends Component {
    declare protected readonly element: HTMLElement;

    readonly #body: HTMLDivElement;

    readonly #wrapLimitInput: HTMLInputElement;
    readonly #batchActionSelect: HTMLSelectElement;
    readonly #translationColumnSelect: HTMLSelectElement;

    readonly #selectAllButton: HTMLButtonElement;
    readonly #deselectAllButton: HTMLButtonElement;
    readonly #applyButton: HTMLButtonElement;
    readonly #cancelButton: HTMLButtonElement;

    readonly #contextContainer: HTMLDivElement;
    readonly #contextInput: HTMLInputElement;
    readonly #useContextSelect: HTMLSelectElement;

    readonly #changedCheckboxes = new Set<HTMLInputElement>();

    #wrapLimit = 0;
    #batchAction = BatchAction.None;
    #translationColumnIndex = -1;

    #tempMapsPath = "";
    #translationPath = "";

    #tabInfo!: TabInfo;
    #translationSettings!: TranslationSettings;
    #translationLanguages!: TranslationLanguages;
    #projectSettings!: ProjectSettings;

    #glossary!: Glossary;

    #startX = 0;
    #startY = 0;

    public constructor() {
        super("batch-menu");

        this.#body = this.element.children[1] as HTMLDivElement;

        this.#wrapLimitInput = this.element.querySelector("#wrap-limit-input")!;
        this.#batchActionSelect = this.element.querySelector(
            "#batch-action-select",
        )!;
        this.#translationColumnSelect = this.element.querySelector(
            "#translation-column-select",
        )!;

        this.#selectAllButton =
            this.element.querySelector("#select-all-button")!;
        this.#deselectAllButton = this.element.querySelector(
            "#deselect-all-button",
        )!;
        this.#applyButton = this.element.querySelector("#apply-button")!;
        this.#cancelButton = this.element.querySelector("#cancel-button")!;

        this.#contextContainer =
            this.element.querySelector("#context-container")!;
        this.#contextInput = this.element.querySelector("#context-input")!;
        this.#useContextSelect = this.element.querySelector(
            "#use-context-select",
        )!;

        this.element.onmousedown = (e): void => {
            this.#onmousedown(e);
        };

        this.element.onmouseup = (): void => {
            this.#onmouseup();
        };

        this.element.onmousemove = (e): void => {
            this.#onmousemove(e);
        };

        this.element.onchange = (e): void => {
            this.#onchange(e);
        };

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };

        this.element.oncontextmenu = (e): void => {
            this.#oncontextmenu(e);
        };
    }

    public override get children(): HTMLCollectionOf<HTMLDivElement> {
        return this.#body.children as HTMLCollectionOf<HTMLDivElement>;
    }

    public init(
        tabInfo: TabInfo,
        projectSettings: ProjectSettings,
        translationSettings: TranslationSettings,
        glossary: Glossary,
        tabs: HTMLCollectionOf<HTMLButtonElement>,
    ): void {
        this.#translationSettings = translationSettings;
        this.#projectSettings = projectSettings;
        this.#translationLanguages = projectSettings.translationLanguages;
        this.#tabInfo = tabInfo;
        this.#glossary = glossary;
        this.#body.innerHTML = "";

        for (const tab of tabs) {
            const tabName = tab.firstElementChild!.textContent;

            const checkboxContainer = document.createElement("label");
            checkboxContainer.className = tw`custom-checkbox`;
            checkboxContainer.id = tab.id;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = tw`border-primary`;
            checkboxContainer.appendChild(checkbox);

            const checkboxLabel = document.createElement("span");
            checkboxLabel.className = tw`text-second text-base select-none`;
            checkboxLabel.textContent = tabName;
            checkboxContainer.appendChild(checkboxLabel);

            const fileOption = document.createElement("option");
            fileOption.value = tabName;
            fileOption.innerHTML = tabName;

            this.#useContextSelect.add(fileOption);

            this.#body.appendChild(checkboxContainer);
        }

        this.#tempMapsPath = projectSettings.tempMapsPath;
        this.#translationPath = projectSettings.translationPath;

        this.#translationColumnSelect.innerHTML =
            this.#translationColumnSelect.firstElementChild!.outerHTML;

        for (let i = 0; i < projectSettings.translationColumns.length; i++) {
            const option = document.createElement("option");
            option.value = (i + 1).toString();
            option.textContent = `${projectSettings.translationColumns[i][0]} (${i + 1})`;
            this.#translationColumnSelect.add(option);
        }
    }

    public updateColumn(columnIndex: number, columnName: string): void {
        let columnExists = false;

        for (const option of this.#translationColumnSelect
            .children as HTMLCollectionOf<HTMLOptionElement>) {
            if (Number(option.value) === columnIndex + 1) {
                option.textContent = `${columnName} (${columnIndex + 1})`;
                columnExists = true;
            }
        }

        if (!columnExists) {
            const option = document.createElement("option");
            option.value = (columnIndex + 1).toString();
            option.textContent = `${columnName} (${columnIndex + 1})`;
            this.#translationColumnSelect.add(option);
        }
    }

    public async process(
        fileData?: [string, BatchAction, number],
    ): Promise<void> {
        if (fileData !== undefined) {
            this.#batchActionSelect.value = fileData[1].toString();
            this.#batchAction = fileData[1];
            this.#translationColumnIndex = fileData[2];
        } else {
            if (this.#batchAction === BatchAction.None) {
                this.#batchActionSelect.classList.add(
                    "outline-2",
                    "outline-red-600",
                );
                return;
            }

            this.#translationColumnIndex = Number(
                this.#translationColumnSelect.value,
            );

            if (this.#translationColumnIndex === 0) {
                this.#translationColumnSelect.classList.add(
                    "outline-2",
                    "outline-red-600",
                );
                return;
            }
        }

        this.#wrapLimit = this.#wrapLimitInput.valueAsNumber;

        if (this.#batchAction === BatchAction.Wrap && this.#wrapLimit <= 0) {
            this.#wrapLimitInput.classList.add("outline-2", "outline-red-600");
            return;
        }

        if (
            this.#batchAction === BatchAction.Translate &&
            (this.#translationLanguages.sourceLanguage ===
                TokenizerAlgorithm.None ||
                this.#translationLanguages.translationLanguage ===
                    TokenizerAlgorithm.None)
        ) {
            await message(
                t`Translation languages are not set. Select them in fields above.`,
            );
            return;
        }

        if (fileData !== undefined) {
            await this.#processFile(fileData[0]);
        } else {
            const files: SourceFiles = {};
            const originalStrings: Record<
                string,
                Record<string, string[]>
            > = {};

            for (const container of this.#body.children) {
                const label = container.lastElementChild as HTMLLabelElement;
                label.style.color = "inherit";
            }

            for (const container of this.#body.children) {
                const checkbox =
                    container.firstElementChild as HTMLInputElement;

                if (!checkbox.checked) {
                    continue;
                }

                const label = container.lastElementChild as HTMLLabelElement;
                const filename = label.textContent;

                if (filename === this.#tabInfo.tabName) {
                    await emittery.emit(AppEvent.ChangeTab, null);
                }

                if (this.#batchAction !== BatchAction.Translate) {
                    await this.#processFile(filename);
                    label.style.color = "lime";
                    continue;
                }

                const contentPath = utils.join(
                    filename.startsWith("map")
                        ? this.#tempMapsPath
                        : this.#translationPath,
                    `${filename}${consts.TXT_EXTENSION}`,
                );

                const content = await readTextFile(contentPath);

                if (isErr(content)) {
                    void error(content[0]!);
                    return;
                }

                const lines = utils.lines(content[1]!);
                const blocks: Record<string, SourceBlock> = {};
                originalStrings[filename] = {};

                for (const [id, block] of utils.parseBlocks(lines)) {
                    originalStrings[filename][id] = block.strings;

                    const newStrings: string[] = [];

                    for (const string of block.strings) {
                        if (string.startsWith("<!-- EVENT NAME")) {
                            newStrings.push(string);
                            continue;
                        }

                        if (string.startsWith(consts.COMMENT_PREFIX)) {
                            continue;
                        }

                        newStrings.push(
                            string
                                .slice(0, string.indexOf(consts.SEPARATOR))
                                .replaceAll(consts.NEW_LINE, "\n"),
                        );
                    }

                    block.strings = newStrings;
                    blocks[id] = block;
                }

                files[filename] = blocks;
            }

            if (this.#batchAction === BatchAction.Translate) {
                await this.#translateFiles(files, originalStrings);
            }
        }

        await emittery.emit(AppEvent.UpdateSaved, false);
    }

    async #translateFiles(
        files: SourceFiles,
        sourceStrings: Record<string, Record<string, string[]>>,
    ): Promise<void> {
        const glossary = [];

        if (this.#translationSettings.useGlossary) {
            for (const term of this.#glossary) {
                glossary.push({
                    term: term.source,
                    translation: term.translation,
                    note: term.note,
                });
            }
        }
        const result = await translate({
            ...this.#translationSettings,
            ...this.#translationLanguages,
            projectContext: this.#projectSettings.projectContext,
            localContext: this.#contextInput.value,
            files,
            glossary,
            normalize: true,
        });

        if (isErr(result)) {
            void error(result[0]!);
            return;
        }

        const translatedFiles = result[1]!;

        let newLinesLength = 0;

        for (const i in sourceStrings) {
            for (const j in sourceStrings[i]) {
                newLinesLength += sourceStrings[i][j].length;
            }
        }

        for (const filename in files) {
            const translatedFile = translatedFiles[filename];
            const sourceFile = files[filename];

            const contentPath = utils.join(
                filename.startsWith("map")
                    ? this.#tempMapsPath
                    : this.#translationPath,
                `${filename}${consts.TXT_EXTENSION}`,
            );

            const newLines: string[] = new Array(newLinesLength);
            let newLinesPos = 0;

            for (const id in sourceFile) {
                const translatedBlock = translatedFile[id];
                const sourceBlock = sourceFile[id];
                const strings = sourceStrings[filename][id];

                newLines[newLinesPos++] =
                    `${consts.ID_COMMENT}${consts.SEPARATOR}${id}`;
                newLines[newLinesPos++] =
                    `<!-- NAME -->${consts.SEPARATOR}${sourceBlock.name}`;

                for (let i = 0; i < strings.length; i++) {
                    if (strings[i].startsWith(consts.COMMENT_PREFIX)) {
                        newLines[newLinesPos++] = strings[i];
                        continue;
                    }

                    const split = utils.parts(strings[i]);

                    if (!split) {
                        utils.logSplitError(sourceBlock.name, i + 1);
                        continue;
                    }

                    split[this.#translationColumnIndex] ??= "";

                    for (let j = this.#translationColumnIndex; j >= 0; j--) {
                        split[j] ??= "";
                    }

                    const translation = translatedBlock[i];

                    split[this.#translationColumnIndex] = translation;
                    newLines[newLinesPos++] = split.join(consts.SEPARATOR);
                }
            }

            const result = await writeTextFile(
                contentPath,
                newLines.join("\n"),
            );

            if (isErr(result)) {
                void error(result[0]!);
                return;
            }

            await emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                undefined,
                filename,
            ]);
        }
    }

    async #processFile(
        filename: string,
    ): Promise<[string, SourceBlock] | undefined> {
        const contentPath = utils.join(
            filename.startsWith("map")
                ? this.#tempMapsPath
                : this.#translationPath,
            `${filename}${consts.TXT_EXTENSION}`,
        );

        const content = await readTextFile(contentPath);

        if (isErr(content)) {
            void error(content[0]!);
            return;
        }

        const lines = utils.lines(content[1]!);

        const files: SourceFiles = {};
        const originalStrings: Record<string, Record<string, string[]>> = {};
        const blocks: Record<string, SourceBlock> = {};
        originalStrings[filename] = {};

        const newLines: string[] = new Array(lines.length);
        let newLinesPos = 0;

        for (const [id, block] of utils.parseBlocks(lines)) {
            if (this.#batchAction === BatchAction.Translate) {
                originalStrings[filename][id] = block.strings;

                const newStrings: string[] = [];

                for (const string of block.strings) {
                    if (string.startsWith("<!-- EVENT NAME")) {
                        newStrings.push(string);
                        continue;
                    }

                    if (string.startsWith(consts.COMMENT_PREFIX)) {
                        continue;
                    }

                    newStrings.push(
                        string
                            .slice(0, string.indexOf(consts.SEPARATOR))
                            .replaceAll(consts.NEW_LINE, "\n"),
                    );
                }

                block.strings = newStrings;
                blocks[id] = block;
                continue;
            }
            newLines[newLinesPos++] =
                `${consts.ID_COMMENT}${consts.SEPARATOR}${id}`;
            newLines[newLinesPos++] =
                `<!-- NAME -->${consts.SEPARATOR}${block.name}`;

            for (const line of block.strings) {
                if (!line.trim()) {
                    newLines[newLinesPos++] = line;
                    continue;
                }

                const split = utils.parts(line);

                if (!split) {
                    utils.logSplitError(filename, newLinesPos + 1);
                    newLines[newLinesPos++] = line;
                    continue;
                }

                if (split.at(this.#translationColumnIndex) === undefined) {
                    void warn(
                        `Column ${this.#translationColumnIndex} doesn't exist.`,
                    );
                    newLines[newLinesPos++] = line;
                    continue;
                }

                const source = utils.source(split);
                const isComment = source.startsWith(consts.COMMENT_PREFIX);

                const translation = split[this.#translationColumnIndex];
                const translationTrimmed = translation.trim();
                const translationExists = Boolean(translationTrimmed);

                if (!translationExists) {
                    continue;
                }

                if (this.#batchAction === BatchAction.Trim) {
                    split[this.#translationColumnIndex] = translationTrimmed;
                    newLines[newLinesPos++] = split.join(consts.SEPARATOR);
                } else if (
                    this.#batchAction === BatchAction.Wrap &&
                    !isComment
                ) {
                    const wrapped = this.#wrapText(translation);
                    split[this.#translationColumnIndex] = wrapped;
                    newLines[newLinesPos++] = split.join(consts.SEPARATOR);
                }
            }
        }

        if (this.#batchAction === BatchAction.Translate) {
            files[filename] = blocks;
            await this.#translateFiles(files, originalStrings);
            return;
        }

        const result = await writeTextFile(contentPath, newLines.join("\n"));

        if (isErr(result)) {
            void error(result[0]!);
        }
    }

    #wrapText(text: string): string {
        const lines = text.split(consts.NEW_LINE);

        const remainder: string[] = [];
        const wrappedLines: string[] = [];

        for (let line of lines) {
            if (remainder.length) {
                // eslint-disable-next-line sonarjs/updated-loop-counter
                line = `${remainder.join(" ")} ${line}`;
                remainder.length = 0;
            }

            if (line.length > this.#wrapLimit) {
                const words = line.split(" ");
                let wordsLength = line.length;

                while (wordsLength > this.#wrapLimit && words.length !== 0) {
                    const popped = words.pop()!;
                    wordsLength -= popped.length;
                    remainder.unshift(popped);
                }

                wrappedLines.push(words.join(" "));
            } else {
                wrappedLines.push(line);
            }
        }

        if (remainder.length) {
            wrappedLines.push(remainder.join(" "));
        }

        return wrappedLines.join(consts.NEW_LINE);
    }

    #onmouseup(): void {
        this.#changedCheckboxes.clear();
    }

    async #onclick(event: MouseEvent): Promise<void> {
        let target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        const input =
            target.querySelector("input") ??
            (this.#body.contains(target)
                ? target.previousElementSibling
                : null);

        if (input) {
            target = input as HTMLInputElement;
        }

        if (target instanceof HTMLInputElement) {
            for (const container of this.#body.children) {
                const label = container.lastElementChild as HTMLLabelElement;
                label.style.color = "inherit";
            }

            this.#changedCheckboxes.add(target);
            return;
        }

        switch (target) {
            case this.#selectAllButton:
                for (const container of this.#body.children) {
                    (container.firstElementChild as HTMLInputElement).checked =
                        true;
                    const label =
                        container.lastElementChild as HTMLLabelElement;
                    label.style.color = "inherit";
                }
                break;
            case this.#applyButton: {
                await this.process();
                break;
            }
            case this.#deselectAllButton:
            case this.#cancelButton:
                for (const container of this.#body.children) {
                    (container.firstElementChild as HTMLInputElement).checked =
                        false;
                    const label =
                        container.lastElementChild as HTMLLabelElement;
                    label.style.color = "inherit";
                }

                if (target === this.#cancelButton) {
                    this.hide();
                }
                break;
        }
    }

    #onchange(event: Event): void {
        const target = event.target as HTMLSelectElement;

        if (target === this.#batchActionSelect) {
            this.#batchAction = Number(
                this.#batchActionSelect.value,
            ) as BatchAction;

            if (this.#batchAction === BatchAction.Wrap) {
                this.#wrapLimitInput.classList.remove("hidden");
            } else {
                this.#wrapLimitInput.classList.add("hidden");
            }

            if (this.#batchAction === BatchAction.Translate) {
                this.#contextContainer.classList.remove("hidden");
            } else {
                this.#contextContainer.classList.add("hidden");
            }

            this.#batchActionSelect.classList.remove(
                "outline-2",
                "outline-red-600",
            );
        } else if (target === this.#translationColumnSelect) {
            this.#translationColumnSelect.classList.remove(
                "outline-2",
                "outline-red-600",
            );
        } else if (target === this.#useContextSelect) {
            const context = this.#projectSettings.fileContexts[target.value];

            if (context === "undefined") {
                alert(
                    t`Context for this file does not exist. You can set it in Settings > Project.`,
                );
                return;
            }

            this.#contextInput.value += context + "\n";
        }
    }

    #onmousemove(event: MouseEvent): void {
        if (event.buttons === 1) {
            let target = event.target as HTMLInputElement | null;

            const input =
                target?.querySelector("input") ??
                target?.previousElementSibling;

            if (input) {
                target = input as HTMLInputElement;
            }

            if (target instanceof HTMLInputElement) {
                if (!this.#changedCheckboxes.has(target)) {
                    if (!target.checked) {
                        target.checked = true;
                    } else {
                        target.checked = false;
                    }

                    this.#changedCheckboxes.add(target);
                }
            }
        }
    }

    #onmousedown(e: MouseEvent): void {
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

                    this.element.onmouseup = (): void => {
                        this.#onmouseup();
                    };

                    this.element.onmousemove = (e): void => {
                        this.#onmousemove(e);
                    };
                };
            };
        }
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
