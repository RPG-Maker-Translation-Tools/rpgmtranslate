import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import {
    AppEvent,
    BaseFlags,
    DuplicateMode,
    FileFlags,
    ReadMode,
    RPGMFileType,
} from "@lib/enums";

import { t } from "@lingui/core/macro";

// TODO: Implement generic files support introduced in rvpacker-txt-rs-lib v11.1.0

export class ReadMenu extends Component {
    declare protected readonly element: HTMLDivElement;

    readonly #readModeSelect: HTMLSelectElement;
    readonly #readModeDescription: HTMLSpanElement;

    readonly #duplicateModeSelect: HTMLSelectElement;
    readonly #duplicateModeDescription: HTMLSpanElement;

    readonly #romanizeCheckbox: HTMLInputElement;
    readonly #disableCustomProcessingCheckbox: HTMLInputElement;
    readonly #ignoreCheckbox: HTMLInputElement;
    readonly #trimCheckbox: HTMLInputElement;

    readonly #skipFilesSelect: HTMLSelectElement;
    readonly #skipMapsInput: HTMLInputElement;
    readonly #skipEventsSelect: HTMLSelectElement;
    readonly #skipEventsInput: HTMLInputElement;
    readonly #skipEvents: Record<string, string> = {};
    readonly #mapEventsCheckbox: HTMLInputElement;

    readonly #applyReadButton: HTMLButtonElement;

    #projectSettings!: ProjectSettings;

    #prevOption = "";

