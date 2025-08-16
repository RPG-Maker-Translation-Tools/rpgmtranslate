import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { tw } from "@utils/functions";
import { Component } from "./Component";

export class ThemeMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #createThemeButton: HTMLButtonElement;

    public constructor() {
        super("theme-menu");

        this.#createThemeButton = this.element.querySelector(
            "#create-theme-button",
        )!;

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    public init(themes: Themes): void {
        for (const themeName of Object.keys(themes)) {
            this.addTheme(themeName);
        }
    }

    public addTheme(name: string): void {
        const themeButton = document.createElement("button");
        themeButton.textContent = name;
        themeButton.className = tw`bg-primary hover-bg-primary h-8 p-1 text-base`;

        this.element.insertBefore(themeButton, this.element.lastElementChild);
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target === this.#createThemeButton) {
            void emittery.emit(AppEvent.ShowThemeEditMenu);
        } else {
            void emittery.emit(AppEvent.ApplyTheme, target.textContent);
        }
    }
}
