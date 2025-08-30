import { emittery } from "@classes/emittery";
import { AppEvent, Language } from "@lib/enums";
import { Component } from "./Component";

export class LanguageMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #ruButton: HTMLButtonElement;
    readonly #enButton: HTMLButtonElement;

    #language = Language.English;

    public constructor() {
        super("language-menu");
        this.#ruButton = this.element.querySelector("#ru-button")!;
        this.#enButton = this.element.querySelector("#en-button")!;

        this.element.onclick = async (event): Promise<void> => {
            switch (event.target) {
                case this.#ruButton:
                    if (this.#language !== Language.Russian) {
                        await emittery.emit(
                            AppEvent.Retranslate,
                            Language.Russian,
                        );
                    }
                    break;
                case this.#enButton:
                    if (this.#language !== Language.English) {
                        await emittery.emit(
                            AppEvent.Retranslate,
                            Language.English,
                        );
                    }
                    break;
            }
        };
    }

    public updateLanguage(language: Language): void {
        this.#language = language;
    }
}
