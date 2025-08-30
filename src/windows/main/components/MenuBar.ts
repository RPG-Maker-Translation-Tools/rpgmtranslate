import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

export class MenuBar extends Component {
    public readonly fileMenuButton: HTMLButtonElement;
    public readonly helpMenuButton: HTMLButtonElement;
    public readonly languageMenuButton: HTMLButtonElement;

    declare protected readonly element: HTMLDivElement;

    public constructor() {
        super("menu-bar");

        this.fileMenuButton = this.element.querySelector("#file-menu-button")!;
        this.helpMenuButton = this.element.querySelector("#help-menu-button")!;
        this.languageMenuButton = this.element.querySelector(
            "#language-menu-button",
        )!;

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        void emittery.emit(
            AppEvent.MenuBarButtonClick,
            target as HTMLButtonElement,
        );
    }
}
