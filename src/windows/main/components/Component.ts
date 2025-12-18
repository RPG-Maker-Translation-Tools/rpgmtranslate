export class Component {
    protected readonly element: HTMLElement;

    protected constructor(id: string) {
        this.element = document.getElementById(id)!;
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

    public move(x: number, y: number): void {
        this.style.x = `${x}px`;
        this.style.y = `${y}px`;
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

        if (x !== undefined) {
            this.element.style.left = `${x}px`;
        }

        if (y !== undefined) {
            this.element.style.top = `${y}px`;
        }
    }

    public hide(): void {
        this.element.classList.add("hidden");
    }

    public childAt(index: number): HTMLElement {
        return this.element.children[index] as HTMLElement;
    }
}
