import { emit } from "@tauri-apps/api/event";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
    COMMENT_PREFIX,
    COMMENT_SUFFIX_LENGTH,
    MAP_DISPLAY_NAME_COMMENT_PREFIX,
    MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
    SECOND_MS,
    SEPARATOR,
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

    public constructor(
        private readonly settings: Settings,
        private readonly tabInfo: TabInfo,
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
                // @ts-expect-error Fallthrough because of shared behavior
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

                        if (filename === this.tabInfo.currentTab.name) {
                            await emit("change-tab", null);
                        }

                        await sleep(SECOND_MS);

                        await this.#processExternalFile(
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

    async #processExternalFile(
        filename: string,
        index: number,
        wrapLength?: number,
    ) {
        const contentPath = join(
            this.settings.programDataPath,
            filename.startsWith("map")
                ? TEMP_MAPS_DIRECTORY
                : TRANSLATION_DIRECTORY,
            `${filename}${TXT_EXTENSION}`,
        );

        const newLines = await Promise.all(
            (await readTextFile(contentPath)).lines().map(async (line) => {
                const [source, translation] = line.split(SEPARATOR);
                if (!source.trim()) {
                    return;
                }

                const translationTrimmed = translation.trim();
                const translationExists = Boolean(translationTrimmed);
                const isComment = source.startsWith(COMMENT_PREFIX);
                const isMapDisplayNameComment = source.startsWith(
                    MAP_DISPLAY_NAME_COMMENT_PREFIX,
                );

                switch (this.#batchWindowAction) {
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
                        if (!isComment && translationExists && wrapLength) {
                            const wrapped = this.#wrapText(
                                translation.denormalize(),
                                wrapLength,
                            );
                            return `${source}${SEPARATOR}${wrapped.nnormalize()}`;
                        }

                        return line;
                }
            }),
        );

        if (this.#batchWindowAction === BatchAction.Translate) {
            this.tabInfo.translated[index] = this.tabInfo.total[index];
            await emit("update-progress", index);
        }

        await writeTextFile(contentPath, newLines.join("\n"));

        this.#batchWindowBody.children[index].firstElementChild!.classList.add(
            "text-green-500",
        );
        await sleep(SECOND_MS / 2);
    }

    #wrapText(text: string, length: number): string {
        const lines = text.lines();
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
