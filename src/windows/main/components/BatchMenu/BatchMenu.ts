import { emittery } from "@classes/emittery";
import { BatchAction } from "@enums/BatchAction";
import { ProjectSettings } from "@lib/classes";
import { AppEvent } from "@lib/enums";
import { translate } from "@utils/invokes";
import { Component } from "../Component";
import { wrapText } from "./internal";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

import { message } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { warn } from "@tauri-apps/plugin-log";

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

    #wrapLimit = 0;
    #batchAction = BatchAction.None;
    #translationColumnIndex = -1;

    readonly #changedCheckboxes = new Set<HTMLInputElement>();

    #sourceLanguage = "";
    #translationLanguage = "";

    #tempMapsPath = "";
    #translationPath = "";

    #tabInfo!: TabInfo;

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
    }

    public override get children(): HTMLCollectionOf<HTMLDivElement> {
        return this.#body.children as HTMLCollectionOf<HTMLDivElement>;
    }

    public set sourceLanguage(language: string) {
        this.#sourceLanguage = language;
    }

    public set translationLanguage(language: string) {
        this.#translationLanguage = language;
    }

    public init(
        tabInfo: TabInfo,
        projectSettings: ProjectSettings,
        tabs: HTMLCollectionOf<HTMLButtonElement>,
    ): void {
        this.#tabInfo = tabInfo;
        this.#body.innerHTML = "";

        for (const tab of tabs) {
            const checkboxContainer = document.createElement("div");
            checkboxContainer.className = tw`checkbox-container`;
            checkboxContainer.id = tab.id;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = tw`border-primary max-h-6 min-h-6 max-w-6 min-w-6`;
            checkboxContainer.appendChild(checkbox);

            const checkboxLabel = document.createElement("label");
            checkboxLabel.className = tw`text-second text-base`;
            checkboxLabel.textContent = tab.firstElementChild!.textContent;
            checkboxContainer.appendChild(checkboxLabel);

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
            this.#translationColumnSelect.appendChild(option);
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
            this.#translationColumnSelect.appendChild(option);
        }
    }

    async #processFile(filename: string): Promise<void> {
        const contentPath = utils.join(
            filename.startsWith("map")
                ? this.#tempMapsPath
                : this.#translationPath,
            `${filename}${consts.TXT_EXTENSION}`,
        );

        const lines = utils.lines(await readTextFile(contentPath));
        const newLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!line.trim()) {
                continue;
            }

            const split = utils.parts(line);

            if (!split) {
                utils.logSplitError(filename, i + 1);
                newLines.push(line);
                continue;
            }

            const source = utils.source(split);

            if (this.#batchAction === BatchAction.Translate) {
                split[this.#translationColumnIndex] ??= "";

                for (let j = this.#translationColumnIndex; j >= 0; j--) {
                    split[j] ??= "";
                }
            } else if (
                (split[this.#translationColumnIndex] as string | undefined) ===
                undefined
            ) {
                await warn(
                    `Column ${this.#translationColumnIndex} doesn't exist.`,
                );
                newLines.push(line);
                continue;
            }

            const translation = split[this.#translationColumnIndex];
            const translationTrimmed = translation.trim();
            const translationExists = Boolean(translationTrimmed);
            const isComment = source.startsWith(consts.COMMENT_PREFIX);
            const isMapComment = source.startsWith(
                consts.MAP_DISPLAY_NAME_COMMENT_PREFIX,
            );

            if (this.#batchAction === BatchAction.Trim && translationExists) {
                newLines.push(
                    `${source}${consts.SEPARATOR}${translationTrimmed}`,
                );
                continue;
            } else if (
                this.#batchAction === BatchAction.Translate &&
                (isMapComment || !isComment) &&
                !translationExists
            ) {
                newLines.push(await this.#translateLine(source, isMapComment));
                continue;
            } else if (
                this.#batchAction === BatchAction.Wrap &&
                !isComment &&
                translationExists
            ) {
                const wrapped = this.#wrapText(translation);
                newLines.push(`${source}${consts.SEPARATOR}${wrapped}`);
                continue;
            }

            newLines.push(line);
        }

        if (this.#batchAction === BatchAction.Translate) {
            await emittery.emit(AppEvent.UpdateTranslatedLineCount, [
                undefined,
                filename,
            ]);
        }

        await writeTextFile(contentPath, newLines.join("\n"));
    }

    #wrapText(text: string): string {
        /*@__INLINE__*/
        return wrapText(text, this.#wrapLimit);
    }

    async #translateLine(text: string, isMapComment: boolean): Promise<string> {
        const source = isMapComment
            ? text.slice(
                  consts.MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                  -consts.COMMENT_SUFFIX_LENGTH,
              )
            : text;

        const translation = await translate({
            text: source,
            from: this.#sourceLanguage,
            to: this.#translationLanguage,
            normalize: true,
        });

        return `${text}${consts.SEPARATOR}${translation}`;
    }

    #onmouseup(): void {
        this.#changedCheckboxes.clear();
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target instanceof HTMLInputElement) {
            this.#changedCheckboxes.add(target);
            return;
        }

        switch (target) {
            case this.#selectAllButton:
                for (const element of this.children) {
                    (element.firstElementChild as HTMLInputElement).checked =
                        false;
                }
                break;
            case this.#applyButton: {
                this.#batchAction = Number(
                    this.#batchActionSelect.value,
                ) as BatchAction;

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

                this.#wrapLimit = this.#wrapLimitInput.valueAsNumber;

                if (
                    this.#batchAction === BatchAction.Wrap &&
                    this.#wrapLimit <= 0
                ) {
                    this.#wrapLimitInput.classList.add(
                        "outline-2",
                        "outline-red-600",
                    );
                    return;
                }

                if (
                    this.#batchAction === BatchAction.Translate &&
                    (!this.#sourceLanguage || !this.#translationLanguage)
                ) {
                    await message(
                        t`Translation languages are not set. Input them to the fields above.`,
                    );
                    return;
                }

                for (const container of this.#body.children) {
                    (
                        container.lastElementChild as HTMLLabelElement
                    ).style.setProperty("--checkbox-bg", "#666");
                }

                for (const container of this.#body.children) {
                    const checkbox =
                        container.firstElementChild as HTMLInputElement;

                    if (!checkbox.checked) {
                        continue;
                    }

                    const label =
                        container.lastElementChild as HTMLLabelElement;
                    const filename = label.textContent;

                    if (filename === this.#tabInfo.tabName) {
                        await emittery.emit(AppEvent.ChangeTab, null);
                    }

                    await this.#processFile(filename);
                    label.style.setProperty("--checkbox-bg", "#0DAC50");
                }

                await emittery.emit(AppEvent.UpdateSaved, false);
                break;
            }
            case this.#deselectAllButton:
            case this.#cancelButton:
                for (const element of this.#body.children) {
                    (element.firstElementChild! as HTMLInputElement).checked =
                        false;
                }

                if (target === this.#cancelButton) {
                    this.hide();
                }
                break;
        }
    }

    #onchange(event: Event): void {
        if (event.target === this.#batchActionSelect) {
            const batchAction = Number(
                this.#batchActionSelect.value,
            ) as BatchAction;

            if (batchAction === BatchAction.Wrap) {
                this.#wrapLimitInput.classList.remove("hidden");
            } else {
                this.#wrapLimitInput.classList.add("hidden");
            }

            this.#batchActionSelect.classList.remove(
                "outline-2",
                "outline-red-600",
            );
        } else if (event.target === this.#translationColumnSelect) {
            this.#translationColumnSelect.classList.remove(
                "outline-2",
                "outline-red-600",
            );
        }
    }

    #onmousemove(event: MouseEvent): void {
        if (event.buttons === 1) {
            const target = event.target as HTMLInputElement | null;

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
}
