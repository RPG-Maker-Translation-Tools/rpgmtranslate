import { emittery } from "@classes/emittery";
import { AppEvent } from "@lib/enums";
import { objectIsEmpty, tw } from "@utils/functions";
import { Component } from "./Component";

export class BookmarkMenu extends Component {
    declare protected readonly element: HTMLDivElement;
    readonly #bookmarks: Bookmarks = {};

    public constructor() {
        super("bookmark-menu");

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    public override get children(): HTMLCollectionOf<HTMLButtonElement> {
        return super.children as HTMLCollectionOf<HTMLButtonElement>;
    }

    public deleteBookmark(file: string, rowNumber: number): void {
        for (const bookmark of this.children) {
            const bookmarkText = `${file}-${rowNumber}`;

            if (bookmark.textContent.startsWith(bookmarkText)) {
                bookmark.remove();
            }
        }

        delete this.#bookmarks[file][rowNumber];

        if (objectIsEmpty(this.#bookmarks.file)) {
            delete this.#bookmarks[file];
        }
    }

    public addBookmark(
        file: string,
        description: string,
        rowNumber: number,
    ): void {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = tw`bg-primary hover-bg-second flex h-auto flex-row items-center justify-center p-1`;
        bookmarkElement.innerHTML = `${file}-${rowNumber}<br>${description}`;

        if (!(file in this.#bookmarks)) {
            this.#bookmarks[file] = {};
        }

        this.#bookmarks[file][rowNumber] = description;
        this.element.appendChild(bookmarkElement);
    }

    async #onclick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement | null;

        if (!target || target === this.element) {
            return;
        }

        const [filename, row] = target.firstChild!.textContent!.split("-");
        await emittery.emit(AppEvent.ChangeTab, filename);
        await emittery.emit(AppEvent.ScrollIntoRow, Number(row));
    }
}
