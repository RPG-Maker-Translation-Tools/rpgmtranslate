import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

export class HelpMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #helpButton: HTMLButtonElement;
    readonly #aboutButton: HTMLButtonElement;

    public constructor() {
        super("help-menu");

        this.#helpButton = this.element.querySelector("#help-button")!;
        this.#aboutButton = this.element.querySelector("#about-button")!;

        this.element.onclick = async (e): Promise<void> => {
            switch (e.target) {
                case this.#helpButton:
                    await emittery.emit(AppEvent.ShowHelpWindow);
                    break;
                case this.#aboutButton: {
                    await emittery.emit(AppEvent.ShowAboutWindow);
                    break;
                }
            }
        };
    }
}
