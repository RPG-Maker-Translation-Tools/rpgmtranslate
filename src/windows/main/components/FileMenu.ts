import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

export class FileMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #reloadButton: HTMLButtonElement;

    public constructor() {
        super("file-menu");

        this.#reloadButton = this.element.querySelector("#reload-button")!;

        this.element.onclick = async (e): Promise<void> => {
            if (e.target === this.#reloadButton) {
                await emittery.emit(AppEvent.Reload);
            }
        };
    }
}
