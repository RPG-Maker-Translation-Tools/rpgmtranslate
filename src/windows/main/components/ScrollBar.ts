import { Component } from "./Component";

import { TabContent, TabContentHeader } from "./";

export class ScrollBar extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #scrollBarContent: HTMLDivElement;

    public constructor(
        private readonly tabContent: TabContent,
        private readonly tabContentHeader: TabContentHeader,
    ) {
        super("bottom-scroll-bar");

        this.#scrollBarContent = this.element
            .firstElementChild as HTMLDivElement;

        this.element.onscroll = (): void => {
            this.#onscroll();
        };
    }

    public set width(width: number) {
        this.#scrollBarContent.style.width = `${width}px`;
    }

    #onscroll(): void {
        this.tabContent.scroll = this.tabContentHeader.scroll =
            this.element.scrollLeft;
    }
}
