import { ProjectSettings, Saver } from "@classes/index";
import { purge } from "@utils/invokes";

import * as utils from "@utils/functions";

export class PurgeMenu {
    #purgeButton: HTMLButtonElement;

    #purgeMenu: HTMLDivElement;
    #createIgnoreCheckbox: HTMLSpanElement;
    #applyButton: HTMLButtonElement;

    public constructor(
        private readonly projectSettings: ProjectSettings,
        private readonly saver: Saver,
        private readonly gameTitleInput: HTMLInputElement,
        private readonly reload: (save: boolean) => Promise<void>,
    ) {
        this.#purgeButton = document.getElementById(
            "purge-button",
        ) as HTMLButtonElement;
        this.#purgeMenu = document.getElementById(
            "purge-menu",
        ) as HTMLDivElement;
        this.#createIgnoreCheckbox = this.#purgeMenu.querySelector(
            "#create-ignore-checkbox",
        )!;
        this.#applyButton = this.#purgeMenu.querySelector("#apply-button")!;

        this.#purgeMenu.addEventListener("click", async (event) => {
            await this.#handleClick(event);
        });
    }

    async #handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (target === this.#applyButton) {
            await this.saver.saveAll();
            this.#purgeButton.firstElementChild!.classList.add("animate-spin");

            await purge({
                sourcePath: this.projectSettings.sourcePath,
                translationPath: this.projectSettings.translationPath,
                engineType: this.projectSettings.engineType,
                duplicateMode: this.projectSettings.duplicateMode,
                gameTitle: this.gameTitleInput.getAttribute("source-title")!,
                romanize: this.projectSettings.romanize,
                disableCustomProcessing:
                    this.projectSettings.disableCustomProcessing,
                disableProcessing: utils.getFileFlags(this.#purgeMenu),
                createIgnore: Boolean(this.#createIgnoreCheckbox.textContent),
                trim: this.projectSettings.trim,
            });

            this.#purgeButton.firstElementChild!.classList.remove(
                "animate-spin",
            );
            await this.reload(false);
        }
    }

    public toggle() {
        utils.toggleMultiple(this.#purgeMenu, "hidden", "flex");

        if (this.#purgeMenu.classList.contains("hidden")) {
            return;
        }

        requestAnimationFrame(() => {
            this.#purgeMenu.style.left = `${this.#purgeButton.offsetLeft}px`;
            this.#purgeMenu.style.top = `${this.#purgeButton.offsetTop + this.#purgeButton.clientHeight}px`;
        });
    }
}
