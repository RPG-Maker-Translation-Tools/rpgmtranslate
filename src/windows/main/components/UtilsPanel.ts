import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import {
    AppEvent,
    TokenizerAlgorithm,
    TokenizerAlgorithmNames,
} from "@lib/enums";

import { ENGINE_NAMES, PERCENT_MULTIPLIER } from "@utils/constants";
import { join, parts } from "@utils/functions";
import { readLastLine } from "@utils/invokes";

export class UtilsPanel extends Component {
    public readonly saveButton: HTMLButtonElement;
    public readonly writeButton: HTMLButtonElement;
    public readonly themeButton: HTMLButtonElement;
    public readonly readButton: HTMLButtonElement;
    public readonly purgeButton: HTMLButtonElement;
    public readonly bookmarksButton: HTMLButtonElement;
    public readonly tabPanelButton: HTMLButtonElement;
    public readonly openDirectoryButton: HTMLButtonElement;
    public readonly searchButton: HTMLButtonElement;
    public readonly batchButton: HTMLButtonElement;
    public readonly settingsButton: HTMLButtonElement;
    public readonly glossaryButton: HTMLButtonElement;

    declare protected readonly element: HTMLDivElement;

    #translationLanguages!: TranslationLanguages;
    readonly #languageSelects: HTMLDivElement;
    readonly #sourceLanguageSelect: HTMLSelectElement;
    readonly #translationLanguageSelect: HTMLSelectElement;

    readonly #gameEngine: HTMLDivElement;
    readonly #gameTitleInput: HTMLInputElement;

    readonly #currentTab: HTMLDivElement;

    readonly #utilsPanelButtons: HTMLDivElement;

    readonly #metadataContainer: HTMLDivElement;
    readonly #progressMeter: HTMLDivElement;

    public constructor() {
        super("utils-panel");

        this.#utilsPanelButtons = this.element.children[0] as HTMLDivElement;

        this.saveButton =
            this.#utilsPanelButtons.querySelector("#save-button")!;
        this.writeButton =
            this.#utilsPanelButtons.querySelector("#write-button")!;
        this.themeButton =
            this.#utilsPanelButtons.querySelector("#theme-button")!;
        this.readButton =
            this.#utilsPanelButtons.querySelector("#read-button")!;
        this.purgeButton =
            this.#utilsPanelButtons.querySelector("#purge-button")!;
        this.bookmarksButton =
            this.#utilsPanelButtons.querySelector("#bookmarks-button")!;
        this.tabPanelButton =
            this.#utilsPanelButtons.querySelector("#tab-panel-button")!;
        this.openDirectoryButton = this.#utilsPanelButtons.querySelector(
            "#open-directory-button",
        )!;
        this.searchButton =
            this.#utilsPanelButtons.querySelector("#search-button")!;
        this.batchButton =
            this.#utilsPanelButtons.querySelector("#batch-button")!;
        this.settingsButton =
            this.#utilsPanelButtons.querySelector("#settings-button")!;
        this.glossaryButton =
            this.#utilsPanelButtons.querySelector("#glossary-button")!;

