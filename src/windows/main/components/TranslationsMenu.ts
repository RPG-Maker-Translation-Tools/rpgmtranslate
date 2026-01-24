import { Component } from "./Component";

import { emittery } from "@lib/classes/emittery";

import { ProjectSettings, TranslationSettings } from "@lib/classes";
import { AppEvent, TokenizerAlgorithm, TranslationEndpoint } from "@lib/enums";

import { t } from "@lingui/core/macro";

import { isErr, translateSingle } from "@utils/invokes";

import { error } from "@tauri-apps/plugin-log";

// TODO: Make translation cells respective to ID, NAME, ORDER, EVENT ID, EVENT NAME comments uneditable!

export class TranslationsMenu extends Component {
    #projectSettings!: ProjectSettings;
    #translationSettings!: TranslationSettings;
    #glossary!: Glossary;
    #tabInfo!: TabInfo;

    #body: HTMLDivElement;

    public constructor() {
        super("translations-menu");

        this.setDraggable(true);

        this.#body = this.element.querySelector("main") as HTMLDivElement;

        this.element.onmousedown = (e): void => {
            this.#onmousedown(e);
        };
    }

    public init(
        projectSettings: ProjectSettings,
        translationSettings: TranslationSettings,
        glossary: Glossary,
        tabInfo: TabInfo,
    ): void {
        this.#projectSettings = projectSettings;
        this.#translationSettings = translationSettings;
        this.#glossary = glossary;
        this.#tabInfo = tabInfo;

        const children = this.#body.children;

        for (
            let i = TranslationEndpoint.Google;
            i < TranslationEndpoint.COUNT;
            i++
        ) {
            if (this.#translationSettings.enabledTranslations & (1 << i)) {
                children[i].querySelector("button")!.innerHTML = "-";
                children[i].querySelector("main")!.classList.remove("hidden");
            } else {
                children[i].querySelector("button")!.innerHTML = "+";
                children[i].querySelector("main")!.classList.add("hidden");
            }
        }
    }

    public async showTranslations(sourceText: string): Promise<void> {
        if (this.hidden) {
            return;
        }

        const children = this.#body.children;
        const buttons = this.element.querySelectorAll("button");

        const glossary = [];

        for (const term of this.#glossary) {
            glossary.push({
                term: term.source,
                translation: term.translation,
                note: term.note,
            });
        }

        for (const button of buttons) {
            if (button.innerHTML === "-") {
                const id = Number(button.id);

                if (
                    this.#projectSettings.translationLanguages
                        .sourceLanguage === TokenizerAlgorithm.None
                ) {
                    children[id].querySelector("main")!.innerHTML =
                        t`Source language is not set.`;
                    return;
                }

                if (
                    this.#projectSettings.translationLanguages
                        .translationLanguage === TokenizerAlgorithm.None
                ) {
                    children[id].querySelector("main")!.innerHTML =
                        t`Translation language is not set.`;
                    return;
                }

                const args = {
                    ...this.#translationSettings.endpoints[id],
                    ...this.#projectSettings.translationLanguages,
                    localContext:
                        this.#tabInfo.tabName === ""
                            ? ""
                            : (this.#projectSettings.fileContexts[
                                  this.#tabInfo.tabName
                              ] ?? ""),
                    projectContext: this.#projectSettings.projectContext,
                    glossary: this.#translationSettings.endpoints[id]
                        .useGlossary
                        ? glossary
                        : [],
                    text: sourceText,
                    normalize: false,
                };

                const translation = await translateSingle(args);

                if (isErr(translation)) {
                    void error(translation[0]!);
                    continue;
                }

                children[id].querySelector("main")!.textContent =
                    translation[1]!;
            }
        }
    }

    #onmousedown(e: MouseEvent): void {
        const target = e.target as HTMLElement;

        if (target.tagName === "BUTTON") {
            const id = Number(target.id) as TranslationEndpoint;
            const children = this.#body.children;

            if (target.innerHTML === "+") {
                target.innerHTML = "-";
                children[id].querySelector("main")!.classList.remove("hidden");
            } else {
                target.innerHTML = "+";
                children[id].querySelector("main")!.classList.add("hidden");
                children[id].querySelector("main")!.innerHTML = "";
            }

            this.#translationSettings.enabledTranslations ^= 1 << id;
        } else if (target.tagName === "MAIN") {
            e.preventDefault();
            void emittery.emit(AppEvent.InsertTranslation, target.textContent);
        }
    }
}
