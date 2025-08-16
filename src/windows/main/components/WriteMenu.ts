import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

import { open } from "@tauri-apps/plugin-dialog";
import { getFileFlags } from "@utils/functions";

export class WriteMenu extends Component {
    declare protected readonly element: HTMLDivElement;

    readonly #selectOutputPathButton: HTMLButtonElement;
    readonly #outputPathInput: HTMLInputElement;

    readonly #disableMapProcessingCheckbox: HTMLInputElement;
    readonly #disableOtherProcessingCheckbox: HTMLInputElement;
    readonly #disableSystemProcessingCheckbox: HTMLInputElement;
    readonly #disablePluginProcessingCheckbox: HTMLInputElement;

    readonly #applyButton: HTMLButtonElement;

    #programDataPath = "";

    public constructor() {
        super("write-menu");

        this.#selectOutputPathButton = this.element.querySelector(
            "#select-output-path-button",
        )!;
        this.#outputPathInput =
            this.element.querySelector("#output-path-input")!;

        this.#disableMapProcessingCheckbox = this.element.querySelector(
            "#disable-map-processing-checkbox",
        )!;
        this.#disableOtherProcessingCheckbox = this.element.querySelector(
            "#disable-other-processing-checkbox",
        )!;
        this.#disableSystemProcessingCheckbox = this.element.querySelector(
            "#disable-system-processing-checkbox",
        )!;
        this.#disablePluginProcessingCheckbox = this.element.querySelector(
            "#disable-plugin-processing-checkbox",
        )!;

        this.#applyButton = this.element.querySelector("#apply-button")!;

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    public init(programDataPath: string): void {
        this.#programDataPath = programDataPath;
    }

    public override show(x: number, y: number): void {
        this.element.classList.remove("hidden");

        requestAnimationFrame(() => {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
        });

        this.#outputPathInput.value = this.#programDataPath;
        this.#disableMapProcessingCheckbox.checked =
            this.#disableOtherProcessingCheckbox.checked =
            this.#disableSystemProcessingCheckbox.checked =
            this.#disablePluginProcessingCheckbox.checked =
                false;
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
            await emittery.emit(
                AppEvent.InvokeWrite,
                getFileFlags(this.element),
            );
        }
    }
}
