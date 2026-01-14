import { emittery } from "@lib/classes/emittery";
import { AppEvent, MouseButton } from "@lib/enums";
import { t } from "@lingui/core/macro";
import { tw } from "@utils/functions";

export class Component {
    public x: number;
    public y: number;

    protected readonly element: HTMLElement;

    protected contextMenu: HTMLDivElement | null = null;

    #draggable = false;
    #dragging = false;

    #startX = 0;
    #startY = 0;

    protected constructor(id: string) {
        this.element = document.getElementById(id)!;
        this.x = 0;
        this.y = 0;

        this.element.addEventListener("mousedown", (e) => {
            if (!this.#draggable) {
                return;
            }

            this.#mousedownDraggableCb(e);
        });

        this.element.addEventListener("mousemove", (e) => {
            this.#mousemoveDraggableCb(e);
        });

        this.element.addEventListener("mouseup", () => {
            this.#mouseupDraggableCb();
        });

        this.element.addEventListener("contextmenu", (e) => {
            this.#createRestorePositionMenu(e);
        });
    }

    public get hidden(): boolean {
        return this.element.classList.contains("hidden");
    }

    public get firstChild(): HTMLElement {
        return this.element.firstElementChild as HTMLElement;
    }

    public get lastChild(): HTMLElement {
        return this.element.lastChild as HTMLElement;
    }

    public get children(): HTMLCollectionOf<HTMLElement> {
        return this.element.children as HTMLCollectionOf<HTMLElement>;
    }

    public get childCount(): number {
        return this.element.childElementCount;
    }

    public get textContent(): string {
        return this.element.textContent;
    }

    public get outerHTML(): string {
        return this.element.outerHTML;
    }

    public get innerHTML(): string {
        return this.element.innerHTML;
    }

    public get scrollWidth(): number {
        return this.element.scrollWidth;
    }

    public get clientHeight(): number {
        return this.element.clientHeight;
    }

    public get classList(): DOMTokenList {
        return this.element.classList;
    }

    public get style(): CSSStyleDeclaration {
        return this.element.style;
    }

    public set outerHTML(html: string) {
        this.element.outerHTML = html;
    }

    public set innerHTML(html: string) {
        this.element.innerHTML = html;
    }

    public set textContent(text: string) {
        this.element.textContent = text;
    }

    public set left(left: string) {
        this.element.style.left = left;
    }

    public set top(top: string) {
        this.element.style.top = top;
    }

    public move(x: number, y: number): void {
        this.x = x;
        this.y = y;

        this.style.transform = `translate(${x}px, ${y}px)`;
    }

    public focus(): void {
        this.element.focus();
    }

    public append(node: Node): void {
        this.element.appendChild(node);
    }

    public contains(node: Node): boolean {
        return this.element.contains(node);
    }

    public show(x?: number, y?: number): void {
        this.element.classList.remove("hidden");

        if (x !== undefined && y !== undefined) {
            if (this.x && this.y) {
                this.element.style.transform = `translate(${x}px, ${y}px)`;
            } else {
                this.element.style.left = `${x}px`;
                this.element.style.top = `${y}px`;
            }
        }
    }

    public hide(): void {
        this.element.classList.add("hidden");
    }

    public childAt(index: number): HTMLElement {
        return this.element.children[index] as HTMLElement;
    }

    public querySelectorAll(query: string): NodeListOf<HTMLElement> {
        return this.element.querySelectorAll(query);
    }

    public setDraggable(enabled: boolean): void {
        this.#draggable = enabled;
    }

    #mouseupDraggableCb(): void {
        this.element.style.cursor = "auto";
        this.#dragging = false;
    }

    #mousedownDraggableCb(e: MouseEvent): void {
        const target = e.target as HTMLElement;

        if (target.id !== "menu-header" && !target.closest("#menu-header")) {
            return;
        }

        if ((e.button as MouseButton) === MouseButton.Left) {
            this.#dragging = true;
            this.element.style.cursor = "grabbing";

            this.#startX = e.x - this.x;
            this.#startY = e.y - this.y;
        }
    }

    #mousemoveDraggableCb(e: MouseEvent): void {
        if (!this.#dragging) {
            return;
        }

        this.x = e.x - this.#startX;
        this.y = e.y - this.#startY;

        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    #createRestorePositionMenu(e: MouseEvent): void {
        if (!this.#draggable) {
            return;
        }

        e.preventDefault();

        const target = e.target as HTMLElement;

        if (target.tagName !== "HEADER") {
            return;
        }

        this.contextMenu = document.createElement("div");
        this.contextMenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

        const items = [t`Restore Position`];

        for (let i = 0; i < items.length; i++) {
            const button = document.createElement("button");
            button.className = tw`h-fit w-full p-1`;
            button.innerHTML = items[i];
            button.id = i.toString();
            this.contextMenu.appendChild(button);
        }

        this.contextMenu.style.top = `${e.y}px`;
        this.contextMenu.style.left = `${e.x}px`;

        this.contextMenu.onclick = (e): void => {
            const target = e.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (target.id === "0") {
                this.move(0, 0);
            }
        };

        document.body.appendChild(this.contextMenu);

        void emittery.emit(AppEvent.ContextMenuChanged, this.contextMenu);
    }
}
