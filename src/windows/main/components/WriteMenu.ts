import { ProjectSettings, Settings } from "@lib/classes";
import { write } from "@utils/invokes";

import { t } from "@lingui/core/macro";
import * as utils from "@utils/functions";

import { open } from "@tauri-apps/plugin-dialog";
import { error } from "@tauri-apps/plugin-log";

export class WriteMenu {
    #writeButton: HTMLButtonElement;
    #writeMenu: HTMLDivElement;

    #selectOutputPathButton: HTMLButtonElement;
    #outputPathInput: HTMLInputElement;

    #disableMapProcessingCheckbox: HTMLSpanElement;
    #disableOtherProcessingCheckbox: HTMLSpanElement;
    #disableSystemProcessingCheckbox: HTMLSpanElement;
    #disablePluginProcessingCheckbox: HTMLSpanElement;

    public constructor(
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
        private readonly gameTitleInput: HTMLInputElement,
    ) {
        this.#writeButton = document.getElementById(
            "write-button",
        ) as HTMLButtonElement;
        this.#writeMenu = document.getElementById(
            "write-menu",
        ) as HTMLDivElement;

        this.#writeMenu.addEventListener("click", async (event) => {
            await this.#handleClick(event);
        });
        this.#selectOutputPathButton = this.#writeMenu.querySelector(
            "#select-output-path-button",
        )!;
        this.#outputPathInput =
            this.#writeMenu.querySelector("#output-path-input")!;

        this.#disableMapProcessingCheckbox = this.#writeMenu.querySelector(
            "#disable-map-processing-checkbox",
        )!;
        this.#disableOtherProcessingCheckbox = this.#writeMenu.querySelector(
            "#disable-other-processing-checkbox",
        )!;
        this.#disableSystemProcessingCheckbox = this.#writeMenu.querySelector(
            "#disable-system-processing-checkbox",
        )!;
        this.#disablePluginProcessingCheckbox = this.#writeMenu.querySelector(
            "#disable-plugin-processing-checkbox",
        )!;
    }

    async #handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (target === this.#selectOutputPathButton) {
            const directory = (await open({
                directory: true,
                multiple: false,
            }))!;

            if (directory) {
                this.#outputPathInput.value = directory;
            }
        } else if (target?.id === "apply-button") {
            if (
                !this.settings.project ||
                !this.projectSettings.sourceDirectory
            ) {
                if (!this.projectSettings.sourceDirectory) {
                    alert(
                        t`Game files do not exist (no original or data directories), so it's only possible to edit and save translation.`,
                    );
                }
                return;
            }

            this.hide();
            this.#writeButton.firstElementChild!.classList.add("animate-spin");

            await write({
                sourcePath: this.projectSettings.sourcePath,
                translationPath: this.projectSettings.translationPath,
                outputPath: this.#outputPathInput.value,
                engineType: this.projectSettings.engineType,
                duplicateMode: this.projectSettings.duplicateMode,
                gameTitle: this.gameTitleInput.value,
                romanize: this.projectSettings.romanize,
                disableCustomProcessing:
                    this.projectSettings.disableCustomProcessing,
                disableProcessing: utils.getFileFlags(this.#writeMenu),
                trim: this.projectSettings.trim,
            })
                .then((executionTime: string) => {
                    this.#writeButton.firstElementChild!.classList.remove(
                        "animate-spin",
                    );
                    alert(
                        t`All files were written successfully.\nElapsed: ${executionTime}`,
                    );
                })
                .catch(error);
        }
    }

    public hide() {
        this.#writeMenu.classList.replace("flex", "hidden");
    }

    public show() {
        utils.toggleMultiple(this.#writeMenu, "hidden", "flex");

        if (this.#writeMenu.classList.contains("hidden")) {
            return;
        }
        requestAnimationFrame(() => {
            this.#writeMenu.style.left = `${this.#writeButton.offsetLeft}px`;
            this.#writeMenu.style.top = `${this.#writeButton.offsetTop + this.#writeButton.clientHeight}px`;
        });

        this.#outputPathInput.value = this.projectSettings.programDataPath;
        this.#disableMapProcessingCheckbox.innerHTML =
            this.#disableOtherProcessingCheckbox.innerHTML =
            this.#disableSystemProcessingCheckbox.innerHTML =
            this.#disablePluginProcessingCheckbox.innerHTML =
                "";
    }
}
