import { emittery } from "@classes/emittery";
import { ProjectSettings } from "@lib/classes";
import { AppEvent, ReadMode } from "@lib/enums";
import { getFileFlags } from "@utils/functions";
import { Component } from "./Component";

import { t } from "@lingui/core/macro";

export class ReadMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #readModeSelect: HTMLSelectElement;
    readonly #readModeDescription: HTMLSpanElement;
    readonly #duplicateModeSelect: HTMLSelectElement;
    readonly #romanizeCheckbox: HTMLInputElement;
    readonly #disableCustomProcessingCheckbox: HTMLInputElement;
    readonly #ignoreCheckbox: HTMLInputElement;
    readonly #trimCheckbox: HTMLInputElement;
    readonly #applyReadButton: HTMLButtonElement;

    #projectSettings!: ProjectSettings;

    public constructor() {
        super("read-menu");

        this.#readModeSelect = this.element.querySelector("#read-mode-select")!;
        this.#readModeDescription =
            this.element.querySelector("#mode-description")!;
        this.#duplicateModeSelect = this.element.querySelector(
            "#duplicate-mode-select",
        )!;
        this.#romanizeCheckbox =
            this.element.querySelector("#romanize-checkbox")!;
        this.#disableCustomProcessingCheckbox = this.element.querySelector(
            "#custom-processing-checkbox",
        )!;
        this.#ignoreCheckbox = this.element.querySelector("#ignore-checkbox")!;
        this.#trimCheckbox = this.element.querySelector("#trim-checkbox")!;
        this.#applyReadButton = this.element.querySelector("#apply-button")!;

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
        this.#trimCheckbox.checked = projectSettings.trim;
        this.#romanizeCheckbox.checked = projectSettings.romanize;
        this.#disableCustomProcessingCheckbox.checked =
            projectSettings.disableCustomProcessing;
        this.#duplicateModeSelect.value =
            projectSettings.duplicateMode.toString();
    }

    public readMode(): ReadMode {
        return Number(this.#readModeSelect.value) as ReadMode;
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target) {
            case this.#readModeSelect:
                switch (Number(this.#readModeSelect.value) as ReadMode) {
                    case ReadMode.Append:
                        this.#readModeDescription.innerHTML = t`Appends any new text from the game to the translation files, if the text is not already present. Unused lines are removed from translation files, and the lines order is sorted.`;
                        this.#duplicateModeSelect.value =
                            this.#projectSettings.duplicateMode.toString();
                        this.#trimCheckbox.checked = this.#projectSettings.trim;
                        this.#romanizeCheckbox.checked =
                            this.#projectSettings.romanize;
                        this.#disableCustomProcessingCheckbox.checked =
                            this.#projectSettings.disableCustomProcessing;

                        this.#trimCheckbox.disabled =
                            this.#romanizeCheckbox.disabled =
                            this.#disableCustomProcessingCheckbox.disabled =
                            this.#duplicateModeSelect.disabled =
                                true;
                        break;
                    case ReadMode.Force:
                        this.#readModeDescription.innerHTML = t`Force rewrites existing translation files.`;

                        this.#duplicateModeSelect.value = "0";
                        this.#duplicateModeSelect.disabled = false;
                        this.#trimCheckbox.checked = false;
                        this.#romanizeCheckbox.checked = false;
                        this.#disableCustomProcessingCheckbox.checked = false;

                        this.#trimCheckbox.disabled =
                            this.#romanizeCheckbox.disabled =
                            this.#disableCustomProcessingCheckbox.disabled =
                            this.#duplicateModeSelect.disabled =
                                false;
                        break;
                }
                break;
            case this.#applyReadButton: {
                const readMode = this.readMode();

                const duplicateMode = Number(this.#duplicateModeSelect.value);
                const romanize = this.#romanizeCheckbox.checked;
                const disableCustomProcessing =
                    this.#disableCustomProcessingCheckbox.checked;
                const trim = this.#trimCheckbox.checked;
                const fileFlags = getFileFlags(this.element);

                await emittery.emit(AppEvent.InvokeRead, [
                    readMode,
                    fileFlags,
                    duplicateMode,
                    romanize,
                    disableCustomProcessing,
                    trim,
                    this.#ignoreCheckbox.checked,
                ]);
                break;
            }
        }
    }
}
