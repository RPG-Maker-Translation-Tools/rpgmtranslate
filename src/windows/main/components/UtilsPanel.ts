import { emittery } from "@classes/emittery";
import { ProjectSettings } from "@lib/classes";
import { AppEvent } from "@lib/enums";
import { ENGINE_NAMES, PERCENT_MULTIPLIER } from "@utils/constants";
import { join, parts } from "@utils/functions";
import { readLastLine } from "@utils/invokes";
import { Component } from "./Component";

import { t } from "@lingui/core/macro";

import { check } from "language-tags";

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

    declare protected readonly element: HTMLDivElement;

    readonly #languageInputs: HTMLDivElement;
    readonly #sourceLanguageInput: HTMLInputElement;
    readonly #translationLanguageInput: HTMLInputElement;

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

        this.#languageInputs = this.element.querySelector("#language-inputs")!;
        this.#sourceLanguageInput = this.element.querySelector(
            "#source-language-input",
        )!;
        this.#translationLanguageInput = this.element.querySelector(
            "#translation-language-input",
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

        this.#utilsPanelButtons.onclick = async (e): Promise<void> => {
            await this.#onbuttonclick(e);
        };

        this.element.addEventListener("focusout", (e) => {
            this.#onfocusout(e);
        });
    }

    public get gameEngine(): string {
        return this.#gameEngine.textContent;
    }

    public get sourceLanguage(): string {
        return this.#sourceLanguageInput.value;
    }

    public get translationLanguage(): string {
        return this.#translationLanguageInput.value;
    }

    public get translationTitle(): string {
        return this.#gameTitleInput.value;
    }

    public get sourceTitle(): string {
        return this.#gameTitleInput.placeholder;
    }

    public set sourceLanguage(language: string) {
        this.#sourceLanguageInput.value = language;
    }

    public set translationLanguage(language: string) {
        this.#translationLanguageInput.value = language;
    }

    public set tabName(name: string) {
        this.#currentTab.textContent = name;
    }

    public async init(projectSettings: ProjectSettings): Promise<void> {
        this.#metadataContainer.classList.remove("invisible");
        this.#languageInputs.classList.remove("invisible");

        this.translationLanguage =
            projectSettings.translationLanguages.translation;
        this.sourceLanguage = projectSettings.translationLanguages.source;

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
        this.#languageInputs.classList.add("invisible");
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

    #checkLangaugeTag(input: HTMLInputElement): boolean {
        if (!input.value) {
            return true;
        }

        const valid = check(input.value);

        if (valid) {
            return true;
        }

        alert(
            t`Language tag is invalid. You must use existing IANA BCP-47 language tag. For example, en-US or ja-JP`,
        );

        input.value = "";
        return false;
    }

    #onfocusout(e: FocusEvent): void {
        const target = e.target as HTMLInputElement;

        switch (target) {
            case this.#sourceLanguageInput:
            case this.#translationLanguageInput:
                this.#checkLangaugeTag(target);

                void emittery.emit(AppEvent.LanguageTags, [
                    this.sourceLanguage,
                    this.translationLanguage,
                ]);
                break;
            case this.#gameTitleInput:
                void emittery.emit(
                    AppEvent.TitleTranslationChanged,
                    target.value,
                );
                break;
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
