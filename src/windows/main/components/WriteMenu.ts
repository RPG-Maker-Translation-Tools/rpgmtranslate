import { emittery } from "@classes/emittery";
import { AppEvent, FileFlags } from "@lib/enums";
import { Component } from "./Component";

import { RPGMFileType } from "@lib/enums/RPGMFileType";
import { open } from "@tauri-apps/plugin-dialog";

export class WriteMenu extends Component {
    declare protected readonly element: HTMLDivElement;

    readonly #selectOutputPathButton: HTMLButtonElement;
    readonly #outputPathInput: HTMLInputElement;

    readonly #skipFilesSelect: HTMLSelectElement;
    readonly #skipMapsInput: HTMLInputElement;
    readonly #skipEventsSelect: HTMLSelectElement;
    readonly #skipEventsInput: HTMLInputElement;
    readonly #skipEvents: Record<string, string> = {};
    #prevOption = "";

    readonly #applyButton: HTMLButtonElement;

    #programDataPath = "";

    public constructor() {
        super("write-menu");

        this.#selectOutputPathButton = this.element.querySelector(
            "#select-output-path-button",
        )!;
        this.#outputPathInput =
            this.element.querySelector("#output-path-input")!;

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
                charCode != ",".charCodeAt(0)
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

    public init(programDataPath: string): void {
        this.#programDataPath = programDataPath;
    }

    public override show(x: number, y: number): void {
        super.show(x, y);

        this.#outputPathInput.value = this.#programDataPath;
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (target === this.#selectOutputPathButton) {
            const directory = (await open({
                directory: true,
                multiple: false,
            }))!;

            if (directory) {
                this.#outputPathInput.value = directory;
            }
        } else if (target === this.#applyButton) {
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

            await emittery.emit(AppEvent.InvokeWrite, [
                skipFiles,
                skipMaps,
                skipEvents,
            ]);
        }
    }
}
