import { DEFAULT_COLUMN_WIDTH } from "../utilities/constants";
import { tw } from "../utilities/functions";
import { MouseButton } from "./enums";
import { ProjectSettings } from "./projectsettings";
import { Settings } from "./settings";

const enum ResizeDirection {
    Left,
    Right,
}

const EDGE_THRESHOLD = 8;
const RESIZE_TOOLTIP_PADDING = 12;

export class TabContentHeader {
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

    public constructor(
        private readonly ui: MainWindowUI,
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
    ) {
        for (const [i, column] of this.projectSettings.columns.entries()) {
            const columnElement = document.createElement("input");

            columnElement.spellcheck = false;
            columnElement.className = tw`outlinePrimary backgroundPrimary inline-block p-1 outline outline-2`;
            columnElement.id = i.toString();
            columnElement.style.width = `${column[1]}px`;
            columnElement.value = column[0];

            this.ui.tabContentHeader.appendChild(columnElement);
        }

        const addColumnElement = document.createElement("button");
        addColumnElement.className = tw`outlinePrimary backgroundPrimary inline-block w-6 p-1 outline outline-2`;
        addColumnElement.textContent = "+";

        addColumnElement.onclick = () => {
            this.addColumn();
        };

        this.ui.tabContentHeader.appendChild(addColumnElement);
        this.ui.bottomScrollContent.style.width = `${this.ui.tabContent.clientWidth}px`;

        ui.tabContentHeader.addEventListener("mousedown", (event) => {
            const button = event.button as MouseButton;

            switch (button) {
                case MouseButton.Left: {
                    this.#startDrag(event);
                    break;
                }
                case MouseButton.Right:
                    // TODO: Width change input
                    break;
            }
        });

        ui.tabContentHeader.addEventListener("mousemove", (event) => {
            this.#drag(event);
        });

        ui.tabContentHeader.addEventListener("mouseup", () => {
            this.#drop();
        });

        ui.tabContentHeader.addEventListener("blur", (event) => {
            const target = event.target as HTMLElement;

            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            const columnIndex = Number(target.id);
            const columnName = target.value;

            this.projectSettings.columns[columnIndex][0] = columnName;
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
                (distanceToRight <= EDGE_THRESHOLD &&
                    target.nextElementSibling?.textContent !== "+")
            ) {
                document.body.style.cursor = "col-resize";
            } else {
                document.body.style.cursor = "";
            }

            return;
        }

        const dx = event.clientX - this.#startX;

        if (this.#resizeDirection === ResizeDirection.Right) {
            this.#previewSourceWidth = this.#draggedInitialWidth + dx;
            this.#previewAdjacentWidth = this.#adjacentInitialWidth - dx;
        } else {
            this.#previewSourceWidth = this.#draggedInitialWidth - dx;
            this.#previewAdjacentWidth = this.#adjacentInitialWidth + dx;
        }

        this.#draggedElement!.style.outline = "1px dashed red";
        this.#adjacentElement!.style.outline = "1px dashed red";

        if (this.#resizeTooltip) {
            this.#resizeTooltip.textContent = `${Math.max(this.#previewSourceWidth, 0)}px`;
            this.#resizeTooltip.style.left = `${event.clientX + RESIZE_TOOLTIP_PADDING}px`;
            this.#resizeTooltip.style.top = `${event.clientY + RESIZE_TOOLTIP_PADDING}px`;
        }
    }

    #startDrag(event: MouseEvent) {
        const target = event.target as HTMLDivElement;

        if (target.textContent === "+") {
            return;
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

        if (adjacentElement && adjacentElement.textContent !== "+") {
            event.preventDefault();
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
            this.#resizeTooltip.className = tw`pointer-none fixed z-50 border-2 px-0.5 py-1 text-base`;
            this.#resizeTooltip.style.background = "#333";
            this.#resizeTooltip.style.color = "#fff";
            document.body.appendChild(this.#resizeTooltip);
        }
    }

    #drop() {
        if (!this.#resizing) {
            return;
        }

        const draggedWidth = Math.max(this.#previewSourceWidth, 0);
        const adjacentWidth = Math.max(this.#previewAdjacentWidth, 0);
        const newDraggedWidth = `${draggedWidth}px`;
        const newAdjacentWidth = `${adjacentWidth}px`;

        this.#draggedElement!.style.width = newDraggedWidth;
        this.#adjacentElement!.style.width = newAdjacentWidth;

        this.#draggedElement!.style.outline = "";
        this.#adjacentElement!.style.outline = "";

        this.#resizing = false;
        document.body.style.cursor = "";

        if (this.#resizeTooltip) {
            document.body.removeChild(this.#resizeTooltip);
            this.#resizeTooltip = undefined;
        }

        for (const rowContainer of this.ui.tabContent.children) {
            const element = rowContainer.children[
                this.#draggedColumnIndex!
            ] as HTMLElement;
            element.style.minWidth = element.style.width = newDraggedWidth;

            const adjacentElement = rowContainer.children[
                this.#adjacentColumnIndex!
            ] as HTMLElement;
            adjacentElement.style.minWidth = adjacentElement.style.width =
                newAdjacentWidth;
        }

        this.projectSettings.columns[this.#draggedColumnIndex!][1] =
            draggedWidth;
        this.projectSettings.columns[this.#adjacentColumnIndex!][1] =
            adjacentWidth;
    }

    public addColumn() {
        for (const rowContainer of this.ui.tabContent.children) {
            const translationTextArea = document.createElement("textarea");
            translationTextArea.className = tw`outlinePrimary outlineFocused backgroundPrimary font min-h-full resize-none overflow-hidden p-1 outline outline-2 focus:z-10`;
            translationTextArea.rows = 1;
            translationTextArea.style.minWidth =
                translationTextArea.style.width = `${DEFAULT_COLUMN_WIDTH}px`;
            translationTextArea.spellcheck = false;
            translationTextArea.autocomplete = "off";
            translationTextArea.autocapitalize = "off";
            translationTextArea.autofocus = false;

            if (this.settings.fontUrl) {
                translationTextArea.style.fontFamily = "font";
            }

            rowContainer.appendChild(translationTextArea);
        }

        this.projectSettings.columns.push([
            "Translation",
            DEFAULT_COLUMN_WIDTH,
        ]);
        this.projectSettings.translationColumnCount++;

        const columnData = this.projectSettings.columns.at(-1)!;
        const columnElement = document.createElement("input");
        columnElement.spellcheck = false;
        columnElement.className = tw`outlinePrimary backgroundPrimary inline-block p-1 outline outline-2`;
        columnElement.id = (
            this.ui.tabContentHeader.childElementCount - 1
        ).toString();
        columnElement.style.width = `${columnData[1]}px`;
        columnElement.value = columnData[0];

        this.ui.tabContentHeader.insertBefore(
            columnElement,
            this.ui.tabContentHeader.lastElementChild,
        );

        this.ui.bottomScrollContent.style.width = `${this.ui.tabContent.scrollWidth}px`;
    }

    public show() {
        this.ui.tabContentHeader.classList.remove("hidden");
    }

    public hide() {
        this.ui.tabContentHeader.classList.add("hidden");
    }
}
