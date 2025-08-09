import { ProjectSettings } from "@classes/ProjectSettings";
import { Saver } from "@classes/Saver";
import { BatchAction } from "@enums/BatchAction";
import { translate } from "@utils/invokes";
import { MainWindowUI } from "@windows/main/MainWindow";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import * as _ from "radashi";

import { t } from "@lingui/core/macro";

import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export class BatchMenu {
    #batchButton: HTMLDivElement;

    #batchMenu: HTMLDivElement;
    #batchMenuBody: HTMLDivElement;

    #wrapLimitInput: HTMLInputElement;
    #batchActionSelect: HTMLSelectElement;
    #translationColumnSelect: HTMLSelectElement;

    #wrapLimit = 0;
    #batchAction = BatchAction.None;
    #translationColumnIndex = -1;

    #checkedFiles = new Set<HTMLElement>();

    public constructor(
        private readonly ui: MainWindowUI,
        private readonly projectSettings: ProjectSettings,
        private readonly tabInfo: TabInfo,
        private readonly saver: Saver,
        tabs: HTMLCollectionOf<HTMLDivElement>,
    ) {
        this.#batchButton = document.getElementById(
            "batch-button",
        ) as HTMLDivElement;
        this.#batchMenu = document.getElementById(
            "batch-menu",
        ) as HTMLDivElement;

        this.#batchMenuBody = this.#batchMenu.children[1] as HTMLDivElement;

        this.#wrapLimitInput =
            this.#batchMenu.querySelector("#wrap-limit-input")!;
        this.#batchActionSelect = this.#batchMenu.querySelector(
            "#batch-action-select",
        )!;
        this.#translationColumnSelect = this.#batchMenu.querySelector(
            "#translation-column-select",
        )!;

        this.#wrapLimitInput.placeholder = t`Line length for wrapping`;
        this.#fetchColumns();
        this.refill(tabs);

        this.#batchMenu.addEventListener(
            "click",
            async (event) => {
                await this.#handleButtonClick(event);
            },
            true,
        );

        this.#batchMenu.addEventListener("mousemove", (event) => {
            if (event.buttons === 1) {
                const target = event.target as HTMLElement;

                if (target.classList.contains("checkbox")) {
                    if (!this.#checkedFiles.has(target)) {
                        target.textContent = target.textContent ? "" : "check";
                        this.#checkedFiles.add(target);
                    } else {
                        this.#checkedFiles.delete(target);
                    }
                }
            }
        });

        this.#batchActionSelect.addEventListener("change", () => {
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
        });

        this.#translationColumnSelect.addEventListener("click", () => {
            this.#fetchColumns();
        });

        this.#translationColumnSelect.addEventListener("select", () => {
            this.#translationColumnSelect.classList.remove(
                "outline-2",
                "outline-red-600",
            );
        });
    }

    async #handleButtonClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.classList.contains("checkbox")) {
            if (!this.#checkedFiles.has(target)) {
                target.textContent = target.textContent ? "" : "check";
                this.#checkedFiles.add(target);
            } else {
                this.#checkedFiles.delete(target);
            }
        }

        switch (target.id) {
            case "select-all-button":
                for (const element of this.#batchMenuBody.children) {
                    element.firstElementChild!.textContent = "check";
                }
                break;
            case "apply-button": {
                if (_.isEmpty(this.#checkedFiles)) {
                    return;
                }

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

                for (const element of this.#batchMenuBody.children) {
                    element.firstElementChild!.classList.remove(
                        "text-green-500",
                    );
                }

                for (const checkbox of this.#checkedFiles) {
                    const container = checkbox.parentElement!;
                    const filename = container.lastElementChild!.textContent;

                    if (filename === this.tabInfo.currentTab.name) {
                        await this.tabInfo.changeTab(null);
                    }

                    const index = Number(container.id);
                    await this.#processFile(filename, index);

                    checkbox.classList.add("text-green-500");
                }

                this.saver.saved = false;
                break;
            }
            case "deselect-all-button":
            case "cancel-button":
                for (const element of this.#batchMenuBody.children) {
                    element.firstElementChild!.textContent = "";
                }

                if (target.id === "cancel-button") {
                    this.#batchMenu.classList.replace("flex", "hidden");
                }
                break;
        }
    }

    async #processFile(filename: string, index: number) {
        const contentPath = utils.join(
            filename.startsWith("map")
                ? this.projectSettings.tempMapsPath
                : this.projectSettings.translationPath,
            `${filename}${consts.TXT_EXTENSION}`,
        );

        const newLines = await Promise.all(
            utils
                .lines(await readTextFile(contentPath))
                .map(async (line, i) => {
                    if (_.isEmpty(line.trim())) {
                        return;
                    }

                    const split = utils.parts(line);

                    if (!split) {
                        utils.logSplitError(filename, i + 1);
                        return;
                    }

                    const source = utils.source(split);

                    if (this.#batchAction === BatchAction.Translate) {
                        split[this.#translationColumnIndex] ??= "";

                        for (
                            let i = this.#translationColumnIndex;
                            i >= 0;
                            i--
                        ) {
                            split[i] ??= "";
                        }
                    } else if (
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
                        split[this.#translationColumnIndex] === undefined
                    ) {
                        return;
                    }

                    const translation = split[this.#translationColumnIndex];

                    const translationTrimmed = translation.trim();
                    const translationExists = Boolean(translationTrimmed);
                    const isComment = source.startsWith(consts.COMMENT_PREFIX);
                    const isMapDisplayNameComment = source.startsWith(
                        consts.MAP_DISPLAY_NAME_COMMENT_PREFIX,
                    );

                    switch (this.#batchAction) {
                        case BatchAction.Trim:
                            return translationExists
                                ? `${source}${consts.SEPARATOR}${translationTrimmed}`
                                : line;
                        case BatchAction.Translate:
                            if (
                                (isMapDisplayNameComment || !isComment) &&
                                !translationExists
                            ) {
                                return await this.#translateLine(
                                    source,
                                    isMapDisplayNameComment,
                                );
                            }

                            return line;
                        case BatchAction.Wrap:
                            if (!isComment && translationExists) {
                                const wrapped = this.#wrapText(translation);
                                return `${source}${consts.SEPARATOR}${wrapped}`;
                            }

                            return line;
                    }

                    return line;
                }),
        );

        if (this.#batchAction === BatchAction.Translate) {
            this.tabInfo.translated[index] = this.tabInfo.total[index];
            this.tabInfo.updateTabProgress(index);
        }

        await writeTextFile(contentPath, newLines.join("\n"));
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

                while (line.length > this.#wrapLimit && words.length > 0) {
                    remainder.unshift(words.pop()!);
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

    async #translateLine(text: string, isMapComment: boolean): Promise<string> {
        const textToTranslate = isMapComment
            ? text.slice(
                  consts.MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                  -consts.COMMENT_SUFFIX_LENGTH,
              )
            : text;

        const translation = await translate({
            text: textToTranslate,
            from: this.ui.fromLanguageInput.value.trim(),
            to: this.ui.toLanguageInput.value.trim(),
            normalize: true,
        });

        return `${text}${consts.SEPARATOR}${translation}`;
    }

    public show() {
        this.#batchMenu.style.left = `${this.#batchButton.offsetLeft}px`;
        this.#batchMenu.style.top = `${this.#batchButton.offsetTop + this.#batchButton.clientHeight}px`;
        this.#batchMenu.classList.replace("hidden", "flex");
    }

    public hide() {
        this.#batchMenu.classList.replace("flex", "hidden");
    }

    public isHidden(): boolean {
        return this.#batchMenu.classList.contains("hidden");
    }

    public refill(tabs: HTMLCollectionOf<HTMLDivElement>) {
        this.#batchMenuBody.innerHTML = "";

        for (const tab of tabs) {
            const checkboxContainer = document.createElement("div");
            checkboxContainer.className = utils.tw`flex flex-row items-center gap-1 p-0.5`;
            checkboxContainer.id = tab.id;

            const checkbox = document.createElement("span");
            checkbox.className = utils.tw`checkbox border-primary max-h-6 min-h-6 max-w-6 min-w-6`;
            checkboxContainer.appendChild(checkbox);

            const checkboxLabel = document.createElement("span");
            checkboxLabel.className = utils.tw`textSecond text-base`;
            checkboxLabel.textContent = tab.firstElementChild!.textContent;
            checkboxContainer.appendChild(checkboxLabel);

            this.#batchMenuBody.appendChild(checkboxContainer);
        }
    }

    #fetchColumns() {
        const currentColumns = this.projectSettings.columns.slice(2);

        for (let i = 0; i < currentColumns.length; i++) {
            const child = this.#translationColumnSelect.children[i + 1] as
                | HTMLOptionElement
                | undefined;

            const columnIndex = i + 2;

            if (child === undefined) {
                const columnOption = document.createElement("option");
                columnOption.value = columnIndex.toString();
                columnOption.textContent = `${currentColumns[i][0]} (${columnIndex})`;
                this.#translationColumnSelect.appendChild(columnOption);
                continue;
            }

            if (!child.textContent.startsWith(currentColumns[i][0])) {
                child.textContent = `${currentColumns[i][0]} (${columnIndex})`;
            }
        }

        while (
            this.#translationColumnSelect.childElementCount - 1 >
            currentColumns.length
        ) {
            this.#translationColumnSelect.lastElementChild!.remove();
        }
    }
}
