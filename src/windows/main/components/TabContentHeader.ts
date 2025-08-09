import { ProjectSettings, Settings } from "@classes/index";
import { MouseButton } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

const enum ResizeDirection {
    Left,
    Right,
}

const EDGE_THRESHOLD = 8;
const RESIZE_TOOLTIP_PADDING = 12;

export class TabContentHeader {
    #tabContentHeader: HTMLDivElement;
    #scrollBar: HTMLDivElement;
    #scrollBarContent: HTMLDivElement;

    #tabContent: HTMLDivElement;

    #resized = false;
    #resizing = false;
    #draggedElement?: HTMLElement;
    #adjacentElement?: HTMLElement;
    #resizeDirection = ResizeDirection.Left;
    #startX = 0;
    #draggedInitialWidth = 0;
    #adjacentInitialWidth = 0;
    #previewSourceWidth = 0;
    #previewAdjacentWidth = 0;
    #draggedColumnIndex?: number;
    #adjacentColumnIndex?: number;
    #resizeTooltip?: HTMLDivElement;
    #widthInput?: HTMLInputElement;

    public constructor(
        tabContentContainer: HTMLDivElement,
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
    ) {
        this.#tabContentHeader = document.getElementById(
            "tab-content-header",
        ) as HTMLDivElement;
        this.#scrollBar = document.getElementById(
            "bottom-scroll-bar",
        ) as HTMLDivElement;
        this.#scrollBarContent = this.#scrollBar
            .firstElementChild as HTMLDivElement;

        this.#tabContent =
            tabContentContainer.firstElementChild as HTMLDivElement;

        for (const [i, column] of this.projectSettings.columns.entries()) {
            const columnElement = document.createElement("div");
            columnElement.className =
                "p-1 inline-block outline-primary bg-primary outline outline-2";
            columnElement.id = i.toString();
            columnElement.style.width = `${column[1]}px`;

            const columnInput = document.createElement("input");
            columnInput.className = utils.tw` w-full`;
            columnInput.spellcheck = false;
            columnInput.value = column[0];

            columnElement.appendChild(columnInput);
            this.#tabContentHeader.appendChild(columnElement);
        }

        const addColumnElement = document.createElement("button");
        addColumnElement.className = utils.tw`outline-primary bg-primary inline-block w-6 p-1 outline outline-2`;
        addColumnElement.textContent = "+";

        addColumnElement.onclick = () => {
            this.addTranslationColumn();
        };

        this.#tabContentHeader.appendChild(addColumnElement);
        this.#scrollBarContent.style.width = `${this.#tabContent.clientWidth}px`;

        this.#tabContentHeader.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            if (this.#widthInput) {
                this.#widthInput.remove();
                this.#widthInput = undefined;
                return;
            }

            let target = event.target as HTMLElement | null;

            if (!target) {
                return;
            }

            while (target.parentElement !== this.#tabContentHeader) {
                target = target.parentElement as HTMLDivElement;
            }

            this.#widthInput = document.createElement("input");
            this.#widthInput.type = "number";
            this.#widthInput.value = Number.parseInt(
                target.style.width,
            ).toString();
            this.#widthInput.className = utils.tw`absolute bg-second z-50 text-base p-1 rounded-md`;
            this.#widthInput.style.left = `${event.x}px`;
            this.#widthInput.style.top = `${event.y}px`;

            this.#widthInput.addEventListener("keydown", (event) => {
                switch (event.key) {
                    case "Escape":
                        this.#widthInput!.remove();
                        break;
                    case "Enter":
                        this.#widthInput!.remove();
                        this.#resize(
                            Number(target.id),
                            `${this.#widthInput!.value}px`,
                        );
                        break;
                }
            });

            document.body.append(this.#widthInput);
        });

        this.#tabContentHeader.addEventListener("mousedown", (event) => {
            if ((event.button as MouseButton) === MouseButton.Left) {
                this.#startDrag(event);
            }
        });

        this.#tabContentHeader.addEventListener("mousemove", (event) => {
            this.#drag(event);
        });

        this.#tabContentHeader.addEventListener("mouseup", () => {
            this.#drop();
        });

        this.#tabContentHeader.addEventListener("blur", (event) => {
            const target = event.target as HTMLElement;

            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            const columnIndex = Number(target.id);
            const columnName = target.value;

            this.projectSettings.columns[columnIndex][0] = columnName;
        });

        this.#scrollBar.addEventListener("scroll", () => {
            tabContentContainer.scrollLeft = this.#scrollBar.scrollLeft;
            this.#tabContentHeader.scrollLeft = this.#scrollBar.scrollLeft;
        });
    }

    #drag(event: MouseEvent) {
        const target = event.target as HTMLDivElement;

        if (!this.#resizing) {
            const rect = target.getBoundingClientRect();
            const mouseX = event.clientX;

            const distanceToLeft = Math.abs(mouseX - rect.left);
            const distanceToRight = Math.abs(mouseX - rect.right);

            if (
                (distanceToLeft <= EDGE_THRESHOLD &&
                    target.previousElementSibling) ||
                (distanceToRight <= EDGE_THRESHOLD && target.nextElementSibling)
            ) {
                document.body.style.cursor = "col-resize";
            } else {
                document.body.style.cursor = "";
            }

            return;
        }

        this.#resized = true;
        const dx = event.clientX - this.#startX;

        if (this.#resizeDirection === ResizeDirection.Right) {
            this.#previewSourceWidth = this.#draggedInitialWidth + dx;

            if (this.#adjacentElement?.textContent !== "+") {
                this.#previewAdjacentWidth = this.#adjacentInitialWidth - dx;
            }
        } else {
            this.#previewSourceWidth = this.#draggedInitialWidth - dx;
            this.#previewAdjacentWidth = this.#adjacentInitialWidth + dx;
        }

        this.#draggedElement!.style.outline = "1px dashed red";
        if (this.#adjacentElement?.textContent !== "+") {
            this.#adjacentElement!.style.outline = "1px dashed red";
        }

        if (this.#resizeTooltip) {
            this.#resizeTooltip.textContent = `${Math.max(this.#previewSourceWidth, 0)}px`;
            this.#resizeTooltip.style.left = `${event.clientX + RESIZE_TOOLTIP_PADDING}px`;
            this.#resizeTooltip.style.top = `${event.clientY + RESIZE_TOOLTIP_PADDING}px`;
        }
    }

    #startDrag(event: MouseEvent) {
        let target = event.target as HTMLDivElement | null;

        if (!target) {
            return;
        }

        while (target.parentElement !== this.#tabContentHeader) {
            target = target.parentElement as HTMLDivElement;
        }

        if (target.textContent === "+") {
            target = target.previousElementSibling as HTMLDivElement;
        }

        const rect = target.getBoundingClientRect();
        const mouseX = event.clientX;

        const distanceToLeft = Math.abs(mouseX - rect.left);
        const distanceToRight = Math.abs(mouseX - rect.right);

        const withinLeftEdge = distanceToLeft <= EDGE_THRESHOLD;
        const withinRightEdge = distanceToRight <= EDGE_THRESHOLD;

        let adjacentElement: HTMLElement | null = null;

        if (withinLeftEdge) {
            adjacentElement = target.previousElementSibling as HTMLElement;
            this.#resizeDirection = ResizeDirection.Left;
        } else if (withinRightEdge) {
            adjacentElement = target.nextElementSibling as HTMLElement;
            this.#resizeDirection = ResizeDirection.Right;
        }

        if (!adjacentElement) {
            return;
        }

        event.preventDefault();
        this.#resized = false;
        this.#resizing = true;
        this.#draggedElement = target;
        this.#adjacentElement = adjacentElement;
        this.#startX = event.clientX;
        this.#draggedInitialWidth = this.#draggedElement.offsetWidth;
        this.#adjacentInitialWidth = this.#adjacentElement.offsetWidth;

        this.#adjacentColumnIndex = Number(adjacentElement.id);
        this.#draggedColumnIndex = Number(target.id);

        document.body.style.cursor = "col-resize";

        this.#resizeTooltip = document.createElement("div");
        this.#resizeTooltip.className = utils.tw`fixed z-50 p-1 text-base`;
        this.#resizeTooltip.style.background = "#333";
        this.#resizeTooltip.style.color = "#fff";

        document.body.appendChild(this.#resizeTooltip);
    }

    #drop() {
        if (!this.#resizing || !this.#resized) {
            return;
        }

        this.#resizing = false;
        document.body.style.cursor = "";

        if (this.#resizeTooltip) {
            document.body.removeChild(this.#resizeTooltip);
            this.#resizeTooltip = undefined;
        }

        const draggedWidth = Math.max(this.#previewSourceWidth, 0);
        const newDraggedWidth = `${draggedWidth}px`;

        this.#resize(this.#draggedColumnIndex!, newDraggedWidth);
        this.#draggedElement!.style.outline = "";

        if (this.#adjacentElement!.textContent !== "+") {
            const adjacentWidth = Math.max(this.#previewAdjacentWidth, 0);
            const newAdjacentWidth = `${adjacentWidth}px`;

            this.#resize(this.#adjacentColumnIndex!, newAdjacentWidth);
            this.#adjacentElement!.style.outline = "";
        }
    }

    #resize(columnIndex: number, width: string) {
        (
            this.#tabContentHeader.children[columnIndex] as HTMLElement
        ).style.width = width;

        for (const rowContainer of this.#tabContent.children) {
            const element = rowContainer.children[columnIndex] as HTMLElement;
            element.style.minWidth = element.style.width = width;
        }

        this.projectSettings.columns[columnIndex][1] = Number(
            width.slice(0, -2),
        );
    }

    public addTranslationColumn() {
        for (const rowContainer of this.#tabContent.children) {
            const translationTextArea = document.createElement("textarea");
            translationTextArea.className = utils.tw`outline-primary focus-outline-primary bg-primary font min-h-full resize-none overflow-hidden p-1 outline outline-2 focus:z-10`;
            translationTextArea.rows = 1;
            translationTextArea.style.minWidth =
                translationTextArea.style.width = `${consts.DEFAULT_COLUMN_WIDTH}px`;
            translationTextArea.spellcheck = false;
            translationTextArea.autocomplete = "off";
            translationTextArea.autocapitalize = "off";
            translationTextArea.autofocus = false;

            if (this.settings.font) {
                translationTextArea.style.fontFamily = "font";
            }

            rowContainer.appendChild(translationTextArea);
        }

        this.projectSettings.columns.push([
            "Translation",
            consts.DEFAULT_COLUMN_WIDTH,
        ]);
        this.projectSettings.translationColumnCount++;

        const columnData = this.projectSettings.columns.at(-1)!;
        const columnElement = document.createElement("div");
        columnElement.className =
            "p-1 inline-block outline-primary bg-primary outline outline-2";
        columnElement.id = (
            this.#tabContentHeader.childElementCount - 1
        ).toString();
        columnElement.style.width = `${columnData[1]}px`;

        const columnInput = document.createElement("input");
        columnInput.className = utils.tw`w-full`;
        columnInput.spellcheck = false;
        columnInput.value = columnData[0];

        columnElement.appendChild(columnInput);

        this.#tabContentHeader.insertBefore(
            columnElement,
            this.#tabContentHeader.lastElementChild,
        );

        this.#scrollBarContent.style.width = `${this.#tabContent.scrollWidth}px`;
    }

    public show() {
        this.#tabContentHeader.classList.remove("hidden");
    }

    public hide() {
        this.#tabContentHeader.classList.add("hidden");
    }
}
