import { emit } from "@tauri-apps/api/event";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
    COMMENT_PREFIX,
    COMMENT_SUFFIX_LENGTH,
    LINES_SEPARATOR,
    MAP_DISPLAY_NAME_COMMENT_PREFIX,
    MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
    NEW_LINE,
    SECOND_MS,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
} from "../utilities/constants";
import { join, sleep } from "../utilities/functions";
import { invokeTranslateText } from "../utilities/invokes";
import { BatchAction } from "./enums";
import { Settings } from "./settings";

export class BatchWindow {
    #batchWindowAction?: BatchAction;
    #batchWindow = document.getElementById("batch-window") as HTMLDivElement;
    #translateToolsMenuButton = document.getElementById(
        "translate-tools-menu-button",
    )!;
    #batchWindowBody = this.#batchWindow.children[1];
    #batchWindowFooter = this.#batchWindow.children[2];
    #checkedFiles: HTMLElement[] = [];

    constructor(
        private readonly settings: Settings,
        private readonly currentTab: CurrentTab,
        private readonly ui: MainWindowUI,
    ) {
        this.#batchWindow.addEventListener("mouseup", () => {
            this.#checkedFiles.length = 0;
        });

        this.#batchWindow.addEventListener("click", async (event) => {
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
                case "apply-button": {
                    const wrapLength = Number.parseInt(
                        (
                            this.#batchWindowFooter.firstElementChild!
                                .firstElementChild! as HTMLInputElement
                        ).value,
                    );

                    for (const element of this.#batchWindowBody.children) {
                        const checked = element.firstElementChild?.textContent;
                        if (!checked) {
                            continue;
                        }

                        const filename = element.children[1].textContent!;

                        if (filename === this.currentTab.name) {
                            await emit("change-tab", null);
                        }

                        await sleep(SECOND_MS);

                        await this.processExternalFile(
                            filename,
                            Number.parseInt(element.id),
                            wrapLength,
                        );
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
    }

    public show(batchWindowAction: BatchAction) {
        const { x: xPos, y: yPos } =
            this.#translateToolsMenuButton.getBoundingClientRect();
        this.#batchWindow.style.left = `${xPos + this.#translateToolsMenuButton.clientWidth}px`;
        this.#batchWindow.style.top = `${yPos}px`;

        this.#batchWindowAction = batchWindowAction;

        this.#batchWindowFooter.firstElementChild!.classList.toggle(
            "hidden",
            this.#batchWindowAction !== BatchAction.Wrap,
        );
        this.#batchWindow.classList.replace("hidden", "flex");
    }

    public async processExternalFile(
        filename: string,
        index: number,
        wrapLength?: number,
    ) {
        const contentPath = join(
            this.settings.programDataPath,
            filename.startsWith("maps")
                ? TEMP_MAPS_DIRECTORY
                : TRANSLATION_DIRECTORY,
            `${filename}${TXT_EXTENSION}`,
        );

        const newLines = await Promise.all(
            (await readTextFile(contentPath)).split("\n").map(async (line) => {
                const [originalText, translationText] =
                    line.split(LINES_SEPARATOR);
                if (!originalText.trim()) {
                    return;
                }

                const translationTrimmed = translationText.trim();
                const translationExists = Boolean(translationTrimmed);
                const isComment = originalText.startsWith(COMMENT_PREFIX);
                const isMapDisplayNameComment = originalText.startsWith(
                    MAP_DISPLAY_NAME_COMMENT_PREFIX,
                );

                switch (this.#batchWindowAction) {
                    case BatchAction.Trim:
                        return translationExists
                            ? `${originalText}${LINES_SEPARATOR}${translationTrimmed}`
                            : line;
                    case BatchAction.Translate:
                        if (
                            (isMapDisplayNameComment || !isComment) &&
                            !translationExists
                        ) {
                            return await this.translateLine(
                                originalText,
                                isMapDisplayNameComment,
                            );
                        }

                        return line;
                    case BatchAction.Wrap:
                        if (!isComment && translationExists && wrapLength) {
                            const wrapped = this.wrapText(
                                translationText.replaceAll(NEW_LINE, "\n"),
                                wrapLength,
                            );
                            return `${originalText}${LINES_SEPARATOR}${wrapped.replaceAll("\n", NEW_LINE)}`;
                        }

                        return line;
                    default:
                        break;
                }
            }),
        );

        if (this.#batchWindowAction === BatchAction.Translate) {
            await this.updateTranslationProgress(index, newLines.length);
        }

        await writeTextFile(contentPath, newLines.join("\n"));

        this.#batchWindowBody.children[index].firstElementChild!.classList.add(
            "text-green-500",
        );
        await sleep(SECOND_MS / 2);
    }

    private wrapText(text: string, length: number): string {
        const lines = text.split("\n");
        const remainder: string[] = [];
        const wrappedLines: string[] = [];

        for (let line of lines) {
            if (remainder.length) {
                // eslint-disable-next-line sonarjs/updated-loop-counter
                line = `${remainder.join(" ")} ${line}`;
                remainder.length = 0;
            }

            if (line.length > length) {
                const words = line.split(" ");

                while (line.length > length && words.length > 0) {
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

        return wrappedLines.join("\n");
    }

    private async translateLine(
        text: string,
        isMapComment: boolean,
    ): Promise<string> {
        const textToTranslate = isMapComment
            ? text.slice(
                  MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                  -COMMENT_SUFFIX_LENGTH,
              )
            : text;

        const translated = await invokeTranslateText({
            text: textToTranslate,
            from: this.ui.fromLanguageInput.value.trim(),
            to: this.ui.toLanguageInput.value.trim(),
            replace: true,
        });

        return `${text}${LINES_SEPARATOR}${translated}`;
    }

    private async updateTranslationProgress(index: number, lineCount: number) {
        await emit("update-progress", [index, lineCount]);
    }

    public hide() {
        this.#batchWindow.classList.replace("flex", "hidden");
    }

    public isHidden(): boolean {
        return this.#batchWindow.classList.contains("hidden");
    }

    public addCheckbox(checkbox: HTMLDivElement) {
        this.#batchWindowBody.appendChild(checkbox);
    }

    public clear() {
        this.#batchWindowBody.innerHTML = "";
    }
}
