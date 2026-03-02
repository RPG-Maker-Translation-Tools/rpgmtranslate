import { Component } from "./Component";
import { FileSelectMenu } from "./FileSelectMenu";

import { emittery } from "@classes/emittery";

import { ProjectSettings, TranslationSettings } from "@lib/classes";
import { AppEvent, BatchAction, TokenizerAlgorithm } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { isErr, readTextFile, translate, writeTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { error, info, warn } from "@tauri-apps/plugin-log";

export class BatchMenu extends Component {
    declare protected readonly element: HTMLElement;

    readonly #wrapLimitInput: HTMLInputElement;
    readonly #translationEndpointSelect: HTMLSelectElement;

    readonly #batchActionSelect: HTMLSelectElement;
    readonly #translationColumnSelect: HTMLSelectElement;

    readonly #applyButton: HTMLButtonElement;

    readonly #contextContainer: HTMLDivElement;
    readonly #contextInput: HTMLInputElement;
    readonly #useContextSelect: HTMLSelectElement;

    readonly #fileSelectMenu: FileSelectMenu;

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

    public constructor(fileSelectMenu: FileSelectMenu) {
        super("batch-menu");

        this.#fileSelectMenu = fileSelectMenu;

        this.#wrapLimitInput = this.element.querySelector("#wrap-limit-input")!;
        this.#translationEndpointSelect = this.element.querySelector(
            "#translation-endpoint-select",
        )!;

        this.#batchActionSelect = this.element.querySelector(
            "#batch-action-select",
        )!;
        this.#translationColumnSelect = this.element.querySelector(
            "#translation-column-select",
        )!;

        this.#applyButton = this.element.querySelector("#apply-button")!;

        this.#contextContainer =
            this.element.querySelector("#context-container")!;
        this.#contextInput = this.element.querySelector("#context-input")!;
        this.#useContextSelect = this.element.querySelector(
            "#use-context-select",
        )!;

        this.element.onchange = (e): void => {
            this.#onchange(e);
        };

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    public override show(x?: number, y?: number): void {
        super.show(x, y);

        requestAnimationFrame(() => {
            const rect = this.element.getBoundingClientRect();
            this.#fileSelectMenu.show(rect.x + rect.width, rect.y);
            this.#fileSelectMenu.deselectAll();
        });
    }

    public override hide(): void {
        super.hide();
        this.#fileSelectMenu.hide();
    }

    public init(
        tabInfo: TabInfo,
        projectSettings: ProjectSettings,
        translationSettings: TranslationSettings,
        glossary: Glossary,
    ): void {
        this.#translationSettings = translationSettings;
        this.#projectSettings = projectSettings;
        this.#translationLanguages = projectSettings.translationLanguages;
        this.#tabInfo = tabInfo;
        this.#glossary = glossary;

        this.#useContextSelect.innerHTML = "";

        for (const tabName in tabInfo.tabs) {
            const fileOption = document.createElement("option");
            fileOption.value = tabName;
            fileOption.innerHTML = tabName;

            this.#useContextSelect.add(fileOption);
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

        if (this.#batchAction === BatchAction.Translate) {
            if (
                this.#translationLanguages.sourceLanguage ===
                TokenizerAlgorithm.None
            ) {
                alert(t`Source language is not set.`);
                return;
            }

            if (
                this.#translationLanguages.translationLanguage ===
                TokenizerAlgorithm.None
            ) {
                alert(t`Translation language is not set.`);
                return;
            }

            if (this.#translationEndpointSelect.value === "") {
                alert(t`Translation endpoint is not selected.`);
                return;
            }
        }

        const files: SourceFiles = {};
        const originalStrings: Record<string, Record<string, string[]>> = {};

        if (fileData !== undefined) {
            await this.#processFile(fileData[0], files, originalStrings, []);
        } else {
            for (const container of this.#fileSelectMenu.children) {
                const label = container.querySelector("span")!;
                label.style.color = "inherit";
            }

            const selected = this.#fileSelectMenu.selected;

            if (!selected) {
                return;
            }

            for (const [filename, range] of selected) {
                if (filename === this.#tabInfo.tabName) {
                    await emittery.emit(AppEvent.ChangeTab, "");
                }

                await this.#processFile(
                    filename,
                    files,
                    originalStrings,
                    range,
                );
            }

            if (this.#batchAction !== BatchAction.Translate) {
                for (const container of this.#fileSelectMenu.children) {
                    const label = container.querySelector("span")!;
                    label.style.color = "lime";
                }
            }
        }

        if (this.#batchAction === BatchAction.Translate) {
            await this.#translateFiles(files, originalStrings);
        }

        await emittery.emit(AppEvent.UpdateSaved, false);
    }

    async #translateFiles(
        files: SourceFiles,
        sourceStrings: Record<string, Record<string, string[]>>,
    ): Promise<void> {
        const translationSettings =
            this.#translationSettings.endpoints[
                Number(this.#translationEndpointSelect.value)
            ];

        const glossary = [];

        if (translationSettings.useGlossary) {
            for (const term of this.#glossary) {
                glossary.push({
                    term: term.source,
                    translation: term.translation,
                    note: term.note,
                });
            }
        }

        const result = await translate({
            ...translationSettings,
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
        let translatedCount = 0;

        for (const filename in files) {
            const translatedFile = translatedFiles[filename];
            const sourceFile = files[filename];

            const contentPath = utils.join(
                filename.startsWith("map")
                    ? this.#tempMapsPath
                    : this.#translationPath,
                `${filename}${consts.TXT_EXTENSION}`,
            );

            const newLines: string[] = [];

            for (const id in sourceFile) {
                const translatedBlock = translatedFile[id].strings;
                translatedCount += translatedBlock.length;

                const sourceBlock = sourceFile[id];
                const strings = sourceStrings[filename][id];

                newLines.push(`${consts.ID_COMMENT}${consts.SEPARATOR}${id}`);
                newLines.push(
                    `${consts.NAME_COMMENT}${consts.SEPARATOR}${sourceBlock.name}`,
                );

                let translatedIndex = 0;

                for (let i = 0; i < strings.length; i++) {
                    const string = strings[i];

                    if (string.startsWith(consts.COMMENT_PREFIX)) {
                        newLines.push(string);
                        continue;
                    }

                    const split = utils.parts(string);

                    if (!split) {
                        utils.logSplitError(sourceBlock.name, i + 1);
                        continue;
                    }

                    split[this.#translationColumnIndex] ??= "";

                    for (let j = this.#translationColumnIndex; j >= 0; j--) {
                        split[j] ??= "";
                    }

                    const translation = translatedBlock[translatedIndex++];

                    split[this.#translationColumnIndex] = translation;
                    newLines.push(split.join(consts.SEPARATOR));
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
                translatedCount,
                filename,
            ]);
        }
    }

    async #processFile(
        filename: string,
        files: SourceFiles,
        originalStrings: Record<string, Record<string, string[]>>,
        range: FileRange,
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
        const blocks: Record<string, SourceBlock> = {};
        originalStrings[filename] = {};

        const newLines: string[] = [];
        let lineIdx = 1;

        let currentID: string | null = null;
        let currentName: string | null = null;

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];

            if (line.startsWith(`${consts.ID_COMMENT}${consts.SEPARATOR}`)) {
                currentID = line
                    .slice(`${consts.ID_COMMENT}${consts.SEPARATOR}`.length)
                    .trim();
                currentName = null;

                if (this.#batchAction !== BatchAction.Translate) {
                    newLines.push(line);
                }

                continue;
            }

            if (line.startsWith(`${consts.NAME_COMMENT}${consts.SEPARATOR}`)) {
                currentName = line
                    .slice(`${consts.NAME_COMMENT}${consts.SEPARATOR}`.length)
                    .trim();

                if (this.#batchAction !== BatchAction.Translate) {
                    newLines.push(line);
                } else if (currentID !== null) {
                    blocks[currentID] = { name: currentName, strings: [] };
                    originalStrings[filename][currentID] = [];
                }

                continue;
            }

            if (currentID === null || currentName === null) {
                continue;
            }

            if (this.#batchAction === BatchAction.Translate) {
                originalStrings[filename][currentID].push(line);

                if (line.startsWith("<!-- EVENT NAME")) {
                    blocks[currentID].strings.push(line);
                    continue;
                }

                if (line.startsWith(consts.COMMENT_PREFIX)) {
                    continue;
                }

                const split = utils.parts(line);

                if (!split) {
                    utils.logSplitError(filename, l + 1);
                    continue;
                }

                if (!utils.rangeContains(range, lineIdx++)) {
                    void info(`Skipped index ${lineIdx} in file ${filename}`);
                    continue;
                }

                blocks[currentID].strings.push(
                    line.slice(0, line.indexOf(consts.SEPARATOR)),
                );
            } else {
                if (!line.trim()) {
                    continue;
                }

                if (line.startsWith(consts.COMMENT_PREFIX)) {
                    newLines.push(line);
                    continue;
                }

                const split = utils.parts(line);

                if (!split) {
                    utils.logSplitError(filename, l + 1);
                    newLines.push(line);
                    continue;
                }

                if (!utils.rangeContains(range, lineIdx++)) {
                    void info(`Skipped index ${lineIdx} in file ${filename}`);
                    continue;
                }

                if (split.at(this.#translationColumnIndex) === undefined) {
                    void warn(
                        `Column ${this.#translationColumnIndex} doesn't exist.`,
                    );
                    newLines.push(line);
                    continue;
                }

                const translation = split[this.#translationColumnIndex];
                const translationTrimmed = translation.trim();
                const translationExists = Boolean(translationTrimmed);

                if (!translationExists) {
                    continue;
                }

                const source = utils.source(split);
                const isComment = source.startsWith(consts.COMMENT_PREFIX);

                if (this.#batchAction === BatchAction.Trim) {
                    split[this.#translationColumnIndex] = translationTrimmed;
                    newLines.push(split.join(consts.SEPARATOR));
                } else if (
                    this.#batchAction === BatchAction.Wrap &&
                    !isComment
                ) {
                    const wrapped = this.#wrapText(translation);
                    split[this.#translationColumnIndex] = wrapped;
                    newLines.push(split.join(consts.SEPARATOR));
                }
            }
        }

        if (this.#batchAction === BatchAction.Translate) {
            files[filename] = blocks;
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

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (target === this.#applyButton) {
            await this.process();
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
                this.#translationEndpointSelect.classList.remove("hidden");
            } else {
                this.#contextContainer.classList.add("hidden");
                this.#translationEndpointSelect.classList.add("hidden");
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
}
