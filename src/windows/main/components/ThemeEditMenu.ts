import { t } from "@lingui/core/macro";
import * as utils from "@utils/functions";

import { message } from "@tauri-apps/plugin-dialog";

export class ThemeEditMenu {
    #themeMenu: HTMLDivElement;

    #themeEditMenu: HTMLDivElement;
    #themeEditMenuBody: HTMLDivElement;
    #createThemeButton: HTMLButtonElement;
    #themeNameInput: HTMLInputElement;
    #closeButton: HTMLButtonElement;

    public constructor(themes: Themes) {
        this.#themeMenu = document.getElementById(
            "theme-menu",
        ) as HTMLDivElement;
        this.#themeEditMenu = document.getElementById(
            "theme-edit-menu",
        ) as HTMLDivElement;
        this.#themeEditMenuBody = this.#themeEditMenu
            .children[1] as HTMLDivElement;
        this.#createThemeButton =
            this.#themeEditMenu.querySelector("#create-theme")!;
        this.#closeButton = this.#themeEditMenu.querySelector("#close-button")!;
        this.#themeNameInput =
            this.#themeEditMenu.querySelector("#theme-name-input")!;

        this.#themeEditMenuBody.addEventListener("input", (event) => {
            const input = event.target as HTMLInputElement;
            document
                .querySelector<HTMLElement>(":root")!
                .style.setProperty(input.id, input.value);
        });

        this.#closeButton.addEventListener("click", () => {
            this.#themeEditMenu.classList.add("hidden");
        });

        this.#createThemeButton.addEventListener("click", () => {
            const themeName = this.#themeNameInput.value.trim();

            if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                void message(
                    t`Invalid theme name: Allowed characters: a-z, A-Z, 0-9, -, _.`,
                );
                return;
            }

            themes[themeName] = {};

            for (const child of this.#themeEditMenuBody.querySelectorAll<HTMLInputElement>(
                "input",
            )) {
                themes[themeName][child.id] = child.value;
            }

            const newThemeButton = document.createElement("button");
            newThemeButton.textContent = themeName;
            newThemeButton.className = utils.tw`h-8 p-1 text-base bg-primary hover-bg-primary`;

            this.#themeMenu.insertBefore(
                newThemeButton,
                this.#themeMenu.lastElementChild,
            );
        });
    }

    public show() {
        this.#themeEditMenu.classList.remove("hidden");
        this.#themeEditMenu.style.left = `${(document.body.clientWidth - this.#themeEditMenu.clientWidth) / 2}px`;
    }
}
