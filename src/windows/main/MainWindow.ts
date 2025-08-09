import {
    ProjectSettings,
    ProjectSettingsOptions,
    Replacer,
    Saver,
    Searcher,
    Settings,
    SettingsOptions,
} from "@classes/index";
import {
    DuplicateMode,
    FileFlags,
    JumpDirection,
    Language,
    MouseButton,
    ProgressDirection,
    ReadMode,
    RowDeleteMode,
    SearchFlags,
    TextAreaStatus,
} from "@enums/index";
import {
    expandScope,
    extractArchive,
    read,
    readLastLine,
    translate,
    write,
} from "@utils/invokes";
import {
    BatchMenu,
    LeftPanel,
    PurgeMenu,
    ReadMenu,
    SearchMenu,
    SearchPanel,
    TabContentHeader,
    ThemeEditMenu,
    WriteMenu,
} from "./components/index";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import * as _ from "radashi";

import { t } from "@lingui/core/macro";

import { convertFileSrc } from "@tauri-apps/api/core";
import { once } from "@tauri-apps/api/event";
import { resolveResource } from "@tauri-apps/api/path";
import {
    getCurrentWebviewWindow,
    WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask, message, open as openPath } from "@tauri-apps/plugin-dialog";
import {
    copyFile,
    exists,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { attachConsole, error, info } from "@tauri-apps/plugin-log";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { check as checkVersion } from "@tauri-apps/plugin-updater";

const APP_WINDOW = getCurrentWebviewWindow();

export interface MainWindowUI {
    tabContentContainer: HTMLDivElement;
    tabContent: HTMLDivElement;

    menuBar: HTMLDivElement;
    fileMenuButton: HTMLButtonElement;
    helpMenuButton: HTMLButtonElement;
    languageMenuButton: HTMLButtonElement;

    fileMenu: HTMLDivElement;
    helpMenu: HTMLDivElement;
    languageMenu: HTMLDivElement;

    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;

    saveButton: HTMLButtonElement;
    writeButton: HTMLButtonElement;
    themeButton: HTMLButtonElement;
    toolsButton: HTMLButtonElement;
    readButton: HTMLButtonElement;
    purgeButton: HTMLButtonElement;
    bookmarksButton: HTMLButtonElement;

    bookmarksMenu: HTMLDivElement;

    themeMenu: HTMLDivElement;

    goToRowInput: HTMLInputElement;

    metadataContainer: HTMLDivElement;
    currentTabDiv: HTMLDivElement;
    projectStatus: HTMLDivElement;
    globalProgressMeter: HTMLDivElement;
    gameInfo: HTMLDivElement;
    gameEngineDiv: HTMLDivElement;
    gameTitleInput: HTMLInputElement;

    fromLanguageInput: HTMLInputElement;
    toLanguageInput: HTMLInputElement;
}

document.addEventListener("DOMContentLoaded", async () => {
    function setupUI(): MainWindowUI {
        const topPanel = document.getElementById("top-panel") as HTMLDivElement;
        const topPanelButtonsDiv =
            topPanel.firstElementChild! as HTMLDivElement;

        const themeMenu = document.getElementById(
            "theme-menu",
        ) as HTMLDivElement;

        return {
            tabContentContainer: document.getElementById(
                "tab-content-container",
            ) as HTMLDivElement,
            tabContent: document.getElementById(
                "tab-content",
            ) as HTMLDivElement,

            menuBar: document.getElementById("menu-bar") as HTMLDivElement,
            fileMenuButton: document.getElementById(
                "file-menu-button",
            ) as HTMLButtonElement,
            helpMenuButton: document.getElementById(
                "help-menu-button",
            ) as HTMLButtonElement,
            languageMenuButton: document.getElementById(
                "language-menu-button",
            ) as HTMLButtonElement,

            fileMenu: document.getElementById("file-menu") as HTMLDivElement,
            helpMenu: document.getElementById("help-menu") as HTMLDivElement,
            languageMenu: document.getElementById(
                "language-menu",
            ) as HTMLDivElement,

            topPanel,
            topPanelButtonsDiv,

            saveButton: topPanelButtonsDiv.querySelector("#save-button")!,
            writeButton: topPanelButtonsDiv.querySelector("#write-button")!,
            themeButton: topPanelButtonsDiv.querySelector("#theme-button")!,
            toolsButton: topPanelButtonsDiv.querySelector("#tools-button")!,
            readButton: topPanelButtonsDiv.querySelector("#read-button")!,
            purgeButton: topPanelButtonsDiv.querySelector("#purge-button")!,
            bookmarksButton: document.getElementById(
                "bookmarks-button",
            ) as HTMLButtonElement,

            themeMenu,

            bookmarksMenu: document.getElementById(
                "bookmarks-menu",
            ) as HTMLDivElement,

            goToRowInput: document.getElementById(
                "goto-row-input",
            ) as HTMLInputElement,

            metadataContainer: document.getElementById(
                "metadata-container",
            ) as HTMLDivElement,
            currentTabDiv: document.getElementById(
                "current-tab",
            ) as HTMLDivElement,
            projectStatus: document.getElementById(
                "project-status",
            ) as HTMLDivElement,
            globalProgressMeter: document.getElementById(
                "progress-meter",
            ) as HTMLDivElement,
            gameInfo: document.getElementById("game-info") as HTMLDivElement,
            gameEngineDiv: document.getElementById(
                "game-engine",
            ) as HTMLDivElement,
            gameTitleInput: document.getElementById(
                "game-title-input",
            ) as HTMLInputElement,

            fromLanguageInput: topPanel.querySelector("#from-language-input")!,
            toLanguageInput: topPanel.querySelector("#to-language-input")!,
        };
    }

    function changeProgress(direction: ProgressDirection) {
        if (direction === ProgressDirection.Increment) {
            tabInfo.translated[tabInfo.currentTab.index] += 1;
        } else {
            tabInfo.translated[tabInfo.currentTab.index] -= 1;
        }

        updateTabProgress(tabInfo.currentTab.index);
        updateProgressMeter();
    }

    async function handleDocumentKeydown(event: KeyboardEvent) {
        if (event.ctrlKey) {
            switch (event.code) {
                case "KeyS":
                    await saver.saveAll();
                    break;
                case "KeyG":
                    event.preventDefault();

                    if (tabInfo.currentTab.index !== -1) {
                        if (UI.goToRowInput.classList.contains("hidden")) {
                            UI.goToRowInput.classList.remove("hidden");
                            UI.goToRowInput.focus();

                            const lastRowContainer = UI.tabContent
                                .lastElementChild as HTMLDivElement;
                            const lastRowNumber =
                                utils.rowNumber(lastRowContainer);
                            UI.goToRowInput.placeholder = t`Go to row... from 1 to ${lastRowNumber}`;
                        } else {
                            UI.goToRowInput.classList.add("hidden");
                        }
                    }
                    break;
                case "KeyF":
                    event.preventDefault();
                    searchMenu.show();
                    searchMenu.focus();
                    break;
                case "KeyB":
                    utils.toggleMultiple(UI.bookmarksMenu, "hidden", "flex");

                    requestAnimationFrame(() => {
                        UI.bookmarksMenu.style.left = `${UI.bookmarksButton.offsetLeft}px`;
                        UI.bookmarksMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                    });
                    break;
                case "Equal":
                    if (settings.zoom < consts.MAX_ZOOM) {
                        settings.zoom += consts.ZOOM_STEP;
                        await APP_WINDOW.setZoom(settings.zoom);
                    }
                    break;
                case "Minus":
                    if (settings.zoom > consts.MIN_ZOOM) {
                        settings.zoom -= consts.ZOOM_STEP;
                        await APP_WINDOW.setZoom(settings.zoom);
                    }
                    break;
                case "KeyR":
                    event.preventDefault();
                    break;
            }
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    if (!settings.project || !projectSettings.sourceDirectory) {
                        if (!projectSettings.sourceDirectory) {
                            alert(
                                t`Game files do not exist (no original or data directories), so it's only possible to edit and save translation.`,
                            );
                        }
                        return;
                    }

                    UI.writeButton.firstElementChild!.classList.add(
                        "animate-spin",
                    );

                    await write({
                        sourcePath: projectSettings.sourcePath,
                        translationPath: projectSettings.translationPath,
                        outputPath: projectSettings.outputPath,
                        engineType: projectSettings.engineType,
                        duplicateMode: projectSettings.duplicateMode,
                        gameTitle: UI.gameTitleInput.value,
                        romanize: projectSettings.romanize,
                        disableCustomProcessing:
                            projectSettings.disableCustomProcessing,
                        disableProcessing: FileFlags.None,
                        trim: projectSettings.trim,
                    })
                        .then((executionTime: string) => {
                            UI.writeButton.firstElementChild!.classList.remove(
                                "animate-spin",
                            );
                            alert(
                                t`All files were written successfully.\nElapsed: ${executionTime}`,
                            );
                        })
                        .catch(error);
                    break;
                case "F4":
                    await APP_WINDOW.close();
                    break;
            }
        }
    }

    function handleTabContentKeydown(event: KeyboardEvent) {
        const textarea = event.target as HTMLTextAreaElement;
        if (!(textarea instanceof HTMLTextAreaElement)) {
            return;
        }

        const key = event.key;
        const { selectionStart, selectionEnd } = textarea;

        if (key === "Backspace") {
            if (
                lastSubstitutionCharacter &&
                selectionStart === selectionEnd &&
                selectionStart === lastSubstitutionCharacter.pos + 1 &&
                textarea.value[selectionStart - 1] ===
                    lastSubstitutionCharacter.char
            ) {
                event.preventDefault();

                const original =
                    Object.entries(consts.CHARACTER_SUBSTITUTIONS).find(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ([_, subChar]) =>
                            subChar === lastSubstitutionCharacter!.char,
                    )?.[0] ?? "";

                if (!_.isEmpty(original)) {
                    const value = textarea.value;
                    textarea.value =
                        value.slice(0, selectionStart - 1) +
                        original +
                        value.slice(selectionStart);
                    textarea.setSelectionRange(
                        selectionStart + 1,
                        selectionStart + 1,
                    );
                }

                lastSubstitutionCharacter = null;
            } else {
                lastCharacters = "";
                lastSubstitutionCharacter = null;
            }
            return;
        }

        if (consts.INTERRUPTING_KEYS.includes(key)) {
            lastCharacters = "";
            lastSubstitutionCharacter = null;
            return;
        }

        if (key.length === 1) {
            lastCharacters += key;

            const match =
                Object.keys(consts.CHARACTER_SUBSTITUTIONS).find((sequence) =>
                    lastCharacters.endsWith(sequence),
                ) ?? "";

            if (!_.isEmpty(match)) {
                event.preventDefault();

                const substitution = consts.CHARACTER_SUBSTITUTIONS[match];
                const before = textarea.value.slice(
                    0,
                    selectionStart - match.length + 1,
                );
                const after = textarea.value.slice(selectionEnd);

                textarea.value = before + substitution + after;

                const newCaretPosition = before.length + 1;
                textarea.setSelectionRange(newCaretPosition, newCaretPosition);

                lastSubstitutionCharacter = {
                    char: substitution,
                    pos: before.length,
                };
                lastCharacters = "";
            } else if (
                lastCharacters.length >
                Math.max(
                    ...Object.keys(consts.CHARACTER_SUBSTITUTIONS).map(
                        (key) => key.length,
                    ),
                )
            ) {
                lastCharacters = lastCharacters.slice(-2);
            }
        } else {
            lastCharacters = "";
            lastSubstitutionCharacter = null;
        }
    }

    async function readyToClose(save: boolean): Promise<boolean> {
        await awaitSave();

        if (save && !(await confirmExit())) {
            return false;
        }

        if (settings.project) {
            const dataDirEntries = await readDir(
                projectSettings.programDataPath,
            ).catch((err) => {
                utils.logErrorIO(projectSettings.programDataPath, err);
            });

            if (dataDirEntries) {
                for (const entry of dataDirEntries) {
                    const name = entry.name;

                    if (
                        entry.isFile &&
                        ![
                            consts.PROJECT_SETTINGS_FILE,
                            consts.LOG_FILE,
                        ].includes(name)
                    ) {
                        await removePath(
                            utils.join(projectSettings.programDataPath, name),
                        );
                    }
                }
            }

            await removePath(projectSettings.tempMapsPath, {
                recursive: true,
            });

            await writeTextFile(
                projectSettings.logPath,
                JSON.stringify(replacementLog),
            ).catch((err) => {
                utils.logErrorIO(projectSettings.logPath, err);
            });

            projectSettings.translationLanguages = {
                from: UI.fromLanguageInput.value,
                to: UI.toLanguageInput.value,
            };

            await writeTextFile(
                projectSettings.projectSettingsPath,
                JSON.stringify(projectSettings),
            ).catch((err) => {
                utils.logErrorIO(projectSettings.projectSettingsPath, err);
            });
        }

        await writeTextFile(consts.SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: consts.RESOURCE_DIRECTORY,
        }).catch((err) => {
            utils.logErrorIO(consts.SETTINGS_PATH, err);
        });

        return true;
    }

    async function loadReplacementLog(): Promise<ReplacementLog> {
        if (settings.project && (await exists(projectSettings.logPath))) {
            return JSON.parse(
                await readTextFile(projectSettings.logPath),
            ) as ReplacementLog;
        }

        return {};
    }

    function updateProgressMeter() {
        const total = tabInfo.total.reduce((a, b) => a + b, 0);
        const translated = tabInfo.translated.reduce((a, b) => a + b, 0);

        UI.globalProgressMeter.style.width = `${Math.round((translated / total) * consts.PERCENT_MULTIPLIER)}%`;
        UI.globalProgressMeter.innerHTML = `${translated} / ${total}`;
    }

    function addBookmark(bookmark: Bookmark) {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = utils.tw`bg-primary hover-bg-second flex h-auto flex-row items-center justify-center p-1`;
        bookmarkElement.innerHTML = `${bookmark.file}-${bookmark.rowIndex}<br>${bookmark.description}`;

        bookmarks.push(bookmark);
        UI.bookmarksMenu.appendChild(bookmarkElement);
    }

    async function loadSettings(): Promise<Settings> {
        if (
            await exists(consts.SETTINGS_PATH, {
                baseDir: consts.RESOURCE_DIRECTORY,
            })
        ) {
            return new Settings(
                JSON.parse(
                    await readTextFile(consts.SETTINGS_PATH, {
                        baseDir: consts.RESOURCE_DIRECTORY,
                    }),
                ) as SettingsOptions,
            );
        }

        const settings = new Settings();

        await expandScope(consts.SETTINGS_PATH);
        await writeTextFile(consts.SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: consts.RESOURCE_DIRECTORY,
        }).catch((err) => {
            utils.logErrorIO(consts.SETTINGS_PATH, err);
        });

        return settings;
    }

    async function initializeLocalization(language: Language) {
        settings.language = language;
        await utils.i18nActivate("Main", language);
    }

    function updateTabProgress(tabIndex: number) {
        const progressBar = leftPanel.tab(tabIndex).lastElementChild
            ?.firstElementChild as HTMLElement | null;

        const percentage = Math.floor(
            (tabInfo.translated[tabIndex] / tabInfo.total[tabIndex]) *
                consts.PERCENT_MULTIPLIER,
        );

        if (progressBar) {
            progressBar.style.width = progressBar.innerHTML = `${percentage}%`;

            if (percentage === consts.PERCENT_MULTIPLIER) {
                progressBar.classList.replace("bg-third", "bg-green-600");
            } else {
                progressBar.classList.replace("bg-green-600", "bg-third");
            }
        }
    }

    async function changeTab(filename: string | null, newTabIndex?: number) {
        if (tabInfo.currentTab.name === filename || changeTabTimer !== -1) {
            return;
        }

        if (filename !== null && !(filename in tabInfo.tabs)) {
            return;
        }

        await awaitSave();

        if (tabInfo.currentTab.name) {
            await saver.saveSingle();

            const activeTab = leftPanel.activeTab();
            activeTab.classList.replace("bg-third", "bg-primary");
        }

        UI.tabContent.innerHTML = "";

        if (filename === null) {
            tabContentHeader.hide();
            tabInfo.currentTab.name = "";
            UI.currentTabDiv.innerHTML = "";
        } else {
            UI.currentTabDiv.innerHTML = tabInfo.currentTab.name = filename;

            newTabIndex ??= tabInfo.tabs[filename];
            tabInfo.currentTab.index = newTabIndex;

            const activeTab = leftPanel.activeTab();
            activeTab.classList.replace("bg-primary", "bg-third");

            await createTabContent(filename);
            tabContentHeader.show();
        }

        // @ts-expect-error aweddopkawkodwa
        changeTabTimer = setTimeout(() => {
            changeTabTimer = -1;
            // eslint-disable-next-line no-magic-numbers
        }, consts.SECOND_MS / 10);

        selectedTextareas.clear();
        replacedTextareas.clear();
    }

    function handleGotoRowInputKeypress(event: KeyboardEvent) {
        if (event.key === "Enter") {
            const targetRow = UI.tabContent.children[
                UI.goToRowInput.valueAsNumber
            ] as HTMLDivElement | null;

            if (targetRow) {
                targetRow.scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }

            UI.goToRowInput.value = "";
            UI.goToRowInput.classList.add("hidden");
        } else if (event.key === "Escape") {
            UI.goToRowInput.value = "";
            UI.goToRowInput.classList.add("hidden");
        }
    }

    function areLanguageTagsValid(): boolean {
        const from = UI.fromLanguageInput.value.trim();
        const to = UI.toLanguageInput.value.trim();

        if (!from || !to) {
            alert(
                t`Translation languages are not selected. Input them to inputs above.`,
            );
            return false;
        }

        try {
            new Intl.Locale(from);
            new Intl.Locale(to);
        } catch (e) {
            alert(e);
            return false;
        }

        return true;
    }

    function jumpToRow(direction: JumpDirection) {
        const focusedTextArea = document.activeElement as HTMLTextAreaElement;

        if (!(focusedTextArea instanceof HTMLTextAreaElement)) {
            return;
        }

        const rowContainer = focusedTextArea.parentElement! as HTMLDivElement;
        const rowNumber = utils.rowNumber(rowContainer);

        if (
            Number.isNaN(rowNumber) ||
            (rowNumber === 1 && direction === JumpDirection.Previous) ||
            (rowNumber === UI.tabContent.childElementCount &&
                direction === JumpDirection.Next)
        ) {
            return;
        }

        const columnIndex = Array.prototype.findIndex.call(
            rowContainer.children,
            (element) => {
                return element === focusedTextArea;
            },
        );

        const step = direction === JumpDirection.Next ? 1 : -1;
        const rowIndex = rowNumber - 1 + step;

        const childrenCount = tabInfo.currentTab.content.childElementCount;
        if (childrenCount - 1 < rowIndex || rowIndex < 0) {
            return;
        }

        const nextRowContainer = tabInfo.currentTab.content.children[
            rowIndex
        ] as HTMLDivElement;
        const nextTextArea = nextRowContainer.children[
            columnIndex
        ] as HTMLTextAreaElement;

        focusedTextArea.blur();
        nextTextArea.scrollIntoView({ block: "center", inline: "center" });
        nextTextArea.focus();
        nextTextArea.setSelectionRange(0, 0);
    }

    async function handleBodyKeypress(event: KeyboardEvent) {
        // FIXME: fires only if currently on body, fix
        if (event.ctrlKey && event.key === "KeyZ") {
            event.preventDefault();

            for (const [textarea, value] of selectedTextareas.entries()) {
                textarea.value = value;
            }

            for (const [textarea, value] of replacedTextareas.entries()) {
                textarea.value = value;
                utils.calculateHeight(textarea);
            }

            replacedTextareas.clear();
            return;
        }

        switch (event.code) {
            case "Escape":
                await changeTab(null);
                break;
            case "Tab":
                leftPanel.toggle();
                break;
            case "KeyR":
                searchPanel.toggle();
                break;
            // TODO: Switch columns with arrowleft/arrowright
            case "ArrowDown":
                if (tabInfo.currentTab.index !== -1) {
                    let newTabIndex = tabInfo.currentTab.index + 1;

                    if (newTabIndex > tabInfo.tabCount - 1) {
                        newTabIndex = 0;
                    }

                    const tab = leftPanel.tab(newTabIndex);

                    await changeTab(
                        tab.firstElementChild!.textContent,
                        newTabIndex,
                    );
                }
                break;
            case "ArrowUp":
                if (tabInfo.currentTab.index !== -1) {
                    let newTabIndex = tabInfo.currentTab.index - 1;

                    if (newTabIndex === -1) {
                        newTabIndex = tabInfo.tabCount - 1;
                    }

                    const tab = leftPanel.tab(newTabIndex);

                    await changeTab(
                        tab.firstElementChild!.textContent,
                        newTabIndex,
                    );
                }
                break;
            case "ArrowLeft":
                break;
            case "ArrowRight":
                break;
        }
    }

    async function handleElementKeypress(event: KeyboardEvent) {
        switch (event.code) {
            case "Escape":
                if (document.activeElement) {
                    (document.activeElement as HTMLElement).blur();
                }
                break;
            case "Enter": {
                if (event.altKey) {
                    jumpToRow(JumpDirection.Next);
                } else if (event.ctrlKey) {
                    jumpToRow(JumpDirection.Previous);
                }
                break;
            }
            case "KeyT":
                if (event.ctrlKey) {
                    if (!areLanguageTagsValid()) {
                        return;
                    }

                    const selectedTextArea =
                        event.target as HTMLTextAreaElement;

                    // If textarea has text, no translation
                    if (selectedTextArea.value) {
                        return;
                    }

                    // Apply the translation
                    if (selectedTextArea.placeholder) {
                        selectedTextArea.value = selectedTextArea.placeholder;
                        selectedTextArea.placeholder = "";
                        return;
                    }

                    const rowContainer =
                        selectedTextArea.parentElement as HTMLDivElement;
                    const sourceTextDiv = utils.sourceElement(rowContainer);
                    let sourceText = sourceTextDiv.textContent;

                    if (
                        sourceText.startsWith(
                            consts.MAP_DISPLAY_NAME_COMMENT_PREFIX,
                        )
                    ) {
                        sourceText = sourceText.slice(
                            consts.MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                            -consts.COMMENT_SUFFIX_LENGTH,
                        );
                    }

                    const translation =
                        (await translate({
                            text: sourceText,
                            to: UI.toLanguageInput.value.trim(),
                            from: UI.fromLanguageInput.value.trim(),
                            normalize: false,
                        })) ?? "";

                    if (!_.isEmpty(translation)) {
                        selectedTextArea.placeholder = translation;
                    }
                    break;
                }
        }
    }

    async function handleBodyKeydown(event: KeyboardEvent) {
        if (!settings.project) {
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
        }

        if (document.activeElement === document.body) {
            await handleBodyKeypress(event);
        } else {
            await handleElementKeypress(event);
        }
    }

    function createRow(source: string, translations: string[], row: number) {
        const rowContainer = document.createElement("div");
        rowContainer.className = utils.tw`flex min-h-full min-w-full flex-row py-px`;

        const rowNumberContainer = document.createElement("div");
        rowNumberContainer.className = utils.tw`outline-primary bg-primary flex min-h-full flex-row p-1 outline outline-2`;
        rowNumberContainer.style.minWidth = `${projectSettings.columns[0][1]}px`;

        const rowNumberSpan = document.createElement("span");
        rowNumberSpan.textContent = row.toString();

        const rowNumberButtonDiv = document.createElement("div");
        rowNumberButtonDiv.className = utils.tw`text-third flex w-full items-start justify-end gap-0.5 p-0.5 text-lg`;

        const bookmarkButton = document.createElement("button");
        bookmarkButton.className = utils.tw`border-primary hover-bg-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        bookmarkButton.textContent = "bookmark";

        if (
            bookmarks.some(
                (bookmark) =>
                    bookmark.file === tabInfo.currentTab.name &&
                    bookmark.rowIndex === row,
            )
        ) {
            bookmarkButton.classList.add("bg-third");
        }

        const deleteButton = document.createElement("button");
        deleteButton.className = utils.tw`border-primary hover-bg-primary font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        deleteButton.textContent = "close";

        rowNumberButtonDiv.appendChild(deleteButton);
        rowNumberButtonDiv.appendChild(bookmarkButton);
        rowNumberContainer.appendChild(rowNumberSpan);
        rowNumberContainer.appendChild(rowNumberButtonDiv);
        rowContainer.appendChild(rowNumberContainer);

        const sourceTextDiv = document.createElement("div");
        sourceTextDiv.className = utils.tw`outline-primary bg-primary font inline-block min-h-full cursor-pointer p-1 whitespace-pre-wrap outline outline-2`;
        sourceTextDiv.style.minWidth =
            sourceTextDiv.style.width = `${projectSettings.columns[1][1]}px`;
        sourceTextDiv.textContent = utils.clbtodlb(source);
        rowContainer.appendChild(sourceTextDiv);

        if (settings.font) {
            sourceTextDiv.style.fontFamily = "font";
        }

        for (let i = 0; i < translations.length; i++) {
            const translationdlb = utils.clbtodlb(translations[i]);
            const translationTextArea = document.createElement("textarea");
            translationTextArea.rows = utils.countLines(translationdlb);
            translationTextArea.className = utils.tw`outline-primary focus-outline-primary bg-primary font min-h-full resize-none overflow-hidden p-1 outline outline-2 focus:z-10`;
            translationTextArea.style.minWidth =
                translationTextArea.style.width = `${projectSettings.columns[i + 2][1]}px`;

            translationTextArea.spellcheck = false;
            translationTextArea.autocomplete = "off";
            translationTextArea.autocapitalize = "off";
            translationTextArea.autofocus = false;

            if (settings.font) {
                translationTextArea.style.fontFamily = "font";
            }

            translationTextArea.value = translationdlb;
            rowContainer.appendChild(translationTextArea);
        }

        rowContainer.insertBefore(
            sourceTextDiv,
            rowNumberContainer.nextElementSibling,
        );

        // From text-lg:
        // font-size: var(--text-lg); /* 1.125rem (18px) */
        // line-height: var(--text-lg--line-height); /* calc(1.75 / 1.125) */
        const lineHeight = 28;

        // Padding: p-1 is 4px, account for top and bottom
        const padding = 8;

        rowContainer.style.minHeight = `${lineHeight * utils.countLines(source) + padding}px`;
        return rowContainer;
    }

    async function createTabContent(filename: string) {
        const formatted = `${filename}${consts.TXT_EXTENSION}`;
        let contentPath = utils.join(
            projectSettings.translationPath,
            formatted,
        );

        if (filename.startsWith("plugins") && !(await exists(contentPath))) {
            if (
                await exists(
                    utils.join(projectSettings.translationPath, "scripts.txt"),
                )
            ) {
                contentPath = utils.join(
                    projectSettings.translationPath,
                    formatted,
                );
            }
        } else if (filename.startsWith("map")) {
            contentPath = utils.join(projectSettings.tempMapsPath, formatted);
        }

        const content = await readTextFile(contentPath).catch((err) => {
            utils.logErrorIO(contentPath, err);
            return null;
        });

        if (content === null) {
            return;
        }

        const contentLines = utils.lines(content);

        if (filename === "system") {
            contentLines.pop();
        }

        const fragment = document.createDocumentFragment();

        for (const [row, line] of contentLines.entries()) {
            if (!line) {
                continue;
            }

            const parts = utils.parts(line);

            if (!parts) {
                utils.logSplitError(filename, row);
                continue;
            }

            const source = utils.source(parts);
            const translations = utils.translations(parts);

            while (
                translations.length > projectSettings.translationColumnCount
            ) {
                projectSettings.columns.push([
                    "Translation",
                    consts.DEFAULT_COLUMN_WIDTH,
                ]);
            }

            while (
                translations.length < projectSettings.translationColumnCount
            ) {
                translations.push("");
            }

            const rowDiv = createRow(source, translations, row + 1);
            fragment.appendChild(rowDiv);
        }

        UI.tabContent.appendChild(fragment);
    }

    function getNewLinePositions(
        textarea: HTMLTextAreaElement,
    ): { left: number; top: number }[] {
        const positions: { left: number; top: number }[] = [];
        const lines = utils.lines(textarea.value);

        const { lineHeight, fontSize, fontFamily } =
            window.getComputedStyle(textarea);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize} ${fontFamily}`;

        let top = textarea.offsetTop;

        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            const textWidth = context.measureText(`${line} `).width;
            const left = textarea.offsetLeft + textWidth;

            positions.push({ left, top });
            top += Number(lineHeight);
        }

        return positions;
    }

    function trackFocus(focusedElement: Event) {
        for (const ghost of activeGhostLines) {
            ghost.remove();
        }

        const result = getNewLinePositions(
            focusedElement.target as HTMLTextAreaElement,
        );

        for (const { left, top } of result) {
            const ghostNewLineDiv = document.createElement("div");
            ghostNewLineDiv.className = utils.tw`text-third pointer-events-none absolute z-50 cursor-default select-none`;
            ghostNewLineDiv.style.left = `${left}px`;
            ghostNewLineDiv.style.top = `${top}px`;
            ghostNewLineDiv.textContent = "\\n";

            activeGhostLines.push(ghostNewLineDiv);
            document.body.appendChild(ghostNewLineDiv);
        }
    }

    function handleFocus(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;

        if (
            target instanceof HTMLTextAreaElement &&
            target.id !== currentFocusedElement[0]
        ) {
            currentFocusedElement = [target.id, target.value];
        }

        textareaStatus = target.value
            ? TextAreaStatus.Translated
            : TextAreaStatus.Untranslated;
    }

    function handleBlur(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;
        target.placeholder = "";

        for (const ghost of activeGhostLines) {
            ghost.remove();
        }

        if (target.id == currentFocusedElement[0]) {
            if (saver.saved && currentFocusedElement[1] !== target.value) {
                saver.saved = false;
            }

            currentFocusedElement.length = 0;
        }

        switch (textareaStatus) {
            case TextAreaStatus.Translated:
                if (!target.value) {
                    changeProgress(ProgressDirection.Decrement);
                }
                break;
            case TextAreaStatus.Untranslated:
                if (target.value) {
                    changeProgress(ProgressDirection.Increment);
                }
                break;
            case TextAreaStatus.None:
                break;
        }

        textareaStatus = TextAreaStatus.None;
    }

    async function loadFont(fontUrl: string) {
        if (!fontUrl) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            for (const element of document.querySelectorAll(
                ".font",
            ) as NodeListOf<HTMLElement>) {
                element.style.fontFamily = "";
            }
            return;
        }

        await expandScope(fontUrl);

        const font = await new FontFace(
            "font",
            `url(${convertFileSrc(fontUrl)})`,
        ).load();
        document.fonts.add(font);

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        for (const element of document.querySelectorAll(
            ".font",
        ) as NodeListOf<HTMLElement>) {
            element.style.fontFamily = "font";
        }
    }

    async function confirmExit(): Promise<boolean> {
        if (saver.saved) {
            return true;
        }

        const askExitUnsaved: boolean = await ask(
            t`You have unsaved changes. Save progress and quit?`,
        );

        if (!askExitUnsaved) {
            const exitRequested = await ask(t`Quit without saving?`);
            return exitRequested;
        }

        await saver.saveAll();
        return true;
    }

    async function awaitSave() {
        while (saver.saving) {
            await new Promise((resolve) =>
                setTimeout(resolve, consts.SECOND_MS / 5),
            );
        }
    }

    async function isProjectValid(projectPath: string): Promise<boolean> {
        if (!(await exists(projectPath))) {
            if (projectPath) {
                await message(
                    t`Selected folder is missing. Project won't be initialized.`,
                );
            }

            return false;
        }

        projectSettings = new ProjectSettings();
        const sourceDirectoryFound =
            await projectSettings.findSourceDirectory(projectPath);

        if (!sourceDirectoryFound) {
            const extracted = await extractArchive(projectPath);

            if (!extracted) {
                return false;
            }
        }

        // Load project settings
        const projectSettingsPath = utils.join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
            consts.PROJECT_SETTINGS_FILE,
        );

        if (await exists(projectSettingsPath)) {
            const projectSettingsContent =
                await readTextFile(projectSettingsPath);

            projectSettings = new ProjectSettings(
                JSON.parse(projectSettingsContent) as ProjectSettingsOptions,
            );
        }

        const engineTypeFound =
            await projectSettings.setEngineType(projectPath);

        if (!engineTypeFound) {
            await message(t`Cannot determine the type of the game's engine.`);
            await changeTab(null);
            UI.tabContent.innerHTML =
                UI.gameEngineDiv.innerHTML =
                UI.gameTitleInput.value =
                    "";

            return false;
        }

        UI.metadataContainer.classList.remove("invisible");

        UI.toLanguageInput.value = projectSettings.translationLanguages.to;
        UI.fromLanguageInput.value = projectSettings.translationLanguages.from;

        UI.gameEngineDiv.innerHTML =
            consts.ENGINE_NAMES[projectSettings.engineType];

        return true;
    }

    async function copyTranslationFromRoot(translationPath: string) {
        const ok = await mkdir(projectSettings.translationPath, {
            recursive: true,
        }).catch((err) => {
            utils.logErrorIO(projectSettings.translationPath, err);
            return false;
        });

        if (ok === false) {
            return;
        }

        const translationEntries = await readDir(translationPath).catch(
            (err) => {
                utils.logErrorIO(projectSettings.translationPath, err);
            },
        );

        if (!translationEntries) {
            return;
        }

        for (const entry of translationEntries) {
            await copyFile(
                utils.join(translationPath, entry.name),
                utils.join(projectSettings.translationPath, entry.name),
            );
        }

        const metadataPath = utils.join(
            translationPath,
            consts.RVPACKER_METADATA_FILE,
        );

        if (await exists(metadataPath)) {
            const metadataContent = await readTextFile(metadataPath).catch(
                (err) => {
                    utils.logErrorIO(metadataPath, err);
                    return "";
                },
            );

            if (_.isEmpty(metadataContent)) {
                return;
            }

            const metadata = JSON.parse(metadataContent) as {
                duplicateMode: DuplicateMode;
                romanize: boolean;
                disableCustomProcessing: boolean;
                trim: boolean;
            };

            Object.assign(projectSettings, metadata);
        }
    }

    async function parseTranslationLines(lines: string[], filename: string) {
        const result: string[] = [];
        const mapIndices: number[] = [];

        async function parseMapComment() {
            const mapID = mapIndices.shift();
            const tempMapPath = utils.join(
                projectSettings.tempMapsPath,
                `map${mapID}${consts.TXT_EXTENSION}`,
            );

            await writeTextFile(tempMapPath, result.join("\n")).catch((err) => {
                utils.logErrorIO(tempMapPath, err);
            });

            leftPanel.addTab(`map${mapID}`, result);
            result.length = 0;
        }

        for (const [lineIndex, line] of lines.entries()) {
            if (line.startsWith(consts.BOOKMARK_COMMENT_PREFIX)) {
                addBookmark({
                    file: filename,
                    rowIndex: lineIndex + 1,
                    description: line.slice(
                        line.lastIndexOf(consts.SEPARATOR) +
                            consts.SEPARATOR.length,
                    ),
                });
            } else {
                if (line.startsWith(consts.MAP_ID_COMMENT)) {
                    mapIndices.push(
                        Number(
                            line.slice(
                                line.lastIndexOf(consts.SEPARATOR) +
                                    consts.SEPARATOR.length,
                            ),
                        ),
                    );

                    if (result.length) {
                        await parseMapComment();
                    }
                }

                result.push(line);
            }
        }

        await parseMapComment();
    }

    async function parseTranslationFiles() {
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

            if (_.isEmpty(translationFileContent)) {
                continue;
            }

            const contentLines = utils.lines(translationFileContent);

            if (contentLines.length === 1) {
                continue;
            }

            const translationFileBasename = translationFile.name.slice(
                0,
                translationFile.name.lastIndexOf("."),
            );

            if (!translationFileBasename.startsWith("map")) {
                for (const [lineIndex, line] of contentLines.entries()) {
                    if (line.startsWith(consts.BOOKMARK_COMMENT_PREFIX)) {
                        addBookmark({
                            file: translationFileBasename,
                            rowIndex: lineIndex + 1,
                            description: line.slice(
                                line.lastIndexOf(consts.SEPARATOR) +
                                    consts.SEPARATOR.length,
                            ),
                        });
                    }
                }

                leftPanel.addTab(translationFileBasename, contentLines);
                continue;
            }

            await parseTranslationLines(contentLines, translationFileBasename);
        }
    }

    async function openProject(projectPath: string, openingNew: boolean) {
        await expandScope(projectPath);

        if (!(await isProjectValid(projectPath))) {
            settings.project = "";
            UI.projectStatus.innerHTML = t`No project selected. Select the project directory, using 'open folder' button in the left-top corner.`;
            return;
        }

        // Save and reset everything before opening a new project
        if (openingNew) {
            await saver.saveAll();
            await readyToClose(false);
            await changeTab(null);
            leftPanel.clear();
            UI.gameTitleInput.innerHTML = "";
            tabInfo.total.length = 0;
            tabInfo.translated.length = 0;
        }

        UI.projectStatus.innerHTML = t`Loading project`;
        const interval = utils.animateProgressText(UI.projectStatus);

        settings.project = projectPath;
        await projectSettings.setProjectPath(projectPath);

        if (!(await exists(projectSettings.translationPath))) {
            const rootTranslationPath = utils.join(
                settings.project,
                consts.TRANSLATION_DIRECTORY,
            );

            if (await exists(rootTranslationPath)) {
                await copyTranslationFromRoot(rootTranslationPath);
            } else {
                await read({
                    projectPath: settings.project,
                    sourcePath: projectSettings.sourcePath,
                    translationPath: projectSettings.translationPath,
                    duplicateMode: DuplicateMode.Allow,
                    romanize: false,
                    disableCustomProcessing: false,
                    disableProcessing: FileFlags.None,
                    readMode: ReadMode.Default,
                    engineType: projectSettings.engineType,
                    ignore: false,
                    trim: false,
                });

                const metadata = {
                    disableCustomProcessing: false,
                    trim: false,
                    duplicateMode: DuplicateMode.Allow,
                    romanize: false,
                };

                Object.assign(projectSettings, metadata);

                await writeTextFile(
                    utils.join(
                        projectSettings.translationPath,
                        ".rvpacker-metadata",
                    ),
                    JSON.stringify(metadata),
                );
            }
        }

        await parseTranslationFiles();
        updateProgressMeter();

        // Upon the first launch, show docs
        if (settings.firstLaunch) {
            // eslint-disable-next-line sonarjs/constructor-for-side-effects
            new WebviewWindow("help", {
                url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                title: t`Help`,
                center: true,
            });
            settings.firstLaunch = false;
        }

        // Set game title
        const systemFilePath = utils.join(
            projectSettings.translationPath,
            "system.txt",
        );
        const [sourceTitle, translationTitle] = utils.parts(
            await readLastLine(systemFilePath),
        )!;
        UI.gameTitleInput.setAttribute("source-title", sourceTitle);
        UI.gameTitleInput.value = translationTitle || sourceTitle;

        if (openingNew) {
            batchMenu.refill(leftPanel.tabs());
        }

        // Reset project status
        UI.projectStatus.innerHTML = "";
        clearInterval(interval);

        if (!openingNew) {
            replacementLog = await loadReplacementLog();
            tabContentHeader = new TabContentHeader(
                UI.tabContentContainer,
                settings,
                projectSettings,
            );
            saver = new Saver(
                settings,
                projectSettings,
                tabInfo,
                UI.gameTitleInput,
                UI.saveButton.firstElementChild!,
            );
            searcher = new Searcher(projectSettings, searchFlags, tabInfo);
            replacer = new Replacer(
                searcher,
                saver,
                projectSettings,
                replacementLog,
                searchFlags,
                tabInfo,
            );
            searchMenu = new SearchMenu(
                settings,
                projectSettings,
                searcher,
                replacer,
                searchFlags,
                replacementLog,
                tabInfo,
            );
            readMenu = new ReadMenu(settings, projectSettings, saver, reload);
            writeMenu = new WriteMenu(
                settings,
                projectSettings,
                UI.gameTitleInput,
            );
            purgeMenu = new PurgeMenu(
                projectSettings,
                saver,
                UI.gameTitleInput,
                reload,
            );
            batchMenu = new BatchMenu(
                UI,
                projectSettings,
                tabInfo,
                saver,
                leftPanel.tabs(),
            );
            searchPanel = searchMenu.searchPanel;
            themeEditMenu = new ThemeEditMenu(themes);
        }
    }

    async function checkForUpdates() {
        if (!settings.checkForUpdates) {
            return;
        }

        try {
            const update = await checkVersion();

            if (!update) {
                await info(t`Program is up to date.`);
                return;
            }

            const { version, currentVersion } = update;

            const installUpdate = await ask(
                t`New version found: ${version}\nCurrent version: ${currentVersion}\nRelease notes: https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate/releases/latest`,
                {
                    title: t`Update available`,
                    okLabel: t`Install`,
                },
            );

            if (!installUpdate) {
                return;
            }

            let downloaded = 0;
            let contentLength: number | undefined = 0;

            await update.downloadAndInstall(async (event) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength;
                        await info(
                            `Started downloading ${event.data.contentLength} bytes`,
                        );
                        break;
                    case "Progress":
                        downloaded += event.data.chunkLength;
                        await info(
                            `Downloaded ${downloaded} from ${contentLength}`,
                        );
                        break;
                    case "Finished":
                        await info("Download finished");
                        break;
                }
            });

            await relaunch();
        } catch (e: unknown) {
            await error(`${e}`);
        }
    }

    function updateRowIds(startIndex: number) {
        const children = UI.tabContent.children;

        for (let i = startIndex; i < children.length; i++) {
            const element = children[i] as HTMLDivElement;
            const newRowNumber = (i + 1).toString();

            utils.rowNumberElement(element).textContent = newRowNumber;
            // eslint-disable-next-line sonarjs/slow-regex
            element.id = element.id.replace(/\d+$/, newRowNumber);
        }
    }

    function handleBookmarkButtonClick(target: HTMLElement) {
        const rowContainer = target.parentElement!.parentElement!
            .parentElement as HTMLDivElement;
        const rowNumber = utils.rowNumber(rowContainer);

        const bookmarkIndex = bookmarks.findIndex(
            (bookmark) => bookmark.rowIndex + 1 === rowNumber,
        );

        if (bookmarkIndex !== -1) {
            const bookmarkText = `${bookmarks[bookmarkIndex].file}-${bookmarks[bookmarkIndex].rowIndex}`;
            bookmarks.splice(bookmarkIndex, 1);

            for (const bookmark of UI.bookmarksMenu.children) {
                if (bookmark.textContent.startsWith(bookmarkText)) {
                    bookmark.remove();
                }
            }

            target.classList.remove("bg-third");
            rowContainer.previousSibling?.remove();
            return;
        }

        const bookmarkDescriptionInput = document.createElement("input");
        bookmarkDescriptionInput.className = utils.tw`input text-second bg-second absolute z-50 h-7 w-auto p-1 text-base`;
        bookmarkDescriptionInput.style.left = `${target.offsetLeft + target.clientWidth}px`;
        bookmarkDescriptionInput.style.top = `${target.offsetTop}px`;
        document.body.appendChild(bookmarkDescriptionInput);

        requestAnimationFrame(() => {
            bookmarkDescriptionInput.focus();
        });

        bookmarkDescriptionInput.onkeydown = (event) => {
            if (event.key === "Enter") {
                const description = bookmarkDescriptionInput.value;
                bookmarkDescriptionInput.remove();

                const bookmarkElement = createRow(
                    `<!-- Bookmark: ${rowNumber} -->`,
                    [description],
                    rowNumber,
                );

                UI.tabContent.insertBefore(
                    bookmarkElement,
                    target.parentElement!.parentElement!.parentElement,
                );

                updateRowIds(rowNumber);
                addBookmark({
                    file: tabInfo.currentTab.name,
                    rowIndex: rowNumber,
                    description: description,
                });

                target.classList.add("bg-third");
            } else if (event.key === "Escape") {
                requestAnimationFrame(() => {
                    bookmarkDescriptionInput.remove();
                });
            }
        };
    }

    async function handleCloseButtonClick(target: HTMLElement) {
        switch (settings.rowDeleteMode) {
            case RowDeleteMode.Disabled:
                alert(t`Deleting is disabled in settings.`);
                return;
            // @ts-expect-error Fallthrough because of shared behavior
            case RowDeleteMode.Confirmation: {
                const confirm = await ask(
                    t`Do you really want to delete this row? This action is irreversible!`,
                );

                if (!confirm) {
                    return;
                }
            }
            // eslint-disable-next-line no-fallthrough
            case RowDeleteMode.Allowed: {
                const rowContainer = target.closest(
                    `[id^="${tabInfo.currentTab.name}"]`,
                )!;
                const position = Number(
                    rowContainer.firstElementChild!.textContent,
                );

                rowContainer.remove();
                updateRowIds(position - 1);
                tabInfo.total[tabInfo.currentTab.index] -= 1;
                break;
            }
        }
    }

    async function handleTabContentMousedown(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.textContent) {
            case "bookmark": {
                handleBookmarkButtonClick(target);
                break;
            }
            case "close": {
                await handleCloseButtonClick(target);
                break;
            }
            default: {
                if ((event.button as MouseButton) !== MouseButton.Left) {
                    return;
                }

                if (!event.shiftKey) {
                    multipleTextAreasSelected = false;

                    for (const textarea of selectedTextareas.keys()) {
                        textarea.style.outlineColor = "";
                    }
                } else {
                    if (
                        !(document.activeElement instanceof HTMLTextAreaElement)
                    ) {
                        return;
                    }

                    event.preventDefault();

                    selectedTextareas.clear();
                    multipleTextAreasSelected = true;

                    const clickedRowContainer =
                        target.parentElement as HTMLDivElement;
                    const clickedRowContainerNumber =
                        utils.rowNumber(clickedRowContainer);

                    const selectedRowContainer = document.activeElement
                        .parentElement as HTMLDivElement;
                    const selectedRowContainerNumber =
                        utils.rowNumber(selectedRowContainer);
                    const columnIndex = Array.prototype.findIndex.call(
                        selectedRowContainer.children,
                        (element) => element === document.activeElement,
                    );

                    const rowsRange =
                        clickedRowContainerNumber - selectedRowContainerNumber;
                    const rowsToSelect = Math.abs(rowsRange);

                    const direction = rowsRange > 0 ? 1 : -1;

                    for (let i = 0; i <= Math.abs(rowsToSelect); i++) {
                        const rowIndex =
                            selectedRowContainerNumber + direction * i - 1;

                        const nextRowContainer = UI.tabContent.children[
                            rowIndex
                        ] as HTMLDivElement;
                        const nextTextArea = nextRowContainer.children[
                            columnIndex
                        ] as HTMLTextAreaElement;

                        nextTextArea.style.outlineColor =
                            "var(--focus-outline-primary)";
                        selectedTextareas.set(nextTextArea, nextTextArea.value);
                    }
                }
            }
        }
    }

    async function handleTabContentCopy(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement instanceof HTMLTextAreaElement
        ) {
            event.preventDefault();
            await writeText(
                Array.prototype.join.call(
                    selectedTextareas.values(),
                    consts.CLIPBOARD_SEPARATOR,
                ),
            );
        }
    }

    async function handleTabContentCut(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement instanceof HTMLTextAreaElement
        ) {
            event.preventDefault();

            await writeText(
                Array.prototype.join.call(
                    selectedTextareas.values(),
                    consts.CLIPBOARD_SEPARATOR,
                ),
            );

            for (const textarea of selectedTextareas.keys()) {
                if (textarea.value) {
                    changeProgress(ProgressDirection.Decrement);
                    textarea.value = "";
                }
            }

            textareaStatus = TextAreaStatus.None;
            saver.saved = false;
        }
    }

    function handleTabContentPaste(event: ClipboardEvent) {
        const normalized = event.clipboardData!.getData("text");

        if (!(document.activeElement instanceof HTMLTextAreaElement)) {
            return;
        }

        const startRowContainer = document.activeElement
            .parentElement as HTMLDivElement;

        if (normalized.includes(consts.CLIPBOARD_SEPARATOR)) {
            event.preventDefault();
            const clipboardTextSplit = normalized.split(
                consts.CLIPBOARD_SEPARATOR,
            );
            const textRows = clipboardTextSplit.length;
            const startIndex = utils.rowNumber(startRowContainer);

            if (textRows === 0) {
                return;
            } else {
                const columnIndex = Array.prototype.findIndex.call(
                    startRowContainer.children,
                    (element) => element === document.activeElement,
                );

                for (let i = 0; i < textRows; i++) {
                    const rowIndex = startIndex + i - 1;

                    if (rowIndex > UI.tabContent.childElementCount) {
                        return;
                    }

                    const rowContainer = UI.tabContent.children[
                        rowIndex
                    ] as HTMLDivElement;

                    const textarea = rowContainer.children[
                        columnIndex
                    ] as HTMLTextAreaElement;

                    if (!textarea.value && clipboardTextSplit[i]) {
                        changeProgress(ProgressDirection.Increment);
                    }

                    replacedTextareas.set(
                        textarea,
                        textarea.value.replaceAll(normalized, ""),
                    );
                    textarea.value = clipboardTextSplit[i];
                    utils.calculateHeight(textarea);
                }

                textareaStatus = TextAreaStatus.None;
                saver.saved = false;
            }
        }
    }

    function handleTabContentKeyup(event: KeyboardEvent) {
        const target = event.target as HTMLTextAreaElement;

        if (target instanceof HTMLTextAreaElement) {
            utils.calculateHeight(target);
        }
    }

    function handleTabContentInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;

        if (
            target instanceof HTMLTextAreaElement &&
            settings.displayGhostLines
        ) {
            trackFocus(event);
        }
    }

    function handleThemeMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id === "create-theme") {
            themeEditMenu.show();
        } else {
            utils.applyTheme(themes, target.textContent);
        }
    }

    async function handleBookmarkMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target || target.id === UI.bookmarksMenu.id) {
            return;
        }

        const [filename, row] = target.firstChild!.textContent!.split("-");
        await changeTab(filename);

        UI.tabContent.children[Number(row)].scrollIntoView({
            inline: "center",
            block: "center",
        });
    }

    async function handleMenuBarClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case UI.fileMenuButton.id:
                utils.toggleMultiple(UI.fileMenu, "hidden", "flex");
                UI.helpMenu.classList.replace("flex", "hidden");
                UI.languageMenu.classList.replace("flex", "hidden");

                UI.fileMenu.style.top = `${UI.fileMenuButton.offsetTop + UI.fileMenuButton.offsetHeight}px`;
                UI.fileMenu.style.left = `${UI.fileMenuButton.offsetLeft}px`;
                break;
            case "reload-button":
                if (await readyToClose(true)) {
                    location.reload();
                }
                break;
            case UI.helpMenuButton.id:
                utils.toggleMultiple(UI.helpMenu, "hidden", "flex");
                UI.fileMenu.classList.replace("flex", "hidden");
                UI.languageMenu.classList.replace("flex", "hidden");

                UI.helpMenu.style.top = `${UI.helpMenuButton.offsetTop + UI.helpMenuButton.offsetHeight}px`;
                UI.helpMenu.style.left = `${UI.helpMenuButton.offsetLeft}px`;
                break;
            case "help-button":
                // eslint-disable-next-line sonarjs/constructor-for-side-effects
                new WebviewWindow("help", {
                    url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                    title: t`Help`,
                    center: true,
                });
                break;
            case "about-button": {
                const aboutWindow = new WebviewWindow("about", {
                    url: "windows/about/AboutWindow.html",
                    title: t`About`,
                    center: true,
                    resizable: false,
                });

                await once("fetch-settings", async () => {
                    await aboutWindow.emit("settings", [
                        settings,
                        themes,
                        projectSettings,
                    ]);
                });
                break;
            }
            case UI.languageMenuButton.id:
                utils.toggleMultiple(UI.languageMenu, "hidden", "flex");
                UI.helpMenu.classList.replace("flex", "hidden");
                UI.fileMenu.classList.replace("flex", "hidden");

                UI.languageMenu.style.top = `${UI.languageMenuButton.offsetTop + UI.languageMenuButton.offsetHeight}px`;
                UI.languageMenu.style.left = `${UI.languageMenuButton.offsetLeft}px`;
                break;
            case "ru-button":
                if (settings.language !== Language.Russian) {
                    await initializeLocalization(Language.Russian);
                }
                break;
            case "en-button":
                if (settings.language !== Language.English) {
                    await initializeLocalization(Language.English);
                }
                break;
        }
    }

    async function handleDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (
            target instanceof HTMLDivElement &&
            UI.tabContent.contains(target)
        ) {
            const rowContainer = target.parentElement;

            if (rowContainer && /\d$/.test(rowContainer.id)) {
                await writeText(target.textContent);
            }
        }

        if (target.id.includes("checkbox")) {
            if (
                readMenu.readMode() === ReadMode.Append &&
                readMenu.contains(target)
            ) {
                return;
            }

            target.innerHTML = !target.textContent ? "check" : "";
        }

        if (target.classList.contains("dropdown-menu")) {
            for (const element of document.querySelectorAll(".dropdown-menu")) {
                element.classList.replace("flex", "hidden");
            }
        }
    }

    async function handleTopPanelClick(event: MouseEvent) {
        const button = event.button as MouseButton;

        if (button !== MouseButton.Left) {
            return;
        }

        let target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        while (target.parentElement !== UI.topPanelButtonsDiv) {
            target = target.parentElement!;
        }

        if (
            (!settings.project && target.id !== "open-directory-button") ||
            !UI.topPanelButtonsDiv.contains(target)
        ) {
            return;
        }

        switch (target.id) {
            case "menu-button":
                leftPanel.toggle();
                break;
            case UI.saveButton.id:
                await saver.saveAll();
                break;
            case "write-button": {
                writeMenu.show();
                break;
            }
            case "open-directory-button": {
                const directory =
                    (await openPath({
                        directory: true,
                        multiple: false,
                    })) ?? "";

                if (_.isEmpty(directory)) {
                    return;
                }

                if (directory === settings.project) {
                    await message(
                        t`Selected directory is already opened in the program.`,
                    );
                    return;
                }

                await openProject(directory, Boolean(settings.project));
                break;
            }
            case "settings-button": {
                const settingsWindow = new WebviewWindow("settings", {
                    url: "windows/settings/SettingsWindow.html",
                    title: t`Settings`,
                    center: true,
                    resizable: false,
                });

                const settingsUnlisten = await settingsWindow.once<Settings>(
                    "get-settings",
                    async (data) => {
                        Object.assign(settings, data.payload);
                        await loadFont(settings.font);
                    },
                );

                await once("fetch-settings", async () => {
                    await settingsWindow.emit("settings", [
                        settings,
                        themes,
                        projectSettings,
                    ]);
                });

                await settingsWindow.once(
                    "tauri://destroyed",
                    settingsUnlisten,
                );
                break;
            }
            case UI.themeButton.id:
                utils.toggleMultiple(UI.themeMenu, "hidden", "flex");

                requestAnimationFrame(() => {
                    UI.themeMenu.style.left = `${UI.themeButton.offsetLeft}px`;
                    UI.themeMenu.style.top = `${UI.themeButton.offsetTop + UI.themeButton.clientHeight}px`;
                });
                break;
            case UI.bookmarksButton.id:
                utils.toggleMultiple(UI.bookmarksMenu, "hidden", "flex");

                requestAnimationFrame(() => {
                    UI.bookmarksMenu.style.left = `${UI.bookmarksButton.offsetLeft}px`;
                    UI.bookmarksMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case UI.readButton.id: {
                if (!projectSettings.sourceDirectory) {
                    alert(
                        t`Game files do not exist (no original or data directories), so it's only possible to edit and save translation.`,
                    );
                    return;
                }

                readMenu.toggle();
                break;
            }
            case "search-button":
                if (searchMenu.isHidden()) {
                    searchMenu.show();
                } else {
                    searchMenu.hide();
                }
                break;
            case "batch-button":
                if (batchMenu.isHidden()) {
                    batchMenu.show();
                } else {
                    batchMenu.hide();
                }
                break;
            case UI.purgeButton.id: {
                if (!projectSettings.sourceDirectory) {
                    alert(
                        t`Game files do not exist (no original or data directories), so it's only possible to edit and save translation.`,
                    );
                    return;
                }

                purgeMenu.toggle();
                break;
            }
        }
    }

    async function reload(save: boolean) {
        if (await readyToClose(save)) {
            location.reload();
        }
    }

    await attachConsole();

    const settings: Settings = await loadSettings();
    await checkForUpdates();

    let lastCharacters = "";
    let lastSubstitutionCharacter: { char: string; pos: number } | null = null;
    let textareaStatus!: TextAreaStatus;
    let projectSettings!: ProjectSettings;

    let currentFocusedElement: string[] = [];
    let changeTabTimer = -1;
    let multipleTextAreasSelected = false;

    const bookmarks: Bookmark[] = [];
    let replacementLog: ReplacementLog;
    const activeGhostLines: HTMLDivElement[] = [];
    const selectedTextareas = new Map<HTMLTextAreaElement, string>();
    const replacedTextareas = new Map<HTMLTextAreaElement, string>();

    const searchFlags: SearchFlagsObject = { flags: SearchFlags.None };
    const UI = setupUI();

    const tabInfo: TabInfo = {
        tabs: {},
        tabCount: 0,
        total: [],
        translated: [],
        currentTab: {
            name: "",
            index: -1,
            content: UI.tabContent,
        },
        changeTab,
        updateTabProgress,
    };

    const leftPanel = new LeftPanel(tabInfo);

    const themes: Themes = JSON.parse(
        await readTextFile(await resolveResource("resources/themes.json")),
    );

    for (const themeName of Object.keys(themes)) {
        const themeButton = document.createElement("button");
        themeButton.textContent = themeName;
        themeButton.className = utils.tw`h-8 p-1 text-base bg-primary hover-bg-primary`;
        UI.themeMenu.insertBefore(themeButton, UI.themeMenu.lastElementChild);
    }

    let tabContentHeader: TabContentHeader,
        saver: Saver,
        searcher: Searcher,
        replacer: Replacer,
        searchMenu: SearchMenu,
        readMenu: ReadMenu,
        writeMenu: WriteMenu,
        purgeMenu: PurgeMenu,
        batchMenu: BatchMenu,
        searchPanel: SearchPanel,
        themeEditMenu: ThemeEditMenu;

    utils.applyTheme(themes, settings.theme);
    await initializeLocalization(settings.language);
    await openProject(settings.project, false);
    await loadFont(settings.font);

    await APP_WINDOW.setZoom(settings.zoom);

    UI.topPanelButtonsDiv.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
    UI.topPanelButtonsDiv.addEventListener("mousedown", handleTopPanelClick);

    UI.menuBar.addEventListener("click", handleMenuBarClick);
    UI.themeMenu.addEventListener("click", handleThemeMenuClick);
    UI.bookmarksMenu.addEventListener("click", handleBookmarkMenuClick);

    UI.goToRowInput.addEventListener("keydown", handleGotoRowInputKeypress);

    UI.tabContent.addEventListener("paste", handleTabContentPaste);
    UI.tabContent.addEventListener("keyup", handleTabContentKeyup);
    UI.tabContent.addEventListener("input", handleTabContentInput);
    UI.tabContent.addEventListener("keydown", handleTabContentKeydown, true);
    UI.tabContent.addEventListener("focus", handleFocus, true);
    UI.tabContent.addEventListener("blur", handleBlur, true);
    UI.tabContent.addEventListener("mousedown", handleTabContentMousedown);
    UI.tabContent.addEventListener("copy", handleTabContentCopy);
    UI.tabContent.addEventListener("cut", handleTabContentCut);

    document.body.addEventListener("keydown", handleBodyKeydown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeydown, true);

    await APP_WINDOW.onCloseRequested(async (event) => {
        if (!settings.project || (await readyToClose(true))) {
            await exit();
        } else {
            event.preventDefault();
        }
    });
});
