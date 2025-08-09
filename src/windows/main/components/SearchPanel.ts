import { MatchType } from "@enums/MatchType";
import { MouseButton } from "@enums/MouseButton";
import { SearchAction } from "@enums/SearchAction";
import { SearchMenu } from "./SearchMenu";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

import { t } from "@lingui/core/macro";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

export class SearchPanel {
    #searchPanel: HTMLDivElement;
    public searchPanelContent: HTMLDivElement;
    #logFileSelect: HTMLSelectElement;
    #switchPanelButton: HTMLButtonElement;
    public searchCurrentPage: HTMLSpanElement;
    #pageSelectContainer: HTMLDivElement;
    public searchTotalPages: HTMLSpanElement;

    public constructor(private readonly searchMenu: SearchMenu) {
        this.#searchPanel = document.getElementById(
            "search-panel",
        ) as HTMLDivElement;
        this.searchPanelContent = this.#searchPanel.querySelector(
            "#search-panel-content",
        )!;
        this.#switchPanelButton = this.#searchPanel.querySelector(
            "#switch-panel-button",
        )!;
        this.#logFileSelect =
            this.#searchPanel.querySelector("#log-file-select")!;
        this.searchCurrentPage = this.#searchPanel.querySelector(
            "#search-current-page",
        )!;
        this.#pageSelectContainer = this.#searchPanel.querySelector(
            "#page-select-container",
        )!;
        this.searchTotalPages = this.#searchPanel.querySelector(
            "#search-total-pages",
        )!;

        this.#searchPanel.addEventListener("click", (event) => {
            this.#handleSearchPanelClick(event);
        });

        this.searchPanelContent.addEventListener("mousedown", async (event) => {
            await this.#handleSearchPanelContentClick(event);
        });

        this.#logFileSelect.addEventListener("change", () => {
            this.#loadLogs();
        });

        this.#logFileSelect.addEventListener("click", (event) => {
            this.#handleLogFileClick(event);
        });
    }

    #handleLogFileClick(event: MouseEvent) {
        if ((event.button as MouseButton) === MouseButton.Left) {
            this.#logFileSelect.innerHTML = t`<option value="">-Choose a file-</option>`;

            for (const entry of Object.keys(this.searchMenu.replacementLog)) {
                const option = document.createElement("option");
                option.innerHTML = entry;
                option.value = entry;
                this.#logFileSelect.appendChild(option);
            }

            this.searchPanelContent.innerHTML = "";
        }
    }

    #loadLogs() {
        const filename = this.#logFileSelect.value;

        for (const [source, [entry, column, old, new_]] of Object.entries(
            this.searchMenu.replacementLog[filename],
        )) {
            const entryContainer = document.createElement("div");
            entryContainer.className = utils.tw`textSecond border-primary backgroundSecond my-1 cursor-pointer border-2 p-1`;

            entryContainer.append("Source:");

            const sourceDiv = document.createElement("div");
            sourceDiv.textContent = source;
            entryContainer.appendChild(sourceDiv);

            entryContainer.append("Old:");

            const oldDiv = document.createElement("div");
            oldDiv.textContent = old;
            entryContainer.appendChild(oldDiv);

            entryContainer.append("New:");

            const newDiv = document.createElement("div");
            newDiv.textContent = new_;
            entryContainer.appendChild(newDiv);

            const entryInfo = document.createElement("div");
            entryInfo.className = utils.tw`textThird text-xs`;
            entryInfo.innerHTML = `${filename} - ${entry} - ${column}`;
            entryContainer.appendChild(entryInfo);

            this.searchPanelContent.appendChild(entryContainer);
        }
    }

    public toggle() {
        utils.toggleMultiple(
            this.#searchPanel,
            "translate-x-0",
            "translate-x-full",
        );
    }

    public show() {
        this.#searchPanel.classList.replace(
            "translate-x-full",
            "translate-x-0",
        );
    }

    async #handleSearchResultClick(event: MouseEvent) {
        const target = event.target as HTMLDivElement;
        const resultElement = target.closest(".cursor-pointer")!;

        if (!this.searchPanelContent.contains(resultElement)) {
            return;
        }

        const metadata = resultElement.children[1].innerHTML;
        const [filename, entry, type, columnString, row] =
            metadata.split(" - ");
        const column = Number(/\d/.exec(columnString)![0]);
        const isTranslation = type.startsWith("t");
        const rowIndex = Number(row) - 1;

        let searchAction: SearchAction;

        switch (event.button as MouseButton) {
            case MouseButton.Left:
                searchAction = SearchAction.Search;
                break;
            case MouseButton.Center:
                searchAction = SearchAction.Put;
                break;
            case MouseButton.Right:
                searchAction = SearchAction.Replace;
                break;
            default:
                return;
        }

        if (searchAction === SearchAction.Search) {
            if (event.ctrlKey) {
                await writeText(resultElement.firstElementChild!.textContent);
            } else {
                await this.searchMenu.tabInfo.changeTab(filename);

                this.searchMenu.tabInfo.currentTab.content.children[
                    rowIndex
                ].scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }
        } else {
            if (searchAction === SearchAction.Replace) {
                if (!isTranslation) {
                    alert(t`Source text cannot be replaced.`);
                    return;
                }
            }

            const searchText = this.searchMenu.searchInput.value;

            if (!searchText.trim()) {
                return;
            }

            const replacerText = this.searchMenu.replaceInput.value;
            await this.searchMenu.replacer.replaceSingle(
                searchText,
                replacerText,
                filename,
                entry,
                column,
                rowIndex,
                searchAction,
            );

            if (searchAction === SearchAction.Replace) {
                for (const child of resultElement.firstElementChild!.children) {
                    child.outerHTML = `<span class="bg-red-600">${replacerText}</span>`;
                }
            } else {
                resultElement.children[3].innerHTML = `<span class="bg-red-600">${replacerText}</span>`;
            }
        }
    }

    async #handleLogResultClick(event: MouseEvent) {
        const getRowIndex = (
            tab: boolean,
            translationLines?: string[],
        ): number => {
            let rowIndex = -1;
            let found = false;

            const targetSource = element.firstElementChild!.textContent;

            if (tab) {
                for (const child of this.searchMenu.tabInfo.currentTab.content
                    .children) {
                    const children = child.children;
                    const source = children[1];
                    const translation = children[2] as HTMLTextAreaElement;

                    if (
                        source.textContent === fileComment &&
                        translation.value === entry
                    ) {
                        if (found) {
                            break;
                        }

                        found = true;
                    } else if (found && source.textContent === targetSource) {
                        rowIndex =
                            Number(children[0].firstElementChild!.textContent) -
                            1;
                        break;
                    }
                }
            } else {
                for (const [index, line] of translationLines!.entries()) {
                    if (line.startsWith(fileComment) && line.endsWith(entry)) {
                        if (found) {
                            break;
                        }

                        found = true;
                    } else if (found) {
                        const source = line.slice(
                            0,
                            line.indexOf(consts.SEPARATOR),
                        );

                        if (utils.lbcmp(source, targetSource)) {
                            rowIndex = index;
                            break;
                        }
                    }
                }
            }

            if (rowIndex === -1) {
                void error(
                    t`Can't found row with ${targetSource} source text in file ${filename} and entry ${entry}.`,
                );
            }

            return rowIndex;
        };

        const target = event.target as HTMLElement;
        const button = event.button as MouseButton;
        const element = target.closest(".cursor-pointer")!;

        if (
            element.innerHTML.includes(
                t`Text was reverted to the previous state`,
            )
        ) {
            return;
        }

        const [filename, entry, columnString] =
            element.lastElementChild!.innerHTML.split(" - ");
        const column = Number(columnString);

        const fileComment = utils.getFileComment(filename);
        let rowIndex: number;

        if (button === MouseButton.Left) {
            await this.searchMenu.tabInfo.changeTab(filename);

            rowIndex = getRowIndex(true);

            if (rowIndex === -1) {
                return;
            }

            this.searchMenu.tabInfo.currentTab.content.children[
                rowIndex
            ].scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else if (button === MouseButton.Right) {
            if (this.searchMenu.tabInfo.currentTab.name === filename) {
                rowIndex = getRowIndex(true);

                if (rowIndex === -1) {
                    return;
                }

                const rowContainer = this.searchMenu.tabInfo.currentTab.content
                    .children[rowIndex] as HTMLDivElement;
                const textarea = rowContainer.children[
                    column
                ] as HTMLTextAreaElement;
                textarea.value = element.children[1].textContent;
            } else {
                const filePath = utils.join(
                    filename.startsWith("map")
                        ? this.searchMenu.projectSettings.tempMapsPath
                        : this.searchMenu.projectSettings.translationPath,
                    `${filename}${consts.TXT_EXTENSION}`,
                );

                const fileContent = await readTextFile(filePath).catch(
                    (err) => {
                        utils.logErrorIO(filePath, err);
                    },
                );

                if (fileContent === undefined) {
                    return;
                }

                const translationLines = utils.lines(fileContent);
                rowIndex = getRowIndex(false, translationLines);

                if (rowIndex === -1) {
                    return;
                }

                const line = translationLines[rowIndex];
                const parts = utils.parts(line)!;
                parts[column] = utils.dlbtoclb(element.children[1].textContent);
                translationLines[rowIndex] = parts.join(consts.SEPARATOR);

                await writeTextFile(
                    filePath,
                    translationLines.join("\n"),
                ).catch((err) => {
                    utils.logErrorIO(filePath, err);
                });
            }

            delete this.searchMenu.replacementLog[filename][
                element.children[0].textContent
            ];

            if (utils.objectIsEmpty(this.searchMenu.replacementLog[filename])) {
                delete this.searchMenu.replacementLog[filename];
                this.#logFileSelect.value = "";
            }

            element.innerHTML = t`Text was reverted to the previous state`;
        }
    }

    async #handleSearchPanelContentClick(event: MouseEvent) {
        if (this.#switchPanelButton.innerHTML === "menu_book") {
            await this.#handleLogResultClick(event);
        } else {
            await this.#handleSearchResultClick(event);
        }
    }

    #handleSearchPanelClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case this.#switchPanelButton.id: {
                this.searchPanelContent.innerHTML = "";
                utils.toggleMultiple(
                    this.#pageSelectContainer,
                    "hidden",
                    "flex",
                );
                this.#logFileSelect.classList.toggle("hidden");

                if (target.innerHTML.trim() === "search") {
                    target.innerHTML = "menu_book";
                } else {
                    target.innerHTML = "search";
                }
                break;
            }
            case "previous-page-button": {
                const page = Number(this.searchCurrentPage.textContent);

                if (page > 1) {
                    void this.loadSearchMatch(page - 1);
                }
                break;
            }
            case "next-page-button": {
                const page = Number(this.searchCurrentPage.textContent);

                if (page < Number(this.searchTotalPages.textContent)) {
                    void this.loadSearchMatch(page + 1);
                }
                break;
            }
        }
    }

    async #loadMatchObject(matchIndex: number): Promise<MatchObject> {
        this.searchCurrentPage.textContent = matchIndex.toString();
        this.searchPanelContent.innerHTML = "";

        const matchFile = utils.join(
            this.searchMenu.projectSettings.programDataPath,
            `match${matchIndex}${consts.JSON_EXTENSION}`,
        );

        const matchContent = await readTextFile(matchFile);
        const matchObject = JSON.parse(matchContent) as MatchObject;

        return matchObject;
    }

    public async loadSearchMatch(matchIndex: number) {
        const matchObject = await this.#loadMatchObject(matchIndex);

        for (const [metadata, [match, counterpart]] of Object.entries(
            matchObject,
        )) {
            const [filename, entry, type, column, row] = metadata.split("-");
            const isTranslation = type.startsWith("t");
            let rowNumber = Number(row);

            // External files are 0-indexed
            if (filename !== this.searchMenu.tabInfo.currentTab.name) {
                rowNumber += 1;
            }

            const matchContainer = document.createElement("div");
            matchContainer.className = utils.tw`textSecond border-primary backgroundSecond my-1 cursor-pointer border-2 p-1`;

            const matchDiv = document.createElement("div");
            matchDiv.innerHTML = match;
            matchContainer.appendChild(matchDiv);

            const matchInfo = document.createElement("div");
            matchInfo.className = utils.tw`textThird text-xs`;
            matchInfo.innerHTML = `${filename} - ${entry} - ${type} - ${column} - ${rowNumber}`;
            matchContainer.appendChild(matchInfo);

            const arrowDiv = document.createElement("div");
            arrowDiv.className = utils.tw`font-material content-center text-xl`;
            arrowDiv.innerHTML = "arrow_downward";
            matchContainer.appendChild(arrowDiv);

            const counterpartDiv = document.createElement("div");
            counterpartDiv.textContent = counterpart;
            matchContainer.appendChild(counterpartDiv);

            const counterpartType = isTranslation
                ? MatchType.Source
                : MatchType.Translation;
            const counterpartInfo = document.createElement("div");
            counterpartInfo.className = utils.tw`textThird text-xs`;
            counterpartInfo.innerHTML = `${filename} - ${entry} - ${counterpartType} - ${column} - ${rowNumber}`;
            matchContainer.appendChild(counterpartInfo);

            this.searchPanelContent.appendChild(matchContainer);
        }
    }
}
