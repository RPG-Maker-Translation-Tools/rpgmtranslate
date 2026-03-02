import { Component } from "./Component";

import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

export class FileSelectMenu extends Component {
    readonly #body: HTMLDivElement;

    readonly #selectAllButton: HTMLButtonElement;
    readonly #deselectAllButton: HTMLButtonElement;

    readonly #changedCheckboxes = new Set<HTMLInputElement>();

    public constructor() {
        super("file-select-menu");

        this.#body = this.element.querySelector("main")! as HTMLDivElement;

        this.#selectAllButton =
            this.element.querySelector("#select-all-button")!;
        this.#deselectAllButton = this.element.querySelector(
            "#deselect-all-button",
        )!;

        this.setDraggable(true);

        this.element.onmouseup = (): void => {
            this.#onmouseup();
        };

        this.element.onmousemove = (e): void => {
            this.#onmousemove(e);
        };

        this.element.onclick = (e): void => {
            this.#onclick(e);
        };
    }

    public override get children(): HTMLCollectionOf<HTMLElement> {
        return this.#body.children as HTMLCollectionOf<HTMLElement>;
    }

    public get selected(): SelectedFiles | null {
        const selected: SelectedFiles = [];

        for (const container of this.#body.children) {
            const checkbox = container.querySelector<HTMLInputElement>(
                'input[type="checkbox"]',
            )!;

            if (!checkbox.checked) {
                continue;
            }

            const label = container.querySelector("span")!;
            const filename = label.textContent;

            const range =
                container.querySelector<HTMLInputElement>(
                    'input[type="text"]',
                )!;

            if (
                range.value &&
                !/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(range.value)
            ) {
                alert(
                    t`Incorrect range value. Allowed syntax is: comma-separated list of complete ranges (e.g. 1-5), single numbers (e.g. 9).`,
                );

                return null;
            }

            selected.push([filename, this.#preprocessRange(range.value)]);
        }

        return selected;
    }

    public init(tabs: Tabs): void {
        this.#body.innerHTML = "";

        for (const tabName in tabs) {
            const checkboxContainer = document.createElement("label");
            checkboxContainer.className = tw`custom-checkbox flex justify-between`;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = tw`border-primary`;

            const checkboxLabel = document.createElement("span");
            checkboxLabel.className = tw`text-second select-none`;
            checkboxLabel.textContent = tabName;

            const input = document.createElement("input");
            input.className = tw`h-4 w-16 rounded-sm`;
            input.type = "text";
            input.placeholder = "1-99,101";

            checkboxContainer.append(checkbox, checkboxLabel, input);
            this.#body.appendChild(checkboxContainer);
        }
    }

    public selectAll(): void {
        for (const container of this.#body.children) {
            container.querySelector("input")!.checked = true;
            const label = container.querySelector("span")!;
            label.style.color = "inherit";
        }
    }

    public deselectAll(): void {
        for (const container of this.#body.children) {
            (container.firstElementChild as HTMLInputElement).checked = false;
            const label = container.lastElementChild as HTMLLabelElement;
            label.style.color = "inherit";
        }
    }

    #onmousemove(event: MouseEvent): void {
        if (event.buttons === 1) {
            let target = event.target as HTMLInputElement | null;

            const input =
                target?.querySelector("input") ??
                target?.previousElementSibling;

            if (input) {
                target = input as HTMLInputElement;
            }

            if (target?.tagName === "INPUT") {
                if (!this.#changedCheckboxes.has(target)) {
                    if (!target.checked) {
                        target.checked = true;
                    } else {
                        target.checked = false;
                    }

                    this.#changedCheckboxes.add(target);
                }
            }
        }
    }

    #onmouseup(): void {
        this.#changedCheckboxes.clear();
    }

    #onclick(event: MouseEvent): void {
        let target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        const input =
            target.querySelector("input") ??
            (this.#body.contains(target)
                ? target.previousElementSibling
                : null);

        if (input) {
            target = input as HTMLInputElement;
        }

        if (target.tagName === "INPUT") {
            for (const container of this.#body.children) {
                const label = container.querySelector("span")!;
                label.style.color = "inherit";
            }

            this.#changedCheckboxes.add(target as HTMLInputElement);
            return;
        }

        switch (target) {
            case this.#selectAllButton:
                this.selectAll();
                break;
            case this.#deselectAllButton:
                this.deselectAll();
                break;
        }
    }

    #preprocessRange(rangeStr: string): FileRange {
        const ranges: SingleRange[] = [];

        for (const part of rangeStr.split(",")) {
            const trimmed = part.trim();

            if (!trimmed) {
                continue;
            }

            if (trimmed.includes("-")) {
                const [start, end] = trimmed.split("-").map(Number);

                if (!Number.isNaN(start) && !Number.isNaN(end)) {
                    ranges.push([Math.min(start, end), Math.max(start, end)]);
                }
            } else {
                const num = Number(trimmed);

                if (!Number.isNaN(num)) {
                    ranges.push([num, num]);
                }
            }
        }

        ranges.sort((a, b) => a[0] - b[0]);

        const merged: SingleRange[] = [];

        for (const range of ranges) {
            const last = merged.at(merged.length - 1);

            if (!last || range[0] > last[1] + 1) {
                merged.push(range);
            } else {
                last[1] = Math.max(last[1], range[1]);
            }
        }

        return merged;
    }
}
