import { emittery } from "@classes/emittery";
import { ProjectSettings } from "@lib/classes";
import { AppEvent, MouseButton } from "@lib/enums";
import { DEFAULT_COLUMN_WIDTH } from "@utils/constants";
import { tw } from "@utils/functions";
import { Component } from "./Component";

import { t } from "@lingui/core/macro";

const enum ResizeDirection {
    Left,
    Right,
}

const EDGE_THRESHOLD = 8;
const RESIZE_TOOLTIP_PADDING = 12;

export class TabContentHeader extends Component {
    declare protected readonly element: HTMLDivElement;

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

    #projectSettings!: ProjectSettings;

    public constructor() {
        super("tab-content-header");

        this.element.onmousemove = (e): void => {
            this.#onmousemove(e);
        };

        this.element.onmousedown = (e): void => {
            this.#onmousedown(e);
        };

        this.element.onmouseup = (): void => {
            this.#onmouseup();
        };

        this.element.oncontextmenu = (e): void => {
            this.#oncontextmenu(e);
        };

        document.addEventListener("focusout", (e) => {
            this.#onfocusout(e);
        });
    }

    public get columns(): HTMLCollectionOf<HTMLDivElement> {
        return super.children as HTMLCollectionOf<HTMLDivElement>;
    }

    public set scroll(pos: number) {
        this.element.scrollLeft = pos;
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
        const columns = this.#projectSettings.translationColumns;
        const initialized = this.childCount !== 0;

        for (let i = 0; i < columns.length + 2; i++) {
            let columnName = "";
            let columnWidth = 0;

            if (i === 0) {
                columnName = t`Row`;
                columnWidth = this.#projectSettings.rowColumnWidth;
            } else if (i === 1) {
                columnName = t`Source`;
                columnWidth = this.#projectSettings.sourceColumnWidth;
            } else {
                columnName = columns[i - 2][0];
                columnWidth = columns[i - 2][1];
            }

            const columnElement = document.createElement("div");
            columnElement.className =
                "p-1 inline-block outline-primary bg-primary outline outline-2";
            columnElement.id = i.toString();
            columnElement.style.width = `${columnWidth}px`;

            if (i < 2) {
                columnElement.innerHTML = columnName;
            } else {
                const columnInput = document.createElement("input");
                columnInput.className = tw`w-full`;
                columnInput.spellcheck = false;
                columnInput.value = columnName;
                columnElement.appendChild(columnInput);
            }

            if (initialized) {
                this.element.replaceChild(
                    columnElement,
                    this.element.children[i],
                );
            } else {
                this.element.appendChild(columnElement);
            }
        }

        const addColumnElement = document.createElement("button");
        addColumnElement.className = tw`outline-primary bg-primary inline-block w-6 p-1 outline outline-2`;
        addColumnElement.textContent = "+";

        addColumnElement.onclick = (): void => {
            this.addTranslationColumn();
        };

        if (initialized) {
            this.element.replaceChild(
                addColumnElement,
                this.element.lastElementChild!,
            );
        } else {
            this.element.appendChild(addColumnElement);
        }
    }

    public addTranslationColumn(): void {
        void emittery.emit(AppEvent.ColumnAdded);

        const columnElement = document.createElement("div");
        columnElement.className =
            "p-1 inline-block outline-primary bg-primary outline outline-2";
        columnElement.id = (this.element.childElementCount - 1).toString();
        columnElement.style.width = `${DEFAULT_COLUMN_WIDTH}px`;

        const columnInput = document.createElement("input");
        columnInput.className = tw`w-full`;
        columnInput.spellcheck = false;
        columnInput.value = t`Translation`;

        columnElement.appendChild(columnInput);
        this.element.insertBefore(columnElement, this.element.lastElementChild);
    }

    public override show(): void {
        this.element.classList.remove("hidden");
    }

    #resize(columnIndex: number, width: number): void {
        if (columnIndex === 0) {
            this.#projectSettings.rowColumnWidth = width;
        } else if (columnIndex === 1) {
            this.#projectSettings.sourceColumnWidth = width;
        } else {
            this.#projectSettings.translationColumns[columnIndex - 2][1] =
                width;
        }

        this.#draggedElement!.style.width = `${width}px`;
        void emittery.emit(AppEvent.ColumnResized, [columnIndex, width]);
    }

    #onmousemove(event: MouseEvent): void {
        const target = event.target as HTMLDivElement | null;

        if (!target) {
            return;
        }

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

    #onmousedown(event: MouseEvent): void {
        let target = event.target as HTMLDivElement | null;

        if ((event.button as MouseButton) !== MouseButton.Left) {
            return;
        }

        if (!target || target === this.element) {
            return;
        }

        while (target.parentElement !== this.element) {
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

        let adjacentElement: HTMLDivElement | null = null;

        if (withinLeftEdge) {
            adjacentElement = target.previousElementSibling as HTMLDivElement;
            this.#resizeDirection = ResizeDirection.Left;
        } else if (withinRightEdge) {
            adjacentElement = target.nextElementSibling as HTMLDivElement;
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
        this.#resizeTooltip.className = tw`fixed z-50 p-1 text-base`;
        this.#resizeTooltip.style.background = "#333";
        this.#resizeTooltip.style.color = "#fff";

        document.body.appendChild(this.#resizeTooltip);
    }

    #onmouseup(): void {
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
        this.#resize(this.#draggedColumnIndex!, draggedWidth);
        this.#draggedElement!.style.outline = "";

        if (this.#adjacentElement!.textContent !== "+") {
            const adjacentWidth = Math.max(this.#previewAdjacentWidth, 0);
            this.#resize(this.#adjacentColumnIndex!, adjacentWidth);
            this.#adjacentElement!.style.outline = "";
        }
    }

    #oncontextmenu(event: MouseEvent): void {
        event.preventDefault();

        if (this.#widthInput) {
            this.#widthInput.remove();
            this.#widthInput = undefined;
            return;
        }

        let target = event.target as HTMLElement | null;

        if (!target || target === this.element) {
            return;
        }

        while (target.parentElement !== this.element) {
            target = target.parentElement as HTMLDivElement;
        }

        this.#widthInput = document.createElement("input");
        this.#widthInput.type = "number";
        this.#widthInput.value = Number.parseInt(target.style.width).toString();
        this.#widthInput.className = tw`bg-second absolute z-50 rounded-md p-1 text-base`;
        this.#widthInput.style.left = `${event.x}px`;
        this.#widthInput.style.top = `${event.y}px`;

        this.#widthInput.onkeydown = (event): void => {
            switch (event.code) {
                case "Escape":
                    this.#widthInput!.remove();
                    break;
                case "Enter":
                    this.#widthInput!.remove();
                    this.#resize(
                        Number(target.id),
                        this.#widthInput!.valueAsNumber,
                    );
                    break;
            }
        };

        document.body.appendChild(this.#widthInput);
    }

    #onfocusout(event: FocusEvent): void {
        if (this.hidden) {
            return;
        }

        const target = event.target as HTMLInputElement;

        if (target instanceof HTMLInputElement) {
            const columnIndex = Number(target.id);
            const columnName = target.value;

            void emittery.emit(AppEvent.ColumnRenamed, [
                columnIndex,
                columnName,
            ]);
        }
    }
}