    public constructor() {
        super("read-menu");

        this.#readModeSelect = this.element.querySelector("#read-mode-select")!;
        this.#readModeDescription =
            this.element.querySelector("#mode-description")!;

        this.#duplicateModeSelect = this.element.querySelector(
            "#duplicate-mode-select",
        )!;
        this.#duplicateModeDescription = this.element.querySelector(
            "#duplicate-mode-description",
        )!;

        this.#romanizeCheckbox =
            this.element.querySelector("#romanize-checkbox")!;
        this.#disableCustomProcessingCheckbox = this.element.querySelector(
            "#custom-processing-checkbox",
        )!;
        this.#ignoreCheckbox = this.element.querySelector("#ignore-checkbox")!;
        this.#trimCheckbox = this.element.querySelector("#trim-checkbox")!;

        this.#skipFilesSelect =
            this.element.querySelector("#skip-files-select")!;
        this.#skipMapsInput = this.element.querySelector("#skip-maps-input")!;
        this.#skipEventsSelect = this.element.querySelector(
            "#skip-events-select",
        )!;
        this.#skipEventsInput =
            this.element.querySelector("#skip-events-input")!;
        this.#mapEventsCheckbox = this.element.querySelector(
            "#map-events-checkbox",
        )!;

        this.#applyReadButton = this.element.querySelector("#apply-button")!;

        const defaultOption = document.createElement("option");
        // TODO: This is possibly untranslated?
        defaultOption.setAttribute("data-i18n", "Default");
        defaultOption.value = ReadMode.Default.toString();
        this.#readModeSelect.add(defaultOption);

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };

        this.#skipMapsInput.oninput = (): void => {
            const charCode = this.#skipMapsInput.value.charCodeAt(
                this.#skipMapsInput.value.length - 1,
            );

            if (Number.isNaN(charCode)) {
                return;
            }

            if (
                (charCode < "1".charCodeAt(0) ||
                    charCode > "0".charCodeAt(0)) &&
                charCode !== ",".charCodeAt(0)
            ) {
                this.#skipMapsInput.value = this.#skipMapsInput.value.slice(
                    0,
                    -1,
                );
            }
        };

        this.#skipEventsSelect.onchange = (e): void => {
            const selected = [...this.#skipEventsSelect.selectedOptions];

            if (selected.length > 1) {
                selected.slice(0, -1).forEach((o) => (o.selected = false));
            }

            if (e.target === null) {
                return;
            }

            const optionValue = (e.target as HTMLOptionElement).value;

            this.#skipEvents[this.#prevOption] = this.#skipEventsInput.value;
            this.#skipEventsInput.value = this.#skipEvents[optionValue] || "";
            this.#prevOption = optionValue;
        };

        this.#readModeSelect.onchange = (): void => {
            const readMode = this.readMode();
            this.#changeReadModeDesc();

            switch (readMode) {
                case ReadMode.Default:
                    break;
                case ReadMode.AppendForce:
                case ReadMode.AppendDefault: {
                    this.#duplicateModeSelect.value =
                        this.#projectSettings.duplicateMode.toString();
                    this.#changeDuplicateModeDesc();

                    this.#trimCheckbox.checked = Boolean(
                        this.#projectSettings.flags & BaseFlags.Trim,
                    );
                    this.#romanizeCheckbox.checked = Boolean(
                        this.#projectSettings.flags & BaseFlags.Romanize,
                    );
                    this.#disableCustomProcessingCheckbox.checked = Boolean(
                        this.#projectSettings.flags &
                        BaseFlags.DisableCustomProcessing,
                    );

                    this.#trimCheckbox.disabled =
                        this.#romanizeCheckbox.disabled =
                        this.#disableCustomProcessingCheckbox.disabled =
                        this.#duplicateModeSelect.disabled =
                            true;
                    break;
                }
                case ReadMode.DefaultForce:
                    this.#duplicateModeSelect.value = "1";
                    this.#changeDuplicateModeDesc();

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
        };

        this.#duplicateModeSelect.onchange = (): void => {
            this.#changeDuplicateModeDesc();
        };
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
        this.#trimCheckbox.checked = Boolean(
            projectSettings.flags & BaseFlags.Trim,
        );
        this.#romanizeCheckbox.checked = Boolean(
            projectSettings.flags & BaseFlags.Romanize,
        );
        this.#disableCustomProcessingCheckbox.checked = Boolean(
            projectSettings.flags & BaseFlags.DisableCustomProcessing,
        );
        this.#duplicateModeSelect.value =
            projectSettings.duplicateMode.toString();

        this.#readModeSelect.innerHTML = "";

        for (let i = ReadMode.DefaultForce; i <= ReadMode.AppendForce; i++) {
            const option = document.createElement("option");

            if (i === ReadMode.DefaultForce) {
                option.innerHTML = t`Force`;
            } else if (i === ReadMode.AppendDefault) {
                option.innerHTML = t`Append`;
            } else if (i === ReadMode.AppendForce) {
                option.innerHTML = t`Force Append`;
            }

            option.value = i.toString();
            this.#readModeSelect.add(option);
        }
    }

    public override show(x?: number, y?: number): void {
        super.show(x, y);

        this.#changeReadModeDesc();
        this.#changeDuplicateModeDesc();
    }

    public readMode(): ReadMode {
        return Number(this.#readModeSelect.value) as ReadMode;
    }

    #changeDuplicateModeDesc(): void {
        const duplicateMode = Number(
            this.#duplicateModeSelect.value,
        ) as DuplicateMode;

        if (duplicateMode === DuplicateMode.Allow) {
            this.#duplicateModeDescription.innerHTML = t`Allow duplicates across maps and events. This may bloat your translation. This mode is always set for system, scripts, and plugins files.`;
        } else {
            this.#duplicateModeDescription.innerHTML = t`Remove duplicates across maps and events. Recommended. In system, scripts and plugins files this mode is always overridden by allow mode.`;
        }
    }

    #changeReadModeDesc(): void {
        const readMode = this.readMode();

        switch (readMode) {
            case ReadMode.AppendForce:
            case ReadMode.AppendDefault: {
                const post =
                    readMode === ReadMode.AppendDefault
                        ? t`Default mode does nothing, when the source files are unchanged since the last read - in this case use force append mode.`
                        : "";

                this.#readModeDescription.innerHTML = t`Appends any new text from the game to the translation files, if the text is not already present. Unused lines are removed from translation files, and the lines order is sorted. ${
                    post
                }`;

                break;
            }
            case ReadMode.DefaultForce:
                this.#readModeDescription.innerHTML = t`Force rewrites existing translation files.`;
                break;
        }
    }
    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target === this.#applyReadButton) {
            const readMode = this.readMode();

            const duplicateMode = Number(this.#duplicateModeSelect.value);
            const romanize = this.#romanizeCheckbox.checked;
            const disableCustomProcessing =
                this.#disableCustomProcessingCheckbox.checked;
            const trim = this.#trimCheckbox.checked;

            let skipFiles = FileFlags.None;

            for (const option of this.#skipFilesSelect.selectedOptions) {
                skipFiles |= Number(option.value);
            }

            let flags = BaseFlags.None;

            if (romanize) {
                flags |= BaseFlags.Romanize;
            }

            if (disableCustomProcessing) {
                flags |= BaseFlags.DisableCustomProcessing;
            }

            if (trim) {
                flags |= BaseFlags.Trim;
            }

            if (this.#ignoreCheckbox.checked) {
                flags |= BaseFlags.Ignore;
            }

            const skipMaps: number[] = this.#skipMapsInput.value
                .split(",")
                .map((x) => Number(x));

            const skipEvents: [RPGMFileType, number[]][] = [];

            for (const key in this.#skipEvents) {
                skipEvents.push([
                    Number(key),
                    this.#skipEvents[key].split(",").map((x) => Number(x)),
                ]);
            }

            const mapEvents = this.#mapEventsCheckbox.checked;

            await emittery.emit(AppEvent.InvokeRead, [
                readMode,
                skipFiles,
                duplicateMode,
                flags,
                skipMaps,
                skipEvents,
                mapEvents,
            ]);
        }
    }
}
