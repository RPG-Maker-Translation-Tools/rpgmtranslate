import { emittery } from "@classes/emittery";
import { ProjectSettings } from "@lib/classes";
import { AppEvent } from "@lib/enums";
import { Component } from "./Component";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { tw } from "@utils/functions";

import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export class TabPanel extends Component {
    declare protected readonly element: HTMLDivElement;
    #tempMapsPath = "";

    public constructor() {
        super("tab-panel");

        this.element.onclick = async (e): Promise<void> => {
            await this.#onclick(e);
        };
    }

    public override get children(): HTMLCollectionOf<HTMLButtonElement> {
        return super.children as HTMLCollectionOf<HTMLButtonElement>;
    }

    public get tabCount(): number {
        return super.childCount;
    }

    public get tabs(): HTMLCollectionOf<HTMLButtonElement> {
        return super.children as HTMLCollectionOf<HTMLButtonElement>;
    }

    public override get hidden(): boolean {
        return this.element.classList.contains("-translate-x-full");
    }

    public async init(projectSettings: ProjectSettings): Promise<void> {
        this.#tempMapsPath = projectSettings.tempMapsPath;

        const translationFiles = await readDir(
            projectSettings.translationPath,
        ).catch((err) => {
            utils.logErrorIO(projectSettings.translationPath, err);
        });

        if (!translationFiles) {
            return;
        }

        for (const translationFile of translationFiles) {
            if (!translationFile.name.endsWith(consts.TXT_EXTENSION)) {
                continue;
            }

            const translationFileContent = await readTextFile(
                utils.join(
                    projectSettings.translationPath,
                    translationFile.name,
                ),
            ).catch((err) => {
                utils.logErrorIO(projectSettings.translationPath, err);
                return "";
            });

            if (!translationFileContent) {
                continue;
            }

            const contentLines = utils.lines(translationFileContent);

            if (contentLines.length === 1) {
                continue;
            }

            const basename = translationFile.name.slice(
                0,
                translationFile.name.lastIndexOf("."),
            );

            if (basename.startsWith("map")) {
                await this.#parseMap(contentLines, basename);
            } else {
                for (let i = 0; i < contentLines.length; i++) {
                    const line = contentLines[i];
                    const parts = utils.parts(line);

                    if (!parts) {
                        // todo
                        continue;
                    }

                    const source = utils.source(parts);
                    const translation = utils.translation(parts)[0];

                    if (source === consts.BOOKMARK_COMMENT) {
                        await emittery.emit(AppEvent.AddBookmark, [
                            basename,
                            translation,
                            i + 1,
                        ]);
                    }
                }

                this.addTab(basename, contentLines);
            }
        }
    }

    public tab(index: number): HTMLButtonElement {
        return super.childAt(index) as HTMLButtonElement;
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

    public addTab(name: string, rows: string[]): void {
        if (name === "system") {
            // Remove the game title row
            rows = rows.slice(0, -1);
        }

        let total = rows.length;
        let translated = 0;

        if (total <= 0) {
            return;
        }

        for (const line of rows) {
            if (line.startsWith(consts.COMMENT_PREFIX)) {
                total--;
            } else {
                const translation = utils.translation(utils.parts(line)!)[0];

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
        tabButton.className = tw`bg-primary hover-bg-primary flex h-8 w-full cursor-pointer flex-row justify-center p-1`;
        tabButton.id = tabIndex.toString();

        const stateSpan = document.createElement("span");
        stateSpan.innerHTML = name;
        stateSpan.className = "pr-1";
        tabButton.appendChild(stateSpan);

        const progressBar = document.createElement("div");
        const progressMeter = document.createElement("div");

        progressBar.className = tw`bg-second w-full rounded-xs`;
        progressMeter.className = tw`bg-third text-primary rounded-xs p-0.5 text-center text-xs leading-none font-medium`;
        progressMeter.style.width =
            progressMeter.textContent = `${percentage}%`;

        if (percentage === consts.PERCENT_MULTIPLIER) {
            progressMeter.classList.replace("bg-third", "bg-green-600");
        }

        progressBar.appendChild(progressMeter);
        tabButton.appendChild(progressBar);
        this.element.appendChild(tabButton);

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

    async #parseMap(lines: string[], filename: string): Promise<void> {
        const result: string[] = [];
        const mapIndices: number[] = [];

        const parseMapComment = async (): Promise<void> => {
            const mapID = mapIndices.shift();
            const tempMapPath = utils.join(
                this.#tempMapsPath,
                `map${mapID}${consts.TXT_EXTENSION}`,
            );

            await writeTextFile(tempMapPath, result.join("\n")).catch((err) => {
                utils.logErrorIO(tempMapPath, err);
            });

            this.addTab(`map${mapID}`, result);
            result.length = 0;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const parts = utils.parts(line);

            if (!parts) {
                // todo
                continue;
            }

            const source = utils.source(parts);
            const translation = utils.translation(parts)[0];

            if (source === consts.BOOKMARK_COMMENT) {
                await emittery.emit(AppEvent.AddBookmark, [
                    filename,
                    translation,
                    i + 1,
                ]);
            } else {
                if (source === consts.MAP_COMMENT) {
                    mapIndices.push(Number(translation));

                    if (result.length > 0) {
                        await parseMapComment();
                    }
                }

                result.push(line);
            }
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
}
