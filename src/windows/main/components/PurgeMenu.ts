import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { AppEvent, FileFlags, RPGMFileType } from "@lib/enums";

export class PurgeMenu extends Component {
    declare protected readonly element: HTMLDivElement;

    readonly #createIgnoreCheckbox: HTMLInputElement;

    readonly #skipFilesSelect: HTMLSelectElement;
    readonly #skipMapsInput: HTMLInputElement;
    readonly #skipEventsSelect: HTMLSelectElement;
    readonly #skipEventsInput: HTMLInputElement;
    readonly #skipEvents: Record<string, string> = {};
    #prevOption = "";

    readonly #applyButton: HTMLButtonElement;

    public constructor() {
        super("purge-menu");

        this.#createIgnoreCheckbox = this.element.querySelector(
            "#create-ignore-checkbox",
        )!;

        this.#skipFilesSelect =
            this.element.querySelector("#skip-files-select")!;
        this.#skipMapsInput = this.element.querySelector("#skip-maps-input")!;
        this.#skipEventsSelect = this.element.querySelector(
            "#skip-events-select",
        )!;
        this.#skipEventsInput =
            this.element.querySelector("#skip-events-input")!;

        this.#applyButton = this.element.querySelector("#apply-button")!;

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
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        let skipFiles = FileFlags.None;

        for (const option of this.#skipFilesSelect.selectedOptions) {
            skipFiles |= Number(option.value);
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

        if (target === this.#applyButton) {
            await emittery.emit(AppEvent.InvokePurge, [
                skipFiles,
                this.#createIgnoreCheckbox.checked,
                skipMaps,
                skipEvents,
            ]);
        }
    }
}
