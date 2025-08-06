import {
    COMMENT_PREFIX,
    COMMENT_SUFFIX_LENGTH,
    MAP_DISPLAY_NAME_COMMENT_PREFIX,
    MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
    NEW_LINE,
    SECOND_MS,
    SEPARATOR,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
} from "../utilities/constants";
import { join, sleep, tw } from "../utilities/functions";
import { invokeTranslateText } from "../utilities/invokes";
import { MainWindowLocalization } from "../utilities/localization";
import { BatchAction } from "./enums";
import { ProjectSettings } from "./projectsettings";
import { Settings } from "./settings";

import { emit } from "@tauri-apps/api/event";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export class BatchWindow {
    #batchButton: HTMLDivElement;

    #batchWindow: HTMLDivElement;
    #batchWindowBody: HTMLDivElement;

    #wrapLimitInput: HTMLInputElement;
    #batchActionSelect: HTMLSelectElement;
    #translationColumnSelect: HTMLSelectElement;

    #wrapLimit = 0;
    #batchAction = BatchAction.None;
    #translationColumnIndex = -1;

    #checkedFiles: HTMLElement[] = [];

    public constructor(
        private readonly ui: MainWindowUI,
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
        private readonly tabInfo: TabInfo,
        localization: MainWindowLocalization,
    ) {
        this.#batchButton = this.ui.batchButton;
        this.#batchWindow = this.ui.batchWindow;

        this.#batchWindowBody = this.#batchWindow.children[1] as HTMLDivElement;

        this.#wrapLimitInput =
            this.#batchWindow.getElementById("wrap-limit-input")!;
        this.#batchActionSelect = this.#batchWindow.getElementById(
            "batch-action-select",
        )!;
        this.#translationColumnSelect = this.#batchWindow.getElementById(
            "translation-column-select",
        )!;

        this.#wrapLimitInput.placeholder = localization.wrapNumber;
        this.#setColumns();
        this.refill();

        this.#batchWindow.addEventListener("click", async (event) => {
            await this.#handleButtonClick(event);
        });

        this.#batchWindow.addEventListener("mousemove", (event) => {
            if (event.buttons === 1) {
                const target = event.target as HTMLElement;

                if (
                    target.classList.contains("checkbox") &&
                    !this.#checkedFiles.includes(target)
                ) {
                    target.textContent = target.textContent ? "" : "check";
                    this.#checkedFiles.push(target);
                }
            }
        });

        this.#batchWindow.addEventListener("mouseup", () => {
            this.#checkedFiles.length = 0;
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
        });

        this.#translationColumnSelect.addEventListener("click", () => {
            this.#setColumns();
        });
    }

    async #handleButtonClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (
            target.classList.contains("checkbox") &&
            !this.#checkedFiles.includes(target)
        ) {
            target.textContent = target.textContent ? "" : "check";
            this.#checkedFiles.push(target);
        }

        switch (target.id) {
            case "select-all-button":
                for (const element of this.#batchWindowBody.children) {
                    element.firstElementChild!.textContent = "check";
                }
                break;
            // @ts-expect-error Fallthrough because of shared behavior
            case "apply-button": {
                this.#batchAction = Number(
                    this.#batchActionSelect.value,
                ) as BatchAction;

                if (this.#batchAction === BatchAction.None) {
                    // TODO: Handle
                }

                this.#translationColumnIndex = Number(
                    this.#translationColumnSelect.value,
                );

                if (this.#translationColumnIndex === 0) {
                    // TODO: handle
                }

                if (this.#batchAction === BatchAction.Wrap) {
                    this.#wrapLimit = Number(this.#wrapLimitInput.value);

                    if (
                        !Number.isFinite(this.#wrapLimit) ||
                        this.#wrapLimit <= 0
                    ) {
                        // TODO: Handle
                    }
                }

                for (const element of this.#batchWindowBody.children) {
                    const checked =
                        element.firstElementChild?.textContent ?? "";

                    if (checked.isEmpty()) {
                        continue;
                    }

                    const filename = element.children[1].textContent;

                    if (filename === this.tabInfo.currentTab.name) {
                        await this.tabInfo.changeTab(null);
                    }

                    await this.#processFile(filename, Number(element.id));
                }

                for (const element of this.#batchWindowBody.children) {
                    element.firstElementChild!.classList.remove(
                        "text-green-500",
                    );
                }

                await emit("saved", false);
            }
            // eslint-disable-next-line no-fallthrough
            case "deselect-all-button":
            case "cancel-button":
                for (const element of this.#batchWindowBody.children) {
                    element.firstElementChild!.textContent = "";
                }

                if (
                    target.id === "cancel-button" ||
                    target.id === "apply-button"
                ) {
                    this.#batchWindow.classList.replace("flex", "hidden");
                }
                break;
        }
    }

    async #processFile(filename: string, index: number) {
        const contentPath = join(
            this.settings.programDataPath,
            filename.startsWith("map")
                ? TEMP_MAPS_DIRECTORY
                : TRANSLATION_DIRECTORY,
            `${filename}${TXT_EXTENSION}`,
        );

        const newLines = await Promise.all(
            (await readTextFile(contentPath)).lines().map(async (line) => {
                if (line.trim().isEmpty()) {
                    return;
                }

                const split = line.parts();

                if (!split) {
                    // TODO: Handle error
                    return;
                }

                const source = split.source();

                if (this.#batchAction === BatchAction.Translate) {
                    // TODO: Set any other unset columns
                    split[this.#translationColumnIndex] ??= "";
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
                } else if (split[this.#translationColumnIndex] === undefined) {
                    return;
                }

                const translation = split[this.#translationColumnIndex];

                const translationTrimmed = translation.trim();
                const translationExists = Boolean(translationTrimmed);
                const isComment = source.startsWith(COMMENT_PREFIX);
                const isMapDisplayNameComment = source.startsWith(
                    MAP_DISPLAY_NAME_COMMENT_PREFIX,
                );

                switch (this.#batchAction) {
                    case BatchAction.Trim:
                        return translationExists
                            ? `${source}${SEPARATOR}${translationTrimmed}`
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
                            return `${source}${SEPARATOR}${wrapped}`;
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

        this.#batchWindowBody.children[index].firstElementChild!.classList.add(
            "text-green-500",
        );

        await sleep(SECOND_MS / 2);
    }

    #wrapText(text: string): string {
        const lines = text.split(NEW_LINE);
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

        return wrappedLines.join(NEW_LINE);
    }

    async #translateLine(text: string, isMapComment: boolean): Promise<string> {
        const textToTranslate = isMapComment
            ? text.slice(
                  MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                  -COMMENT_SUFFIX_LENGTH,
              )
            : text;

        const translation = await invokeTranslateText({
            text: textToTranslate,
            from: this.ui.fromLanguageInput.value.trim(),
            to: this.ui.toLanguageInput.value.trim(),
            normalize: true,
        });

        return `${text}${SEPARATOR}${translation}`;
    }

    public show() {
        this.#batchWindow.style.left = `${this.#batchButton.offsetLeft}px`;
        this.#batchWindow.style.top = `${this.#batchButton.offsetTop + this.#batchButton.clientHeight}px`;
        this.#batchWindow.classList.replace("hidden", "flex");
    }

    public hide() {
        this.#batchWindow.classList.replace("flex", "hidden");
    }

    public isHidden(): boolean {
        return this.#batchWindow.classList.contains("hidden");
    }

    public refill() {
        this.#batchWindowBody.innerHTML = "";

        for (const tab of this.ui.leftPanel.children) {
            const checkboxContainer = document.createElement("div");
            checkboxContainer.className = tw`flex flex-row items-center gap-1 p-0.5`;
            checkboxContainer.id = tab.id;

            const checkbox = document.createElement("span");
            checkbox.className = tw`checkbox borderPrimary max-h-6 min-h-6 max-w-6 min-w-6`;
            checkboxContainer.appendChild(checkbox);

            const checkboxLabel = document.createElement("span");
            checkboxLabel.className = tw`textSecond text-base`;
            checkboxLabel.textContent = tab.firstElementChild!.textContent;
            checkboxContainer.appendChild(checkboxLabel);

            this.#batchWindowBody.appendChild(checkboxContainer);
        }
    }

    #setColumns() {
        this.#translationColumnSelect.innerHTML =
            this.#translationColumnSelect.firstElementChild!.outerHTML;

        for (const [i, [name]] of this.projectSettings.columns
            .slice(2)
            .entries()) {
            const columnOption = document.createElement("option");
            columnOption.value = (i + 2).toString();
            columnOption.textContent = name;
            this.#translationColumnSelect.appendChild(columnOption);
        }
    }
}
