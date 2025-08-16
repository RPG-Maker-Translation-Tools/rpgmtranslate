import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { getFileFlags } from "@utils/functions";
import { Component } from "./Component";

export class PurgeMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #createIgnoreCheckbox: HTMLInputElement;
    readonly #applyButton: HTMLButtonElement;

    public constructor() {
        super("purge-menu");

        this.#createIgnoreCheckbox = this.element.querySelector(
            "#create-ignore-checkbox",
        )!;
        this.#applyButton = this.element.querySelector("#apply-button")!;

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (target === this.#applyButton) {
            await emittery.emit(AppEvent.InvokePurge, [
                getFileFlags(this.element),
                this.#createIgnoreCheckbox.checked,
            ]);
        }
    }
}
