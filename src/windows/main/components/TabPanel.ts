import { Component } from "./Component";

import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent, BatchAction, TokenizerAlgorithm } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";
import {
    detectLang,
    getLang,
    isErr,
    readDir,
    readTextFile,
    writeTextFile,
} from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { error, info } from "@tauri-apps/plugin-log";

export class TabPanel extends Component {
    declare protected readonly element: HTMLDivElement;

    #projectSettings!: ProjectSettings;
    #tempMapsPath = "";
    #completed: string[] = [];

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

    public async init(
        projectSettings: ProjectSettings,
    ): Promise<string | undefined> {
        this.#projectSettings = projectSettings;
        this.#tempMapsPath = projectSettings.tempMapsPath;
        this.#completed = projectSettings.completed;

        const translationFiles = await readDir(projectSettings.translationPath);

        if (isErr(translationFiles)) {
            void error(translationFiles[0]!);
            return;
        }

        for (const file of translationFiles[1]!) {
            if (!file.name.endsWith(consts.TXT_EXTENSION)) {
                continue;
            }

            const content = await readTextFile(
                utils.join(projectSettings.translationPath, file.name),
            );

            if (isErr(content)) {
                void error(content[0]!);
                continue;
            }

            const lines = utils.lines(content[1]!);

            if (lines.length === 1) {
                continue;
            }

            const basename = file.name.slice(0, file.name.lastIndexOf("."));

            if (basename.startsWith("map")) {
                await this.#parseMap(
                    lines,
                    basename,
                    projectSettings.translationLanguages.sourceLanguage,
                );
            } else {
                this.addTab(
                    basename,
                    lines,
                    projectSettings.translationLanguages.sourceLanguage,
                );
            }

            void info(`${file.name}: Successfully read.`);
        }

        if (
            projectSettings.translationLanguages.sourceLanguage ===
            TokenizerAlgorithm.None
        ) {
            return await getLang();
        } else {
            return undefined;
        }
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

    public addTab(
        name: string,
        rows: string[],
        sourceLanguage: TokenizerAlgorithm,
    ): void {
        if (name === "system") {
            // Remove the game title row
            rows = rows.slice(0, -1);
        }

        let total = rows.length;
        let translated = 0;

        if (total <= 0) {
            return;
        }

        for (let l = 0; l < rows.length; l++) {
            const line = rows[l];
            const parts = utils.parts(line);

            if (!parts) {
                utils.logSplitError(name, l);
                continue;
            }

            const source = utils.source(parts);
            const translation = utils.translation(parts)[0];

            if (source === consts.BOOKMARK_COMMENT) {
                void emittery.emit(AppEvent.AddBookmark, [
                    name,
                    translation,
                    l + 1,
                ]);
            }

            if (line.startsWith(consts.COMMENT_PREFIX)) {
                total--;
            } else {
                if (
                    sourceLanguage === TokenizerAlgorithm.None &&
                    name !== "scripts" &&
                    name !== "plugins"
                ) {
                    detectLang(source);
                }

                if (translation) {
                    translated++;
                }
            }
        }

        if (total <= 0) {
            return;
        }

        const percentage = Math.floor(
            (translated / total) * consts.PERCENT_MULTIPLIER,
        );

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

        if (this.#completed.includes(name)) {
            tabButton.style.color = "lime";
        }

        void emittery.emit(AppEvent.TabAdded, [
            name,
            tabIndex,
            total,
            translated,
        ]);
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

    async #parseMap(
        lines: string[],
        filename: string,
        sourceLanguage: TokenizerAlgorithm,
    ): Promise<void> {
        const result: string[] = [];
        const mapIndices: number[] = [];

        const parseMapComment = async (): Promise<void> => {
            const mapID = mapIndices.shift();
            const tempMapPath = utils.join(
                this.#tempMapsPath,
                `map${mapID}${consts.TXT_EXTENSION}`,
            );

            const res = await writeTextFile(tempMapPath, result.join("\n"));

            if (isErr(res)) {
                void error(res[0]!);
            } else {
                this.addTab(`map${mapID}`, result, sourceLanguage);
            }

            result.length = 0;
        };

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];

            if (line.startsWith(consts.BOOKMARK_COMMENT)) {
                continue;
            } else if (line.startsWith(consts.ID_COMMENT)) {
                const parts = utils.parts(line);

                if (!parts) {
                    utils.logSplitError(filename, l);
                    continue;
                }

                const translation = utils.translation(parts)[0];
                mapIndices.push(Number(translation));

                if (result.length > 0) {
                    await parseMapComment();
                }
            }

            result.push(line);
        }

        await parseMapComment();
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

        for (const [id, label] of [
            t`Mark Complete`,
            t`Batch Translate`,
            t`Batch Trim`,
            t`Batch Wrap`,
        ].entries()) {
            const button = document.createElement("button");
            button.className = tw`h-fit w-full p-1`;
            button.innerHTML = label;
            button.id = id.toString();

            if (id !== 0) {
                button.onmouseenter = (): void => {
                    this.#submenu?.remove();
                    this.#submenu = document.createElement("div");
                    this.#submenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

                    this.#submenu.onclick = (): void => {
                        switch (id) {
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
                this.#completed.push(tabName);
                tab.style.color = "lime";
            }
        };

        document.body.appendChild(this.contextMenu);

        void emittery.emit(AppEvent.ContextMenuChanged, this.contextMenu);
    }
}
