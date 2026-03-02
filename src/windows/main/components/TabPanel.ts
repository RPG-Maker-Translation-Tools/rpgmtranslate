import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent, BatchAction } from "@lib/enums";

import * as consts from "@utils/constants";
import { tw } from "@utils/functions";

import { t } from "@lingui/core/macro";

export class TabPanel extends Component {
    declare protected readonly element: HTMLDivElement;

    #projectSettings!: ProjectSettings;

    #submenu: HTMLDivElement | null = null;

    public constructor() {
        super("tab-panel");

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };

        this.element.oncontextmenu = (e): void => {
            this.#oncontextmenu(e);
        };

        this.element.blur = (): void => {
            this.contextMenu?.remove();
            this.contextMenu = null;
        };
    }

    public override get children(): HTMLCollectionOf<HTMLButtonElement> {
        return super.children as HTMLCollectionOf<HTMLButtonElement>;
    }

    public get tabCount(): number {
        return this.childCount;
    }

    public get tabs(): HTMLCollectionOf<HTMLButtonElement> {
        return this.children;
    }

    public override get hidden(): boolean {
        return this.element.classList.contains("-translate-x-full");
    }

    public init(projectSettings: ProjectSettings): void {
        this.#projectSettings = projectSettings;
    }

    public tab(index: number): HTMLButtonElement {
        return this.childAt(index) as HTMLButtonElement;
    }

    public override hide(): void {
        this.element.classList.replace("translate-x-0", "-translate-x-full");
    }

    public override show(): void {
        this.element.classList.replace("-translate-x-full", "translate-x-0");
    }

    public clear(): void {
        this.element.innerHTML = "";
    }

    public updateTabProgress(tabIndex: number, percentage: number): void {
        const progressBar = this.tab(tabIndex).lastElementChild
            ?.firstElementChild as HTMLElement | null;

        if (progressBar) {
            progressBar.style.width = progressBar.innerHTML = `${percentage}%`;

            if (percentage === consts.PERCENT_MULTIPLIER) {
                progressBar.classList.replace("bg-third", "bg-green-600");
            } else {
                progressBar.classList.replace("bg-green-600", "bg-third");
            }
        }
    }

    public addTab(name: string, percentage: number): number {
        const tabIndex = this.tabCount;

        const tabButton = document.createElement("button");
        tabButton.className = tw`flex max-h-8 w-full cursor-pointer flex-row justify-between p-1`;
        tabButton.id = tabIndex.toString();

        const stateSpan = document.createElement("span");
        stateSpan.innerHTML = name;
        stateSpan.className = "pr-1";
        tabButton.appendChild(stateSpan);

        const progressBar = document.createElement("div");
        const progressMeter = document.createElement("div");

        progressBar.className = tw`bg-second w-16 rounded-xs`;
        progressMeter.className = tw`bg-third rounded-xs p-0.5 text-center text-xs leading-none font-medium`;
        progressMeter.style.width =
            progressMeter.textContent = `${percentage}%`;

        if (percentage === consts.PERCENT_MULTIPLIER) {
            progressMeter.classList.replace("bg-third", "bg-green-600");
        }

        progressBar.appendChild(progressMeter);
        tabButton.appendChild(progressBar);
        this.element.appendChild(tabButton);

        if (this.#projectSettings.completed.includes(name)) {
            tabButton.style.color = "lime";
        }

        return tabIndex;
    }

    async #onclick(event: MouseEvent): Promise<void> {
        let target = event.target as HTMLElement | null;

        if (!target || target === this.element) {
            return;
        }

        while (target.parentElement !== this.element) {
            target = target.parentElement!;
        }

        await emittery.emit(
            AppEvent.ChangeTab,
            target.firstElementChild!.textContent,
        );
    }

    #oncontextmenu(e: MouseEvent): void {
        e.preventDefault();

        let tab = e.target as HTMLElement | null;

        if (!tab) {
            return;
        }

        while (tab.tagName !== "BUTTON") {
            tab = tab.parentElement!;
        }

        const tabName = tab.firstElementChild!.textContent;

        this.contextMenu = document.createElement("div");
        this.contextMenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

        const items = [
            t`Mark Complete`,
            t`Batch Translate`,
            t`Batch Trim`,
            t`Batch Wrap`,
        ];

        for (let i = 0; i < items.length; i++) {
            const button = document.createElement("button");
            button.className = tw`h-fit w-full p-1`;
            button.innerHTML = items[i];
            button.id = i.toString();

            if (i !== 0) {
                button.onmouseenter = (): void => {
                    this.#submenu?.remove();
                    this.#submenu = document.createElement("div");
                    this.#submenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

                    this.#submenu.onclick = (): void => {
                        switch (i) {
                            case 1:
                                void emittery.emit(AppEvent.BatchAction, [
                                    tabName,
                                    BatchAction.Translate,
                                    this.#projectSettings
                                        .translationColumns[0][1],
                                ]);
                                break;
                            case 2:
                                void emittery.emit(AppEvent.BatchAction, [
                                    tabName,
                                    BatchAction.Trim,
                                    this.#projectSettings
                                        .translationColumns[0][1],
                                ]);
                                break;
                            case 3:
                                void emittery.emit(AppEvent.BatchAction, [
                                    tabName,
                                    BatchAction.Wrap,
                                    this.#projectSettings
                                        .translationColumns[0][1],
                                ]);
                                break;
                        }
                    };

                    for (const [columnName, columnIndex] of this
                        .#projectSettings.translationColumns) {
                        const button = document.createElement("button");
                        button.className = tw`h-fit w-full p-1`;
                        button.innerHTML = `${columnName} (${columnIndex})`;

                        this.#submenu.appendChild(button);
                    }

                    const rect = button.getBoundingClientRect();

                    this.#submenu.style.top = `${rect.top}px`;
                    this.#submenu.style.left = `${rect.left + rect.width}px`;

                    this.contextMenu!.appendChild(this.#submenu);
                };
            }

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
                this.#projectSettings.completed.push(tabName);
                tab.style.color = "lime";
            }
        };

        document.body.appendChild(this.contextMenu);

        void emittery.emit(AppEvent.ContextMenuChanged, this.contextMenu);
    }
}
