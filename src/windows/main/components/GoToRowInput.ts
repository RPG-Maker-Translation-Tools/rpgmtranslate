import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

export class GoToRowInput extends Component {
    declare protected readonly element: HTMLInputElement;

    public constructor() {
        super("go-to-row-input");

        this.element.onkeydown = (e): void => {
            this.#onkeydown(e);
        };
    }

    public set placeholder(placeholder: string) {
        this.element.placeholder = placeholder;
    }

    public override show(): void {
        this.element.classList.remove("hidden");
    }

    #onkeydown(event: KeyboardEvent): void {
        if (event.code === "Enter") {
            void emittery.emit(
                AppEvent.ScrollIntoRow,
                this.element.valueAsNumber,
            );

            this.element.value = "";
            this.element.classList.add("hidden");
        } else if (event.code === "Escape") {
            this.element.value = "";
            this.element.classList.add("hidden");
        }
    }
}
