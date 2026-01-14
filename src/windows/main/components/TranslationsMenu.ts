import { Component } from "./Component";

import { ProjectSettings, TranslationSettings } from "@lib/classes";
import { TokenizerAlgorithm, TranslationEndpoint } from "@lib/enums";

import { t } from "@lingui/core/macro";

import { isErr, translateSingle } from "@utils/invokes";

import { error } from "@tauri-apps/plugin-log";

// TODO: Allow to insert translations to the textareas

export class TranslationsMenu extends Component {
    #projectSettings!: ProjectSettings;
    #translationSettings!: TranslationSettings;
    #glossary!: Glossary;
    #tabInfo!: TabInfo;

    public constructor() {
        super("translations-menu");

        this.setDraggable(true);

        this.element.onclick = (e): void => {
            this.#onclick(e);
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

        const children = this.element.lastElementChild!.children;

        for (
            let i = TranslationEndpoint.Google;
            i <= TranslationEndpoint.Gemini;
            i++
        ) {
            if (this.#translationSettings.enabledTranslations & (1 << i)) {
                children[i].firstElementChild!.lastElementChild!.innerHTML =
                    "-";
                children[i].lastElementChild!.classList.remove("hidden");
            } else {
                children[i].firstElementChild!.lastElementChild!.innerHTML =
                    "+";
                children[i].lastElementChild!.classList.add("hidden");
            }
        }
    }

    public async showTranslations(text: string): Promise<void> {
        if (this.hidden) {
            return;
        }

        const children = this.element.lastElementChild!.children;
        const buttons = this.element.querySelectorAll("button");

        for (const button of buttons) {
            if (button.innerHTML === "-") {
                const id = Number(button.id);

                if (
                    this.#projectSettings.translationLanguages
                        .sourceLanguage === TokenizerAlgorithm.None
                ) {
                    children[id].lastElementChild!.innerHTML =
                        t`Source language is not set.`;
                    return;
                }

                if (
                    this.#projectSettings.translationLanguages
                        .translationLanguage === TokenizerAlgorithm.None
                ) {
                    children[id].lastElementChild!.innerHTML =
                        t`Translation language is not set.`;
                    return;
                }

                const glossary = [];

                if (this.#translationSettings.endpoints[id].useGlossary) {
                    for (const term of this.#glossary) {
                        glossary.push({
                            term: term.source,
                            translation: term.translation,
                            note: term.note,
                        });
                    }
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
                    glossary,
                    text,
                    normalize: false,
                };

                const translation = await translateSingle(args);

                if (isErr(translation)) {
                    void error(translation[0]!);
                    continue;
                }

                children[id].lastElementChild!.innerHTML = translation[1]!;
            }
        }
    }

    #onclick(e: MouseEvent): void {
        const target = e.target as HTMLElement;

        if (target.tagName === "BUTTON") {
            const id = Number(target.id) as TranslationEndpoint;
            const children = this.element.lastElementChild!.children;

            if (target.innerHTML === "+") {
                target.innerHTML = "-";
                children[id].lastElementChild!.classList.remove("hidden");
            } else {
                target.innerHTML = "+";
                children[id].lastElementChild!.classList.add("hidden");
                children[id].lastElementChild!.innerHTML = "";
            }

            this.#translationSettings.enabledTranslations ^= 1 << id;
        }
    }
}
