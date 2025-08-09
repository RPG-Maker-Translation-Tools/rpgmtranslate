import { ProjectSettings, Saver, Settings } from "@lib/classes";
import { ReadMode } from "@lib/enums";
import { read } from "@utils/invokes";

import { t } from "@lingui/core/macro";
import * as utils from "@utils/functions";

import { writeTextFile } from "@tauri-apps/plugin-fs";

export class ReadMenu {
    #readButton: HTMLButtonElement;

    #readMenu: HTMLDivElement;
    #readModeSelect: HTMLSelectElement;
    #readModeDescription: HTMLSpanElement;
    #duplicateModeSelect: HTMLSelectElement;
    #romanizeCheckbox: HTMLSpanElement;
    #disableCustomProcessingCheckbox: HTMLSpanElement;
    #ignoreCheckbox: HTMLSpanElement;
    #trimCheckbox: HTMLSpanElement;
    #applyReadButton: HTMLButtonElement;

    public constructor(
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
        private readonly saver: Saver,
        private readonly reload: (save: boolean) => Promise<void>,
    ) {
        this.#readButton = document.getElementById(
            "read-button",
        ) as HTMLButtonElement;
        this.#readMenu = document.getElementById("read-menu") as HTMLDivElement;
        this.#readModeSelect =
            this.#readMenu.querySelector("#read-mode-select")!;
        this.#readModeDescription =
            this.#readMenu.querySelector("#mode-description")!;
        this.#duplicateModeSelect = this.#readMenu.querySelector(
            "#duplicate-mode-select",
        )!;
        this.#romanizeCheckbox =
            this.#readMenu.querySelector("#romanize-checkbox")!;
        this.#disableCustomProcessingCheckbox = this.#readMenu.querySelector(
            "#custom-processing-checkbox",
        )!;
        this.#ignoreCheckbox =
            this.#readMenu.querySelector("#ignore-checkbox")!;
        this.#trimCheckbox = this.#readMenu.querySelector("#trim-checkbox")!;
        this.#applyReadButton = this.#readMenu.querySelector("#apply-button")!;

        this.#trimCheckbox.textContent = projectSettings.trim ? "check" : "";
        this.#romanizeCheckbox.textContent = projectSettings.romanize
            ? "check"
            : "";
        this.#disableCustomProcessingCheckbox.textContent =
            projectSettings.disableCustomProcessing ? "check" : "";
        this.#duplicateModeSelect.value =
            projectSettings.duplicateMode.toString();

        this.#readMenu.addEventListener("click", async (event) => {
            await this.#handleClick(event);
        });
    }
    async #handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case this.#readModeSelect.id:
                switch (this.#readModeSelect.value) {
                    case "0":
                        this.#readModeDescription.innerHTML = t`In case, when the game text you've parsed updates, or the GUI update, it makes sense to re-read files in this mode, to append new text to existing translation without overwriting the progress. Before reading ensure you've saved the translation!`;
                        this.#duplicateModeSelect.value =
                            this.projectSettings.duplicateMode.toString();
                        this.#trimCheckbox.innerHTML = this.projectSettings.trim
                            ? "check"
                            : "";
                        this.#romanizeCheckbox.innerHTML = this.projectSettings
                            .romanize
                            ? "check"
                            : "";
                        this.#disableCustomProcessingCheckbox.innerHTML = this
                            .projectSettings.disableCustomProcessing
                            ? "check"
                            : "";

                        this.#duplicateModeSelect.disabled = true;
                        break;
                    case "1":
                        this.#readModeDescription.innerHTML = t`Forcefully rewrites translation files. Use, only if you need to completely re-read files using certain settings.`;

                        this.#duplicateModeSelect.disabled = false;
                        this.#duplicateModeSelect.value = "0";
                        this.#trimCheckbox.innerHTML = "";
                        this.#romanizeCheckbox.innerHTML = "";
                        this.#disableCustomProcessingCheckbox.innerHTML = "";
                        break;
                }
                break;
            case this.#applyReadButton.id: {
                this.#readButton.firstElementChild!.classList.add(
                    "animate-spin",
                );

                const readMode = this.readMode();

                const duplicateMode = Number(this.#duplicateModeSelect.value);
                const romanize = Boolean(this.#romanizeCheckbox.textContent);
                const disableCustomProcessing = Boolean(
                    this.#disableCustomProcessingCheckbox.textContent,
                );
                const trim = Boolean(this.#trimCheckbox.textContent);

                if (readMode === ReadMode.Force) {
                    const metadata = {
                        disableCustomProcessing,
                        trim,
                        duplicateMode,
                        romanize,
                    };

                    Object.assign(this.projectSettings, metadata);

                    await writeTextFile(
                        utils.join(
                            this.projectSettings.translationPath,
                            ".rvpacker-metadata",
                        ),
                        JSON.stringify(metadata),
                    );
                } else {
                    await this.saver.saveAll();
                }

                await read({
                    projectPath: this.settings.project,
                    sourcePath: this.projectSettings.sourcePath,
                    translationPath: this.projectSettings.translationPath,
                    engineType: this.projectSettings.engineType,
                    readMode,
                    duplicateMode,
                    romanize,
                    disableCustomProcessing,
                    disableProcessing: utils.getFileFlags(this.#readMenu),
                    ignore: Boolean(this.#ignoreCheckbox.textContent),
                    trim,
                });

                await this.reload(false);
                break;
            }
        }
    }

    public toggle() {
        utils.toggleMultiple(this.#readMenu, "hidden", "flex");

        if (this.#readMenu.classList.contains("hidden")) {
            return;
        }

        requestAnimationFrame(() => {
            this.#readMenu.style.left = `${this.#readButton.offsetLeft}px`;
            this.#readMenu.style.top = `${this.#readButton.offsetTop + this.#readButton.clientHeight}px`;
        });
    }

    public readMode(): ReadMode {
        return Number(this.#readModeSelect.value) as ReadMode;
    }

    public contains(node: Node): boolean {
        return this.#readMenu.contains(node);
    }
}
