import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";

import { t } from "@lingui/core/macro";

import { message } from "@tauri-apps/plugin-dialog";
import { Component } from "./Component";

export class ThemeEditMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #themeEditMenuBody: HTMLDivElement;
    readonly #createThemeButton: HTMLButtonElement;
    readonly #themeNameInput: HTMLInputElement;
    readonly #closeButton: HTMLButtonElement;

    public constructor() {
        super("theme-edit-menu");
        this.#themeEditMenuBody = this.element.children[1] as HTMLDivElement;
        this.#createThemeButton = this.element.querySelector("#create-theme")!;
        this.#closeButton = this.element.querySelector("#close-button")!;
        this.#themeNameInput = this.element.querySelector("#theme-name-input")!;

        this.element.oninput = (e): void => {
            this.#oninput(e);
        };

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    public override show(): void {
        this.element.classList.remove("hidden");
        this.element.style.left = `${(document.body.clientWidth - this.element.clientWidth) / 2}px`;
    }

    #oninput(event: Event): void {
        const input = event.target as HTMLInputElement;
        document
            .querySelector<HTMLElement>(":root")!
            .style.setProperty(input.id, input.value);
    }

    #onclick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;

        if (target === this.#closeButton) {
            this.hide();
        } else if (target === this.#createThemeButton) {
            const themeName = this.#themeNameInput.value.trim();

            if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                void message(
                    t`Invalid theme name: Allowed characters: a-z, A-Z, 0-9, -, _.`,
                );
                return;
            }

            const theme: Record<string, string> = {};

            for (const child of this.#themeEditMenuBody.querySelectorAll<HTMLInputElement>(
                "input",
            )) {
                theme[child.id] = child.value;
            }

            void emittery.emit(AppEvent.AddTheme, [themeName, theme]);
        }
    }
}