        this.#languageSelects =
            this.element.querySelector("#language-selects")!;
        this.#sourceLanguageSelect = this.element.querySelector(
            "#source-language-select",
        )!;
        this.#translationLanguageSelect = this.element.querySelector(
            "#translation-language-select",
        )!;

        this.#metadataContainer = this.element.querySelector(
            "#metadata-container",
        )!;
        this.#progressMeter =
            this.#metadataContainer.querySelector("#progress-meter")!;
        this.#currentTab =
            this.#metadataContainer.querySelector("#current-tab")!;
        this.#gameEngine =
            this.#metadataContainer.querySelector("#game-engine")!;
        this.#gameTitleInput =
            this.#metadataContainer.querySelector("#game-title-input")!;

        this.#languageSelects.onchange = (e): void => {
            const target = e.target as HTMLSelectElement;

            if (target === this.#sourceLanguageSelect) {
                this.#translationLanguages.sourceLanguage = Number(
                    target.value,
                );
            } else if (target === this.#translationLanguageSelect) {
                this.#translationLanguages.translationLanguage = Number(
                    target.value,
                );
            }
        };

        this.#utilsPanelButtons.onclick = async (e): Promise<void> => {
            await this.#onbuttonclick(e);
        };

        this.element.addEventListener("focusout", (e): void => {
            this.#onfocusout(e);
        });

        for (
            let i = TokenizerAlgorithm.Arabic;
            i <= TokenizerAlgorithm.None;
            i++
        ) {
            const option = document.createElement("option");
            option.value = i.toString();
            option.setAttribute("data-i18n", TokenizerAlgorithmNames[i]);

            this.#sourceLanguageSelect.add(
                option.cloneNode() as HTMLOptionElement,
            );
            this.#translationLanguageSelect.add(option);
        }

        this.#sourceLanguageSelect.value = TokenizerAlgorithm.None.toString();
        this.#translationLanguageSelect.value =
            TokenizerAlgorithm.None.toString();
    }

    public get gameEngine(): string {
        return this.#gameEngine.textContent;
    }

    public get translationTitle(): string {
        return this.#gameTitleInput.value;
    }

    public get sourceTitle(): string {
        return this.#gameTitleInput.placeholder;
    }

    public set tabName(name: string) {
        this.#currentTab.textContent = name;
    }

    public async init(projectSettings: ProjectSettings): Promise<void> {
        this.#metadataContainer.classList.remove("invisible");
        this.#languageSelects.classList.remove("invisible");

        this.#translationLanguages = projectSettings.translationLanguages;
        this.#sourceLanguageSelect.value =
            this.#translationLanguages.sourceLanguage.toString();
        this.#translationLanguageSelect.value =
            this.#translationLanguages.translationLanguage.toString();

        const systemFilePath = join(
            projectSettings.translationPath,
            "system.txt",
        );

        const [sourceTitle, translationTitle] = parts(
            await readLastLine(systemFilePath),
        )!;

        this.#gameTitleInput.placeholder = sourceTitle;
        this.#gameTitleInput.value = translationTitle || sourceTitle;
        this.#gameEngine.textContent = ENGINE_NAMES[projectSettings.engineType];
    }

    public clear(): void {
        this.#metadataContainer.classList.add("invisible");
        this.#languageSelects.classList.add("invisible");
    }

    public updateProgressMeter(tabInfo: TabInfo): void {
        let total = 0;
        let translated = 0;

        for (const key in tabInfo.tabs) {
            const entry = tabInfo.tabs[key];
            total += entry.sourceLineCount;
            translated += entry.translatedLineCount;
        }

        this.#progressMeter.style.width = `${Math.round((translated / total) * PERCENT_MULTIPLIER)}%`;
        this.#progressMeter.innerHTML = `${translated} / ${total}`;
    }

    public toggleWriteAnimation(): void {
        this.writeButton.firstElementChild!.classList.toggle("animate-spin");
    }

    public toggleReadAnimation(): void {
        this.readButton.firstElementChild!.classList.toggle("animate-spin");
    }

    public toggleSaveAnimation(): void {
        this.saveButton.firstElementChild!.classList.toggle("animate-spin");
    }

    public togglePurgeAnimation(): void {
        this.purgeButton.firstElementChild!.classList.toggle("animate-spin");
    }

    #onfocusout(e: FocusEvent): void {
        const target = e.target as HTMLInputElement;

        if (target === this.#gameTitleInput) {
            void emittery.emit(AppEvent.TitleTranslationChanged, target.value);
        }
    }

    async #onbuttonclick(event: MouseEvent): Promise<void> {
        let target = event.target as HTMLButtonElement | HTMLDivElement | null;

        if (!target || target === this.#utilsPanelButtons) {
            return;
        }

        while (target.parentElement !== this.#utilsPanelButtons) {
            target = target.parentElement as HTMLButtonElement;
        }

        await emittery.emit(
            AppEvent.UtilsButtonClick,
            target as HTMLButtonElement,
        );
    }
}
