import { BatchWindow } from "./types/batchwindow";
import {
    BatchAction,
    DuplicateMode,
    FileFlags,
    JumpDirection,
    Language,
    MouseButton,
    ProgressDirection,
    ReadMode,
    RowDeleteMode,
    SearchAction,
    SearchFlags,
    TextAreaStatus,
    WindowType,
} from "./types/enums";
import { ProjectSettings } from "./types/projectsettings";
import { Replacer } from "./types/replacer";
import { Saver } from "./types/saver";
import { Searcher } from "./types/searcher";
import { Settings } from "./types/settings";
import {
    BOOKMARK_COMMENT_PREFIX,
    CHARACTER_SUBSTITUTIONS,
    CLIPBOARD_SEPARATOR,
    COMMENT_PREFIX,
    COMMENT_SUFFIX_LENGTH,
    ENGINE_NAMES,
    INTERRUPTING_KEYS,
    JSON_EXTENSION,
    LOG_FILE,
    MAP_COMMENT,
    MAP_DISPLAY_NAME_COMMENT_PREFIX,
    MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
    MAX_ZOOM,
    MIN_ZOOM,
    NEW_LINE,
    PERCENT_MULTIPLIER,
    PROGRAM_DATA_DIRECTORY,
    PROJECT_SETTINGS_FILE,
    RESOURCE_DIRECTORY,
    RVPACKER_METADATA_FILE,
    SECOND_MS,
    SEPARATOR,
    SETTINGS_PATH,
    THEME_FILE_PATH,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
    ZOOM_STEP,
} from "./utilities/constants";
import "./utilities/extensions";
import {
    animateProgressText,
    applyLocalization,
    applyTheme,
    escapeHTML,
    getThemeStyleSheet,
    join,
    logErrorIO,
    setupUi,
    tw,
} from "./utilities/functions";
import {
    expandScope,
    invokeExtractArchive,
    invokePurge,
    invokeRead,
    invokeReadLastLine,
    invokeTranslateText,
    invokeWrite,
} from "./utilities/invokes";
import { MainWindowLocalization } from "./utilities/localization";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
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

// TODO: Add listener for log file select.
// TODO: Reimplement logic for filling/interacting with log entries.

document.addEventListener("DOMContentLoaded", async () => {
    async function writeToClipboard(text: string) {
        await writeText(text);
        clipboardText = text;
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

    function getFileFlags(): FileFlags {
        let fileFlags = FileFlags.All;

        if (!UI.disableMapProcessingCheckbox.textContent.empty()) {
            fileFlags &= ~FileFlags.Map;
        }

        if (!UI.disableOtherProcessingCheckbox.textContent.empty()) {
            fileFlags &= ~FileFlags.Other;
        }

        if (!UI.disableSystemProcessingCheckbox.textContent.empty()) {
            fileFlags &= ~FileFlags.System;
        }

        if (!UI.disablePluginProcessingCheckbox.textContent.empty()) {
            fileFlags &= ~FileFlags.Scripts;
        }

        return fileFlags;
    }

    function handleTabContentKeydown(event: KeyboardEvent) {
        const textarea = event.target as HTMLTextAreaElement;
        if (textarea.tagName !== "TEXTAREA") {
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
                    Object.entries(CHARACTER_SUBSTITUTIONS).find(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ([_, subChar]) =>
                            subChar === lastSubstitutionCharacter!.char,
                    )?.[0] ?? "";

                if (!original.empty()) {
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

        if (INTERRUPTING_KEYS.includes(key)) {
            lastCharacters = "";
            lastSubstitutionCharacter = null;
            return;
        }

        if (key.length === 1) {
            lastCharacters += key;

            const match =
                Object.keys(CHARACTER_SUBSTITUTIONS).find((sequence) =>
                    lastCharacters.endsWith(sequence),
                ) ?? "";

            if (!match.empty()) {
                event.preventDefault();

                const substitution = CHARACTER_SUBSTITUTIONS[match];
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
                    ...Object.keys(CHARACTER_SUBSTITUTIONS).map(
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

    function constructMatchElement(
        metadata: string,
        result: string,
        customCounterpartText?: string,
    ): HTMLDivElement {
        const [filename, type, row] = metadata.split("-");
        const isTranslation = type.startsWith("t");
        let rowNumber = Number(row);

        // External files are 0-indexed
        if (filename !== tabInfo.currentTab.name) {
            rowNumber += 1;
        }

        const reverseType = isTranslation ? "source" : "translation";

        const resultContainer = document.createElement("div");
        resultContainer.className = tw`textSecond borderPrimary backgroundSecond my-1 cursor-pointer border-2 p-1 text-base`;

        const rowContainer =
            filename !== tabInfo.currentTab.name
                ? null
                : (UI.tabContent.children[rowNumber - 1] as HTMLDivElement);
        const counterpartElement = rowContainer?.children[
            isTranslation ? 1 : 2
        ] as HTMLElement | null;

        const resultDiv = document.createElement("div");
        resultDiv.innerHTML = result;
        resultContainer.appendChild(resultDiv);

        const sourceInfo = document.createElement("div");
        sourceInfo.className = tw`textThird text-xs`;

        sourceInfo.innerHTML = `${filename} - ${type} - ${rowNumber}`;
        resultContainer.appendChild(sourceInfo);

        const arrow = document.createElement("div");
        arrow.className = tw`textSecond font-material content-center text-xl`;
        arrow.innerHTML = "arrow_downward";
        resultContainer.appendChild(arrow);

        const counterpart = document.createElement("div");

        let counterpartText: string;

        if (counterpartElement) {
            counterpartText =
                counterpartElement.tagName === "TEXTAREA"
                    ? (counterpartElement as HTMLTextAreaElement).value
                    : counterpartElement.innerHTML;
        } else {
            counterpartText = customCounterpartText!;
        }

        counterpart.innerHTML = escapeHTML(counterpartText);

        resultContainer.appendChild(counterpart);

        const counterpartInfo = document.createElement("div");
        counterpartInfo.className = tw`textThird text-xs`;

        counterpartInfo.innerHTML = `${filename} - ${reverseType} - ${rowNumber}`;
        resultContainer.appendChild(counterpartInfo);

        resultContainer.setAttribute(
            "data",
            `${filename}-${type}-${rowNumber}`,
        );
        return resultContainer;
    }

    async function loadMatchObject(matchIndex: number) {
        UI.searchCurrentPage.textContent = matchIndex.toString();
        UI.searchPanelContent.innerHTML = "";

        const matchFile = join(
            settings.programDataPath,
            `match${matchIndex}${JSON_EXTENSION}`,
        );

        const matchContent = await readTextFile(matchFile);
        const matchObject = JSON.parse(matchContent) as MatchObject;

        for (const [id, matches] of Object.entries(matchObject)) {
            UI.searchPanelContent.appendChild(
                constructMatchElement(
                    id,
                    matches[0],
                    matches.length > 1 ? matches[1] : "",
                ),
            );
        }
    }

    async function beforeClose(noSave: boolean): Promise<boolean> {
        await awaitSave();

        if (!(noSave || (await exitConfirmation()))) {
            return false;
        }

        if (settings.projectPath) {
            const dataDirEntries = await readDir(
                settings.programDataPath,
            ).catch((err) => {
                logErrorIO(settings.programDataPath, err);
            });

            if (!dataDirEntries) {
                return false;
            }

            await removePath(settings.tempMapsPath, {
                recursive: true,
            });

            for (const entry of dataDirEntries) {
                const name = entry.name;

                if (
                    entry.isFile &&
                    ![PROJECT_SETTINGS_FILE, LOG_FILE].includes(name)
                ) {
                    await removePath(join(settings.programDataPath, name));
                }
            }

            await writeTextFile(
                settings.logPath,
                JSON.stringify(replacementLog),
            ).catch((err) => {
                logErrorIO(settings.logPath, err);
            });

            projectSettings.translationLanguages = {
                from: UI.fromLanguageInput.value,
                to: UI.toLanguageInput.value,
            };

            await writeTextFile(
                settings.projectSettingsPath,
                JSON.stringify(projectSettings),
            ).catch((err) => {
                logErrorIO(settings.projectSettingsPath, err);
            });
        }

        await writeTextFile(SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: RESOURCE_DIRECTORY,
        }).catch((err) => {
            logErrorIO(SETTINGS_PATH, err);
        });

        return true;
    }

    async function loadReplacementLog(): Promise<ReplacementLog> {
        if (settings.projectPath && (await exists(settings.logPath))) {
            return JSON.parse(
                await readTextFile(settings.logPath),
            ) as ReplacementLog;
        }

        return {};
    }

    function updateProgressMeter() {
        const total = tabInfo.total.reduce((a, b) => a + b, 0);
        const translated = tabInfo.translated.reduce((a, b) => a + b, 0);

        UI.globalProgressMeter.style.width = `${Math.round((translated / total) * PERCENT_MULTIPLIER)}%`;
        UI.globalProgressMeter.innerHTML = `${translated} / ${total}`;
    }

    function addBookmark(bookmark: Bookmark) {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = tw`backgroundPrimary backgroundSecondHovered flex h-auto flex-row items-center justify-center p-1`;
        bookmarkElement.innerHTML = `${bookmark.title}<br>${bookmark.description}`;

        bookmarks.push(bookmark);
        UI.bookmarksMenu.appendChild(bookmarkElement);
    }

    async function loadSettings(): Promise<Settings> {
        if (await exists(SETTINGS_PATH, { baseDir: RESOURCE_DIRECTORY })) {
            return new Settings(
                JSON.parse(
                    await readTextFile(SETTINGS_PATH, {
                        baseDir: RESOURCE_DIRECTORY,
                    }),
                ) as ProjectSettings,
            );
        }

        const settings = new Settings();

        await expandScope(SETTINGS_PATH);
        await writeTextFile(SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: RESOURCE_DIRECTORY,
        }).catch((err) => {
            logErrorIO(SETTINGS_PATH, err);
        });

        return settings;
    }

    function initializeLocalization(language: Language) {
        settings.language = language;
        Object.assign(localization, new MainWindowLocalization(language));
    }

    function showSearchPanel() {
        UI.searchPanel.classList.replace("translate-x-full", "translate-x-0");
    }

    function toggleSearchPanel() {
        UI.searchPanel.toggleMultiple("translate-x-0", "translate-x-full");
    }

    // const target = event.target as HTMLElement;
    //     const element = target.closest("[reverted]")!;

    //     if (element.getAttribute("reverted") === "1") {
    //         return;
    //     }

    //     const rowContainerID = element.firstElementChild!.textContent;
    //     const [filename, row] = rowContainerID.split("-");
    //     const rowNumber = Number(row) - 1;

    //     const button = event.button as MouseButton;

    //     if (button === MouseButton.Left) {
    //         await changeTab(filename);

    //         UI.tabContent.children[rowNumber].scrollIntoView({
    //             block: "center",
    //             inline: "center",
    //         });
    //     } else if (button === MouseButton.Right) {
    //         // FIXME: Rewrite for the new replacement log layout
    //         if (currentTab.name === filename) {
    //             const textarea = UI.tabContent.children[rowNumber]
    //                 .lastElementChild! as HTMLTextAreaElement;
    //             textarea.value = element.children[1].textContent;
    //         } else {
    //             const filePath = join(
    //                 settings.programDataPath,
    //                 filename.startsWith("map")
    //                     ? TEMP_MAPS_DIRECTORY
    //                     : TRANSLATION_DIRECTORY,
    //                 `${filename}${TXT_EXTENSION}`,
    //             );

    //             const fileContent = await readTextFile(filePath).catch(
    //                 (err) => {
    //                     logErrorIO(filePath, err);
    //                     return null;
    //                 },
    //             );

    //             if (fileContent === null) {
    //                 return;
    //             }

    //             const fileLines = fileContent.lines();
    //             const requiredLineParts = fileLines[rowNumber].split(SEPARATOR);
    //             requiredLineParts[1] =
    //                 element.children[1].textContent.nnormalize();

    //             fileLines[rowNumber] = requiredLineParts.join(SEPARATOR);

    //             await writeTextFile(filePath, fileLines.join("\n")).catch(
    //                 (err) => {
    //                     logErrorIO(filePath, err);
    //                 },
    //             );
    //         }

    //         element.innerHTML = `<div class="textThird">${element.firstElementChild!.textContent}</div>${localization.textReverted}<div>${element.children[1].textContent}</div>`;
    //         element.setAttribute("reverted", "1");
    //         delete replacementLog[rowContainerID];
    //     }

    async function handleResultClick(event: MouseEvent) {
        const target = event.target as HTMLDivElement;
        const resultElement = target.closest("[data]")!;

        if (!UI.searchPanelContent.contains(resultElement)) {
            return;
        }

        const elementId = resultElement.getAttribute("data")!;
        const [filename, type, row] = elementId.split("-");
        const isTranslation = type.startsWith("t");
        const rowNumber = Number(row) - 1;

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
            if (ctrl) {
                await writeToClipboard(
                    resultElement.firstElementChild!.textContent,
                );
            } else {
                await changeTab(filename);

                UI.tabContent.children[rowNumber].scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }
        } else {
            if (searchAction === SearchAction.Replace) {
                if (!isTranslation) {
                    alert(localization.sourceTextIrreplacable);
                    return;
                }
            }

            const searchText = UI.searchInput.value;

            if (!searchText.trim()) {
                return;
            }

            const replacerText = UI.replaceInput.value;
            const replacedText = await replacer.replaceSingle(
                searchText,
                replacerText,
                filename,
                rowNumber,
                searchAction,
            );

            if (replacedText.empty()) {
                return;
            }

            saver.saved = false;

            if (searchAction === SearchAction.Replace) {
                resultElement.firstElementChild!.children[0].innerHTML =
                    replacedText;
            } else {
                resultElement.children[3].innerHTML = replacedText;
            }
        }
    }

    function backup() {
        if (
            !settings.backup.enabled ||
            (backupIsActive !== null && backupIsActive !== 0)
        ) {
            return;
        }

        backupIsActive = setInterval(async () => {
            if (settings.backup.enabled) {
                await saver.saveBackup();
            } else {
                clearInterval(backupIsActive!);
            }
        }, settings.backup.period * SECOND_MS);
    }

    function updateTabProgress(tabIndex: number) {
        const progressBar = UI.leftPanel.children[tabIndex].lastElementChild
            ?.firstElementChild as HTMLElement | null;

        const percentage = Math.floor(
            (tabInfo.translated[tabIndex] / tabInfo.total[tabIndex]) *
                PERCENT_MULTIPLIER,
        );

        if (progressBar) {
            progressBar.style.width = progressBar.innerHTML = `${percentage}%`;

            if (percentage === PERCENT_MULTIPLIER) {
                progressBar.classList.replace(
                    "backgroundThird",
                    "bg-green-600",
                );
            } else {
                progressBar.classList.replace(
                    "bg-green-600",
                    "backgroundThird",
                );
            }
        }
    }

    async function changeTab(filename: string | null, newTabIndex?: number) {
        if (tabInfo.currentTab.name === filename || changeTimer !== -1) {
            return;
        }

        if (filename !== null && !(filename in tabInfo.tabs)) {
            return;
        }

        await awaitSave();

        if (tabInfo.currentTab.name) {
            await saver.saveSingle();

            const selectedTab = UI.leftPanel.children[tabInfo.currentTab.index];

            selectedTab.classList.replace(
                "backgroundThird",
                "backgroundPrimary",
            );
        }

        UI.tabContent.innerHTML = "";

        if (filename === null) {
            tabInfo.currentTab.name = "";
            UI.currentTabDiv.innerHTML = "";
        } else {
            UI.currentTabDiv.innerHTML = tabInfo.currentTab.name = filename;

            newTabIndex ??= tabInfo.tabs[filename];
            tabInfo.currentTab.index = newTabIndex;

            const selectedTab = UI.leftPanel.children[tabInfo.currentTab.index];
            selectedTab.classList.replace(
                "backgroundPrimary",
                "backgroundThird",
            );

            await createTabContent(filename);
        }

        changeTimer = setTimeout(() => {
            changeTimer = -1;
            // eslint-disable-next-line no-magic-numbers
        }, SECOND_MS / 10);

        selectedTextareas.clear();
        replacedTextareas.clear();
    }

    function handleGotoRowInputKeypress(event: KeyboardEvent) {
        if (event.code === "Enter") {
            const targetRow = document.getElementById(
                `${tabInfo.currentTab.name}-${UI.goToRowInput.value}`,
            ) as HTMLDivElement | null;

            if (targetRow) {
                targetRow.scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }

            UI.goToRowInput.value = "";
            UI.goToRowInput.classList.add("hidden");
        } else if (event.code === "Escape") {
            UI.goToRowInput.value = "";
            UI.goToRowInput.classList.add("hidden");
        }
    }

    function areLanguageTagsValid(): boolean {
        const from = UI.fromLanguageInput.value.trim();
        const to = UI.toLanguageInput.value.trim();

        if (!from || !to) {
            alert(localization.translationLanguagesNotSelected);
            return false;
        }

        try {
            new Intl.Locale(from);
            new Intl.Locale(to);
        } catch {
            alert(localization.incorrectLanguageTag);
            return false;
        }

        return true;
    }

    async function handleCtrlKeypress(event: KeyboardEvent) {
        switch (event.code) {
            case "KeyZ":
                event.preventDefault();

                for (const [rowNumber, value] of selectedTextareas.entries()) {
                    const rowContainer = UI.tabContent.children[
                        rowNumber
                    ] as HTMLDivElement;
                    const translationTextArea =
                        rowContainer.lastElementChild! as HTMLTextAreaElement;
                    translationTextArea.value = value;
                }

                for (const [rowNumber, value] of replacedTextareas.entries()) {
                    const rowContainer = UI.tabContent.children[
                        rowNumber
                    ] as HTMLDivElement;
                    const translationTextArea =
                        rowContainer.lastElementChild! as HTMLTextAreaElement;
                    translationTextArea.value = value;
                    translationTextArea.calculateHeight();
                }

                replacedTextareas.clear();
                break;
            case "KeyS":
                await saver.saveAll();
                break;
            case "KeyG":
                event.preventDefault();

                if (!tabInfo.currentTab.name.empty()) {
                    if (UI.goToRowInput.classList.contains("hidden")) {
                        UI.goToRowInput.classList.remove("hidden");
                        UI.goToRowInput.focus();

                        const lastRow =
                            UI.tabContent.lastElementChild!.id.split("-")[1];
                        UI.goToRowInput.placeholder = `${localization.goToRow} ${lastRow}`;
                    } else {
                        UI.goToRowInput.classList.add("hidden");
                    }
                }
                break;
            case "KeyF":
                event.preventDefault();

                UI.searchMenu.classList.replace("hidden", "flex");
                UI.searchInput.focus();
                break;
            case "KeyB":
                UI.bookmarksMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    UI.bookmarksMenu.style.left = `${UI.bookmarksButton.offsetLeft}px`;
                    UI.bookmarksMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case "Equal":
                if (settings.zoom < MAX_ZOOM) {
                    settings.zoom += ZOOM_STEP;
                    await APP_WINDOW.setZoom(settings.zoom);
                }
                break;
            case "Minus":
                if (settings.zoom > MIN_ZOOM) {
                    settings.zoom -= ZOOM_STEP;
                    await APP_WINDOW.setZoom(settings.zoom);
                }
                break;
            case "KeyR":
                event.preventDefault();
                break;
        }
    }

    function jumpToRow(direction: JumpDirection) {
        const focusedElement = document.activeElement as HTMLElement;
        if (
            !UI.tabContent.contains(focusedElement) &&
            focusedElement.tagName !== "TEXTAREA"
        ) {
            return;
        }

        const [file, row] = focusedElement
            .closest(`[id^="${tabInfo.currentTab.name}"]`)!
            .id.split("-");
        const rowNumber = Number(row);

        if (
            Number.isNaN(rowNumber) ||
            (rowNumber === 1 && direction === JumpDirection.Previous) ||
            (rowNumber === UI.tabContent.children.length &&
                direction === JumpDirection.Next)
        ) {
            return;
        }

        const step = direction === JumpDirection.Next ? 1 : -1;
        const nextElement = document.getElementById(
            `${file}-${rowNumber + step}`,
        )!.lastElementChild as HTMLTextAreaElement | null;

        if (!nextElement) {
            return;
        }

        window.scrollBy(0, step * nextElement.clientHeight);
        focusedElement.blur();
        nextElement.focus();
        nextElement.setSelectionRange(0, 0);
    }

    async function handleBodyKeypress(event: KeyboardEvent) {
        if (event.ctrlKey) {
            // FIXME: fires only if currently on body, fix
            await handleCtrlKeypress(event);
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    await write();
                    break;
                case "F4":
                    await APP_WINDOW.close();
                    break;
            }
        } else {
            switch (event.code) {
                case "Escape":
                    await changeTab(null);
                    break;
                case "Tab":
                    UI.leftPanel.toggleMultiple(
                        "translate-x-0",
                        "-translate-x-full",
                    );
                    break;
                case "KeyR":
                    toggleSearchPanel();
                    break;
                case "ArrowDown":
                    if (tabInfo.currentTab.index !== -1) {
                        const newStateIndex =
                            (tabInfo.currentTab.index + 1) %
                            UI.leftPanel.children.length;

                        await changeTab(
                            UI.leftPanel.children[newStateIndex]
                                .firstElementChild!.textContent,
                            newStateIndex,
                        );
                    }
                    break;
                case "ArrowUp":
                    if (tabInfo.currentTab.index !== -1) {
                        const newStateIndex =
                            (tabInfo.currentTab.index -
                                1 +
                                UI.leftPanel.children.length) %
                            UI.leftPanel.children.length;
                        await changeTab(
                            UI.leftPanel.children[newStateIndex]
                                .firstElementChild!.textContent,
                            newStateIndex,
                        );
                    }

                    break;
            }
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

                    const sourceTextDiv = selectedTextArea.parentElement!
                        .children[1] as HTMLDivElement;
                    let sourceText = sourceTextDiv.textContent;

                    if (
                        sourceText.startsWith(MAP_DISPLAY_NAME_COMMENT_PREFIX)
                    ) {
                        sourceText = sourceText.slice(
                            MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                            -COMMENT_SUFFIX_LENGTH,
                        );
                    }

                    const translation =
                        (await invokeTranslateText({
                            text: sourceText,
                            to: UI.toLanguageInput.value.trim(),
                            from: UI.fromLanguageInput.value.trim(),
                            normalize: false,
                        })) ?? "";

                    if (!translation.empty()) {
                        selectedTextArea.placeholder = translation;
                    }
                    break;
                }
        }
    }

    async function handleKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
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

        if (event.key === "Shift" && !event.repeat) {
            shift = true;
        }

        if (event.key === "Control" && !event.repeat) {
            ctrl = true;
        }
    }

    function toggleCaseSensitive() {
        UI.searchCaseButton.classList.toggle("backgroundThird");
        searchFlags.flags ^= SearchFlags.CaseSensitive;
    }

    function toggleWholeWordSearch() {
        UI.searchWholeButton.classList.toggle("backgroundThird");
        searchFlags.flags ^= SearchFlags.WholeWord;
    }

    function toggleRegExpSearch() {
        UI.searchRegexButton.classList.toggle("backgroundThird");
        searchFlags.flags ^= SearchFlags.RegExp;
    }

    function toggleLocalSearch() {
        UI.searchLocationButton.classList.toggle("backgroundThird");
        searchFlags.flags ^= SearchFlags.OnlyCurrentTab;
    }

    async function searchText(predicate: string, searchAction: SearchAction) {
        const matchPageCount = (
            await searcher.search(
                predicate,
                Number(UI.searchModeSelect.value),
                searchAction,
            )
        )[1];

        UI.searchCurrentPage.innerHTML = "0";

        if (searchAction === SearchAction.Search) {
            if (matchPageCount === -1) {
                UI.searchTotalPages.innerHTML = "0";
                UI.searchPanelContent.innerHTML = `<div id="no-results" class="content-center h-full">${localization.noMatches}</div>`;
            } else {
                UI.searchTotalPages.innerHTML = matchPageCount.toString();
                void loadMatchObject(0);
            }

            showSearchPanel();
        }
    }
    async function handleSearchInputKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                UI.searchInput.value += "\n";
                UI.searchInput.calculateHeight();
                return;
            }

            const predicate = UI.searchInput.value;

            if (predicate.trim()) {
                await searchText(predicate, SearchAction.Search);
            }
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    toggleCaseSensitive();
                    break;
                case "KeyW":
                    toggleWholeWordSearch();
                    break;
                case "KeyR":
                    toggleRegExpSearch();
                    break;
                case "KeyL":
                    toggleLocalSearch();
                    break;
            }
        }

        requestAnimationFrame(() => {
            UI.searchInput.calculateHeight();
        });
    }

    function handleReplaceInputKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                UI.replaceInput.value += "\n";
                UI.replaceInput.calculateHeight();
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                UI.replaceInput.calculateHeight();
            });
        }
    }

    function createRow(
        source: string,
        translation: string[],
        tabName: string,
        row: number,
    ) {
        const textParent = document.createElement("div");
        textParent.id = `${tabName}-${row}`;
        textParent.className = tw`flex w-full flex-row justify-around py-[1px]`;

        const sourceTextDiv = document.createElement("div");
        sourceTextDiv.className = tw`outlinePrimary backgroundPrimary font inline-block w-full cursor-pointer p-1 whitespace-pre-wrap outline outline-2`;

        if (settings.fontUrl) {
            sourceTextDiv.style.fontFamily = "font";
        }

        sourceTextDiv.textContent = source;

        const translationTextArea = document.createElement("textarea");
        translationTextArea.rows = translation.length;
        translationTextArea.className = tw`outlinePrimary outlineFocused backgroundPrimary font w-full resize-none overflow-hidden p-1 outline outline-2 focus:z-10`;
        translationTextArea.spellcheck = false;
        translationTextArea.autocomplete = "off";
        translationTextArea.autocapitalize = "off";
        translationTextArea.autofocus = false;

        if (settings.fontUrl) {
            translationTextArea.style.fontFamily = "font";
        }

        translationTextArea.value = translation.join("\n");

        const rowNumberContainer = document.createElement("div");
        rowNumberContainer.className = tw`outlinePrimary backgroundPrimary flex w-52 flex-row p-1 outline outline-2`;

        const rowNumberSpan = document.createElement("span");
        rowNumberSpan.textContent = row.toString();

        const rowNumberButtonDiv = document.createElement("div");
        rowNumberButtonDiv.className = tw`textThird flex w-full items-start justify-end gap-0.5 p-0.5 text-lg`;

        const bookmarkButton = document.createElement("button");
        bookmarkButton.className = tw`borderPrimary backgroundPrimaryHovered font-material flex max-h-6 max-w-6 items-center justify-center rounded-md border-2`;
        bookmarkButton.textContent = "bookmark";

        if (bookmarks.some((obj) => obj.title === textParent.id)) {
            bookmarkButton.classList.add("backgroundThird");
        }

        const deleteButton = document.createElement("button");
        deleteButton.className = tw`borderPrimary backgroundPrimaryHovered font-material flex max-h-6 max-w-6 content-center items-center justify-center rounded-md border-2`;
        deleteButton.textContent = "close";

        rowNumberButtonDiv.appendChild(deleteButton);
        rowNumberButtonDiv.appendChild(bookmarkButton);
        rowNumberContainer.appendChild(rowNumberSpan);
        rowNumberContainer.appendChild(rowNumberButtonDiv);

        sourceTextDiv.classList.add("text-lg");
        document.body.appendChild(sourceTextDiv);

        const { lineHeight, paddingTop } =
            window.getComputedStyle(sourceTextDiv);
        const minHeight =
            (sourceTextDiv.innerHTML.count("\n") + 1) *
                Number.parseInt(lineHeight) +
            Number.parseInt(paddingTop) * 2;

        document.body.removeChild(sourceTextDiv);
        sourceTextDiv.classList.remove("text-lg");

        textParent.style.minHeight =
            rowNumberContainer.style.minHeight =
            sourceTextDiv.style.minHeight =
            translationTextArea.style.minHeight =
            textParent.style.minHeight =
                `${minHeight}px`;

        textParent.appendChild(rowNumberContainer);
        textParent.appendChild(sourceTextDiv);
        textParent.appendChild(translationTextArea);

        return textParent;
    }

    async function createTabContent(filename: string) {
        const formatted = `${filename}${TXT_EXTENSION}`;
        let contentPath = join(settings.translationPath, formatted);

        if (filename.startsWith("plugins") && !(await exists(contentPath))) {
            if (await exists(join(settings.translationPath, "scripts.txt"))) {
                contentPath = join(settings.translationPath, formatted);
            }
        } else if (filename.startsWith("map")) {
            contentPath = join(settings.tempMapsPath, formatted);
        }

        const content = await readTextFile(contentPath).catch((err) => {
            logErrorIO(contentPath, err);
            return null;
        });

        if (content === null) {
            return;
        }

        const contentLines = content.lines();

        if (filename === "system") {
            contentLines.pop();
        }

        const fragment = document.createDocumentFragment();

        for (const [row, line] of contentLines.entries()) {
            if (!line) {
                continue;
            }

            const [source_, translation_] = line.split(SEPARATOR);
            const actualRow = row + 1;

            const source = source_.denormalize();
            const translationLines = translation_.split(NEW_LINE);
            const rowDiv = createRow(
                source,
                translationLines,
                filename,
                actualRow,
            );

            fragment.appendChild(rowDiv);
        }

        UI.tabContent.appendChild(fragment);
    }

    async function write(
        outputPath = settings.outputPath,
        disableProcessing = FileFlags.None,
    ) {
        if (!settings.projectPath || !projectSettings.sourceDirectory) {
            if (!projectSettings.sourceDirectory) {
                alert(localization.gameFilesDoNotExist);
            }
            return;
        }

        UI.writeMenu.classList.replace("flex", "hidden");
        UI.writeButton.firstElementChild!.classList.add("animate-spin");

        await invokeWrite({
            sourcePath: settings.sourcePath,
            translationPath: settings.translationPath,
            outputPath,
            engineType: settings.engineType,
            duplicateMode: projectSettings.duplicateMode,
            gameTitle: UI.currentGameTitle.value,
            romanize: projectSettings.romanize,
            disableCustomProcessing: projectSettings.disableCustomProcessing,
            disableProcessing,
            trim: projectSettings.trim,
        })
            .then((executionTime: string) => {
                UI.writeButton.firstElementChild!.classList.remove(
                    "animate-spin",
                );
                alert(`${localization.writeSuccess} ${executionTime}`);
            })
            .catch(error);
    }

    function getNewLinePositions(
        textarea: HTMLTextAreaElement,
    ): { left: number; top: number }[] {
        const positions: { left: number; top: number }[] = [];
        const lines = textarea.value.lines();

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
            ghostNewLineDiv.className = tw`textThird pointer-events-none absolute z-50 cursor-default select-none`;
            ghostNewLineDiv.style.left = `${left}px`;
            ghostNewLineDiv.style.top = `${top}px`;
            ghostNewLineDiv.textContent = "\\n";

            activeGhostLines.push(ghostNewLineDiv);
            document.body.appendChild(ghostNewLineDiv);
        }
    }

    function calculateHeight(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        const lines = target.value.count("\n");

        const { lineHeight, padding } = window.getComputedStyle(target);
        const newHeight = lines * Number(lineHeight) + Number(padding) * 2;

        const parent = target.parentElement;

        if (parent) {
            for (const child of parent.children as HTMLCollectionOf<HTMLElement>) {
                child.style.height = `${newHeight}px`;
            }
        }
    }

    function handleFocus(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;

        if (
            UI.tabContent.contains(target) &&
            target.tagName === "TEXTAREA" &&
            target.id !== currentFocusedElement[0]
        ) {
            currentFocusedElement = [target.id, target.value];
        }

        textareaStatus = target.value.trim()
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
                if (!target.value.trim()) {
                    changeProgress(ProgressDirection.Decrement);
                }
                break;
            case TextAreaStatus.Untranslated:
                if (target.value.trim()) {
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

    async function exitConfirmation(): Promise<boolean> {
        if (saver.saved) {
            return true;
        }

        const askExitUnsaved: boolean = await ask(localization.unsavedChanges);

        if (!askExitUnsaved) {
            const exitRequested = await ask(localization.exit);
            return exitRequested;
        }

        await saver.saveAll();
        return true;
    }

    async function awaitSave() {
        while (saver.saving) {
            await new Promise((resolve) => setTimeout(resolve, SECOND_MS / 5));
        }
    }

    function setTheme(newTheme: Theme) {
        if (newTheme.name === currentTheme) {
            return;
        }

        [currentTheme, theme] = [newTheme.name, newTheme];

        applyTheme(STYLE_SHEET, theme);
        settings.theme = newTheme.name;
    }

    function createTab(name: string, rows: string[]) {
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
            if (line.startsWith(COMMENT_PREFIX)) {
                total--;
            } else if (!line.endsWith(SEPARATOR)) {
                translated++;
            }
        }

        if (total <= 0) {
            return;
        }

        const percentage = Math.floor(
            (translated / total) * PERCENT_MULTIPLIER,
        );

        tabInfo.total.push(total);
        tabInfo.translated.push(translated);

        const buttonElement = document.createElement("button");
        buttonElement.className = tw`backgroundPrimary backgroundPrimaryHovered flex h-8 w-full cursor-pointer flex-row justify-center p-1`;
        buttonElement.id = tabInfo.tabCount.toString();

        const stateSpan = document.createElement("span");
        stateSpan.innerHTML = name;
        stateSpan.className = "pr-1";
        buttonElement.appendChild(stateSpan);

        const progressBar = document.createElement("div");
        const progressMeter = document.createElement("div");

        progressBar.className = tw`backgroundSecond w-full rounded-xs`;
        progressMeter.className = tw`backgroundThird textPrimary rounded-xs p-0.5 text-center text-xs leading-none font-medium`;
        progressMeter.style.width =
            progressMeter.textContent = `${percentage}%`;

        if (percentage === PERCENT_MULTIPLIER) {
            progressMeter.classList.replace("backgroundThird", "bg-green-600");
        }

        progressBar.appendChild(progressMeter);
        buttonElement.appendChild(progressBar);

        const checkboxDiv = document.createElement("div");
        checkboxDiv.className = tw`flex flex-row items-center gap-1 p-0.5`;
        checkboxDiv.id = buttonElement.id;

        const checkbox = document.createElement("span");
        checkbox.className = tw`checkbox borderPrimary max-h-6 min-h-6 max-w-6 min-w-6`;

        const checkboxLabel = document.createElement("span");
        checkboxLabel.className = tw`text-base`;
        checkboxLabel.innerHTML = (
            buttonElement.firstElementChild as HTMLElement
        ).textContent;

        checkboxDiv.append(checkbox, checkboxLabel);
        batchWindow.addCheckbox(checkboxDiv);

        UI.leftPanel.appendChild(buttonElement);
        tabInfo.tabs[name] = tabInfo.tabCount;
        tabInfo.tabCount += 1;
    }

    async function extractArchive(projectPath: string): Promise<boolean> {
        let extracted = false;

        for (const archive of ["Game.rgssad", "Game.rgss2a", "Game.rgss3a"]) {
            const archivePath = join(projectPath, archive);

            if (await exists(archivePath)) {
                await invokeExtractArchive(archivePath, projectPath);

                extracted = true;
                break;
            }
        }

        return extracted;
    }

    async function isProjectValid(projectPath: string): Promise<boolean> {
        if (!(await exists(projectPath))) {
            if (projectPath) {
                await message(localization.selectedFolderMissing);
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
        const projectSettingsPath = join(
            projectPath,
            PROGRAM_DATA_DIRECTORY,
            PROJECT_SETTINGS_FILE,
        );

        if (await exists(projectSettingsPath)) {
            const projectSettingsContent =
                await readTextFile(projectSettingsPath);

            projectSettings = new ProjectSettings(
                JSON.parse(projectSettingsContent) as ProjectSettingsOptions,
            );
        }

        const engineTypeFound =
            await projectSettings.findEngineType(projectPath);

        if (!engineTypeFound) {
            await message(localization.cannotDetermineEngine);
            await changeTab(null);
            UI.tabContent.innerHTML =
                UI.currentGameEngine.innerHTML =
                UI.currentGameTitle.value =
                    "";

            return false;
        }

        settings.engineType = projectSettings.engineType;

        for (const element of [
            UI.gameInfo,
            UI.currentTabDiv,
            UI.progressMeterContainer,
        ]) {
            element.classList.replace("hidden", "flex");
        }

        UI.toLanguageInput.value = projectSettings.translationLanguages.to;
        UI.fromLanguageInput.value = projectSettings.translationLanguages.from;
        UI.trimCheckbox.textContent = projectSettings.trim ? "check" : "";
        UI.romanizeCheckbox.textContent = projectSettings.romanize
            ? "check"
            : "";
        UI.disableCustomProcessingCheckbox.textContent =
            projectSettings.disableCustomProcessing ? "check" : "";
        UI.duplicateModeSelect.value = projectSettings.duplicateMode.toString();

        UI.currentGameEngine.innerHTML = ENGINE_NAMES[settings.engineType];
        return true;
    }

    async function copyTranslationFromRoot(translationPath: string) {
        const ok = await mkdir(settings.translationPath, {
            recursive: true,
        }).catch((err) => {
            logErrorIO(settings.translationPath, err);
            return false;
        });

        if (ok === false) {
            return;
        }

        const translationEntries = await readDir(translationPath).catch(
            (err) => {
                logErrorIO(settings.translationPath, err);
            },
        );

        if (!translationEntries) {
            return;
        }

        for (const entry of translationEntries) {
            await copyFile(
                join(translationPath, entry.name),
                join(settings.translationPath, entry.name),
            );
        }

        const metadataPath = join(translationPath, RVPACKER_METADATA_FILE);

        if (await exists(metadataPath)) {
            const metadataContent = await readTextFile(metadataPath).catch(
                (err) => {
                    logErrorIO(metadataPath, err);
                    return "";
                },
            );

            if (metadataContent.empty()) {
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
            const tempMapPath = join(
                settings.tempMapsPath,
                `map${mapID}${TXT_EXTENSION}`,
            );

            await writeTextFile(tempMapPath, result.join("\n")).catch((err) => {
                logErrorIO(tempMapPath, err);
            });

            createTab(`map${mapID}`, result);
            result.length = 0;
        }

        for (const [lineIndex, line] of lines.entries()) {
            if (line.startsWith(BOOKMARK_COMMENT_PREFIX)) {
                addBookmark({
                    title: `${filename}-${lineIndex + 1}`,
                    description: line.slice(
                        line.lastIndexOf(SEPARATOR) + SEPARATOR.length,
                    ),
                });
            } else {
                if (line.startsWith(MAP_COMMENT)) {
                    mapIndices.push(
                        Number(
                            line.slice(
                                line.lastIndexOf(SEPARATOR) + SEPARATOR.length,
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
        const translationFiles = await readDir(settings.translationPath).catch(
            (err) => {
                logErrorIO(settings.translationPath, err);
            },
        );

        if (!translationFiles) {
            return;
        }

        for (const translationFile of translationFiles) {
            if (!translationFile.name.endsWith(TXT_EXTENSION)) {
                continue;
            }

            const translationFileContent = await readTextFile(
                join(settings.translationPath, translationFile.name),
            ).catch((err) => {
                logErrorIO(settings.translationPath, err);
                return "";
            });

            if (translationFileContent.empty()) {
                continue;
            }

            const contentLines = translationFileContent.lines();

            if (contentLines.length === 1) {
                continue;
            }

            const translationFileBasename = translationFile.name.slice(
                0,
                -TXT_EXTENSION_LENGTH,
            );

            if (!translationFileBasename.startsWith("map")) {
                for (const [lineIndex, line] of contentLines.entries()) {
                    if (line.startsWith(BOOKMARK_COMMENT_PREFIX)) {
                        addBookmark({
                            title: `${translationFileBasename}-${lineIndex + 1}`,
                            description: line.slice(
                                line.lastIndexOf(SEPARATOR) + SEPARATOR.length,
                            ),
                        });
                    }
                }

                createTab(translationFileBasename, contentLines);
                continue;
            }

            await parseTranslationLines(contentLines, translationFileBasename);
        }
    }

    async function openProject(pathToProject: string, openingNew: boolean) {
        await expandScope(pathToProject);

        if (!(await isProjectValid(pathToProject))) {
            settings.reset();
            UI.projectStatus.innerHTML = localization.noProjectSelected;
            return;
        }

        // Save and reset everything before opening a new project
        if (openingNew) {
            await saver.saveAll();
            await beforeClose(true);
            await changeTab(null);
            UI.leftPanel.innerHTML = "";
            batchWindow.clear();
            UI.currentGameTitle.innerHTML = "";
            tabInfo.total.length = 0;
            tabInfo.translated.length = 0;
        }

        UI.projectStatus.innerHTML = localization.loadingProject;
        const interval = animateProgressText(UI.projectStatus);

        await settings.setProjectPath(
            pathToProject,
            projectSettings.sourceDirectory,
        );

        if (!(await exists(settings.translationPath))) {
            const rootTranslationPath = join(
                settings.projectPath,
                TRANSLATION_DIRECTORY,
            );

            if (await exists(rootTranslationPath)) {
                await copyTranslationFromRoot(rootTranslationPath);
            } else {
                await invokeRead({
                    projectPath: settings.projectPath,
                    sourcePath: settings.sourcePath,
                    translationPath: settings.translationPath,
                    duplicateMode: DuplicateMode.Allow,
                    romanize: false,
                    disableCustomProcessing: false,
                    disableProcessing: FileFlags.None,
                    readMode: ReadMode.Default,
                    engineType: settings.engineType,
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
                    join(settings.translationPath, ".rvpacker-metadata"),
                    JSON.stringify(metadata),
                );
            }
        }

        await parseTranslationFiles();
        updateProgressMeter();

        // Parse theme
        for (const themeName of Object.keys(themes)) {
            const themeButton = document.createElement("button");
            themeButton.id = themeButton.innerHTML = themeName;
            themeButton.className = tw`backgroundPrimary backgroundPrimaryHovered h-8 p-1 text-base`;
            UI.themeMenu.insertBefore(themeButton, UI.createThemeMenuButton);
        }

        backup();

        // Upon the first launch, show docs
        if (settings.firstLaunch) {
            // eslint-disable-next-line sonarjs/constructor-for-side-effects
            new WebviewWindow("help", {
                url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                title: localization.helpButton,
                center: true,
            });
            settings.firstLaunch = false;
        }

        // Set game title
        const systemFilePath = join(settings.translationPath, "system.txt");
        const [sourceTitle, translationTitle] = (
            await invokeReadLastLine(systemFilePath)
        ).split(SEPARATOR);
        UI.currentGameTitle.setAttribute("source-title", sourceTitle);
        UI.currentGameTitle.value = translationTitle || sourceTitle;

        // Reset project status
        UI.projectStatus.innerHTML = "";
        clearInterval(interval);
    }

    async function checkForUpdates() {
        if (!settings.checkForUpdates) {
            return;
        }

        try {
            const update = await checkVersion();

            if (!update) {
                await info(localization.upToDate);
                return;
            }

            const installUpdate = await ask(
                `${localization.newVersionFound}: ${update.version}\n${localization.currentVersion}: ${update.currentVersion}\nRelease notes: https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate/releases/latest`,
                {
                    title: localization.updateAvailable,
                    okLabel: localization.installUpdate,
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
            const element = children[i];
            const rowNumberElement =
                element.firstElementChild!.firstElementChild!;
            const newRowNumber = (i + 1).toString();

            rowNumberElement.textContent = newRowNumber;
            // eslint-disable-next-line sonarjs/slow-regex
            element.id = element.id.replace(/\d+$/, newRowNumber);
        }
    }

    function handleBookmarkButtonClick(target: HTMLElement) {
        const rowContainerId = target.closest(
            `[id^="${tabInfo.currentTab.name}"]`,
        )!.id;
        const bookmarkIndex = bookmarks.findIndex(
            (obj) => obj.title === rowContainerId,
        );

        if (bookmarkIndex !== -1) {
            bookmarks.splice(bookmarkIndex, 1);

            for (const bookmark of UI.bookmarksMenu.children) {
                if (bookmark.textContent.startsWith(rowContainerId)) {
                    bookmark.remove();
                }
            }

            target.classList.remove("backgroundThird");
            return;
        }

        const bookmarkDescriptionInput = document.createElement("input");
        bookmarkDescriptionInput.className = tw`input textSecond backgroundSecond absolute z-50 h-7 w-auto p-1 text-base`;
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

                const rowContainerIdParts = rowContainerId.split("-");
                const rowNumber = Number(rowContainerIdParts[1]);
                const bookmarkElement = createRow(
                    `<!-- Bookmark: ${rowNumber} -->`,
                    [description],
                    tabInfo.currentTab.name,
                    rowNumber,
                );

                UI.tabContent.insertBefore(
                    bookmarkElement,
                    target.parentElement!.parentElement!.parentElement,
                );
                updateRowIds(rowNumber);
                addBookmark({
                    title: rowContainerIdParts.join("-"),
                    description,
                });
                target.classList.add("backgroundThird");
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
                alert(localization.deletingDisabled);
                return;
            // @ts-expect-error Fallthrough because of shared behavior
            case RowDeleteMode.Confirmation: {
                const confirm = await ask(localization.deletingConfirmation);

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

                if (!shift) {
                    multipleTextAreasSelected = false;

                    for (const rowNumber of selectedTextareas.keys()) {
                        const rowContainer = UI.tabContent.children[
                            rowNumber
                        ] as HTMLDivElement;
                        (
                            rowContainer.lastElementChild! as HTMLTextAreaElement
                        ).style.outlineColor = "";
                    }
                } else {
                    if (
                        !UI.tabContent.contains(document.activeElement) ||
                        document.activeElement?.tagName !== "TEXTAREA"
                    ) {
                        return;
                    }

                    event.preventDefault();

                    selectedTextareas.clear();
                    multipleTextAreasSelected = true;

                    const clickedRowContainerNumber = Number(
                        target
                            .closest(`[id^="${tabInfo.currentTab.name}"]`)!
                            .id.split("-")[1],
                    );
                    const selectedRowContainerNumber = Number(
                        document.activeElement
                            .closest(`[id^="${tabInfo.currentTab.name}"]`)!
                            .id.split("-")[1],
                    );

                    const rowsRange =
                        clickedRowContainerNumber - selectedRowContainerNumber;
                    const rowsToSelect = Math.abs(rowsRange);

                    const direction = rowsRange > 0 ? 1 : -1;

                    for (let i = 0; i <= Math.abs(rowsToSelect); i++) {
                        const rowNumber =
                            selectedRowContainerNumber + direction * i - 1;

                        const nextRowContainer = UI.tabContent.children[
                            rowNumber
                        ] as HTMLDivElement;
                        const nextTextArea =
                            nextRowContainer.lastElementChild as HTMLTextAreaElement;

                        nextTextArea.style.outlineColor = theme.outlineFocused;
                        selectedTextareas.set(rowNumber, nextTextArea.value);
                    }
                }
            }
        }
    }

    async function handleTabContentCopy(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            await writeToClipboard(
                Array.from(selectedTextareas.values()).join(
                    CLIPBOARD_SEPARATOR,
                ),
            );
        }
    }

    async function handleTabContentCut(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();

            await writeToClipboard(
                Array.from(selectedTextareas.values()).join(
                    CLIPBOARD_SEPARATOR,
                ),
            );

            for (const rowNumber of selectedTextareas.keys()) {
                const rowContainer = UI.tabContent.children[
                    rowNumber
                ] as HTMLDivElement;

                const textarea =
                    rowContainer.lastElementChild! as HTMLTextAreaElement;

                if (textarea.value) {
                    changeProgress(ProgressDirection.Decrement);
                }

                textarea.value = "";
            }

            textareaStatus = TextAreaStatus.None;
            saver.saved = false;
        }
    }

    function handleTabContentPaste(event: ClipboardEvent) {
        const normalized = clipboardText.denormalize();

        if (document.activeElement?.tagName !== "TEXTAREA") {
            return;
        }

        const startRowContainer = document.activeElement.closest(
            `[id^="${tabInfo.currentTab.name}"]`,
        )!;

        if (normalized.includes(CLIPBOARD_SEPARATOR)) {
            event.preventDefault();
            const clipboardTextSplit = normalized.split(CLIPBOARD_SEPARATOR);
            const textRows = clipboardTextSplit.length;
            const startIndex = Number(startRowContainer.id.split("-")[1]);

            if (textRows === 0) {
                return;
            } else {
                for (let i = 0; i < textRows; i++) {
                    const rowIndex = startIndex + i - 1;

                    if (rowIndex > UI.tabContent.children.length) {
                        return;
                    }

                    const rowContainer = UI.tabContent.children[
                        rowIndex
                    ] as HTMLDivElement;

                    const textarea =
                        rowContainer.lastElementChild! as HTMLTextAreaElement;

                    if (!textarea.value && clipboardTextSplit[i]) {
                        changeProgress(ProgressDirection.Increment);
                    }

                    replacedTextareas.set(
                        rowIndex,
                        textarea.value.replaceAll(normalized, ""),
                    );
                    textarea.value = clipboardTextSplit[i];
                    textarea.calculateHeight();
                }

                textareaStatus = TextAreaStatus.None;
                saver.saved = false;
            }
        }
    }

    function handleTabContentKeyup(event: KeyboardEvent) {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName === "TEXTAREA") {
            target.calculateHeight();
        }
    }

    function handleTabContentInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;

        if (target.tagName === "TEXTAREA" && settings.displayGhostLines) {
            trackFocus(event);
        }
    }

    function handleSearchMenuChange(event: Event) {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case UI.searchInput.id:
            case UI.replaceInput.id:
                calculateHeight(event);
                break;
            default:
                break;
        }
    }

    async function handleSearchMenuKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case UI.searchInput.id:
                await handleSearchInputKeypress(event);
                break;
            case UI.replaceInput.id:
                handleReplaceInputKeypress(event);
                break;
            default:
                break;
        }
    }

    function handleThemeWindowInput(event: Event) {
        const target = event.target as HTMLInputElement;

        if (target.type === "color") {
            applyTheme(STYLE_SHEET, [target.id, target.value]);
        }
    }

    function handleToolsMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (!batchWindow.isHidden()) {
            batchWindow.hide();
            return;
        }

        let batchAction = BatchAction.None;

        switch (target.id) {
            case UI.translateToolsMenuButton.id:
                if (!areLanguageTagsValid()) {
                    return;
                }

                batchAction = BatchAction.Translate;
                break;
            case "trim-tools-menu-button":
                batchAction = BatchAction.Trim;
                break;
            case "wrap-tools-menu-button":
                batchAction = BatchAction.Wrap;
                break;
        }

        if (batchAction === BatchAction.None) {
            return;
        }

        batchWindow.show(batchAction);
    }

    function handleThemeMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id !== "create-theme-menu-button") {
            setTheme(themes[target.id]);
            return;
        }

        UI.themeWindow.classList.remove("hidden");
        UI.themeWindow.style.left = `${(document.body.clientWidth - UI.themeWindow.clientWidth) / 2}px`;

        const themeColors = Object.values(theme);
        let colorIndex = 1;

        for (const div of UI.themeWindowBody.children) {
            for (const subdiv of div.children) {
                (subdiv.firstElementChild as HTMLInputElement).value =
                    themeColors[colorIndex++];
            }
        }
    }

    async function handleBookmarksMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target || target.id === UI.bookmarksMenu.id) {
            return;
        }

        const [filename, row] = target.textContent.split("-");

        await changeTab(filename);
        UI.tabContent.children[Number(row)].scrollIntoView({
            inline: "center",
            block: "center",
        });
    }

    async function handleLeftPanelClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        const leftPanelChildren = Array.from(UI.leftPanel.children);
        let innerTarget: HTMLElement | null = target;

        while (innerTarget && !leftPanelChildren.includes(innerTarget)) {
            innerTarget = innerTarget.parentElement;
        }

        if (innerTarget) {
            await changeTab(
                innerTarget.firstElementChild!.textContent,
                Number.parseInt(innerTarget.id),
            );
        }
    }

    async function handleThemeWindowClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case UI.createThemeButton.id: {
                const themeNameInput: HTMLInputElement =
                    UI.themeWindow.querySelector("#theme-name-input")!;
                const themeName = themeNameInput.value.trim();

                if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                    await message(
                        `${localization.invalidThemeName} ${localization.allowedThemeNameCharacters}`,
                    );
                    return;
                }

                const newTheme = { name: themeName } as Theme;
                for (const div of UI.themeWindowBody.children) {
                    for (const subdiv of div.children) {
                        const input =
                            subdiv.firstElementChild as HTMLInputElement;
                        newTheme[input.id as keyof Theme] = input.value;
                    }
                }

                themes[themeName] = newTheme;

                const ok = await writeTextFile(
                    THEME_FILE_PATH,
                    JSON.stringify(themes),
                    {
                        baseDir: RESOURCE_DIRECTORY,
                    },
                ).catch((err) => {
                    logErrorIO(THEME_FILE_PATH, err);
                    return null;
                });

                if (ok === null) {
                    return;
                }

                const newThemeButton = document.createElement("button");
                newThemeButton.id = newThemeButton.textContent = themeName;
                UI.themeMenu.insertBefore(
                    newThemeButton,
                    UI.themeMenu.lastElementChild,
                );
                break;
            }
            case UI.closeButton.id:
                UI.themeWindow.classList.add("hidden");
                break;
        }
    }

    async function handleMenuBarClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case UI.fileMenuButton.id:
                UI.fileMenu.toggleMultiple("hidden", "flex");
                UI.helpMenu.classList.replace("flex", "hidden");
                UI.languageMenu.classList.replace("flex", "hidden");

                UI.fileMenu.style.top = `${UI.fileMenuButton.offsetTop + UI.fileMenuButton.offsetHeight}px`;
                UI.fileMenu.style.left = `${UI.fileMenuButton.offsetLeft}px`;
                break;
            case "reload-button":
                if (await beforeClose(false)) {
                    location.reload();
                }
                break;
            case UI.helpMenuButton.id:
                UI.helpMenu.toggleMultiple("hidden", "flex");
                UI.fileMenu.classList.replace("flex", "hidden");
                UI.languageMenu.classList.replace("flex", "hidden");

                UI.helpMenu.style.top = `${UI.helpMenuButton.offsetTop + UI.helpMenuButton.offsetHeight}px`;
                UI.helpMenu.style.left = `${UI.helpMenuButton.offsetLeft}px`;
                break;
            case "help-button":
                // eslint-disable-next-line sonarjs/constructor-for-side-effects
                new WebviewWindow("help", {
                    url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                    title: localization.helpButton,
                    center: true,
                });
                break;
            case "about-button":
                // eslint-disable-next-line sonarjs/constructor-for-side-effects
                new WebviewWindow("about", {
                    url: "aboutwindow.html",
                    title: localization.aboutButton,
                    center: true,
                    resizable: false,
                });
                break;
            case UI.languageMenuButton.id:
                UI.languageMenu.toggleMultiple("hidden", "flex");
                UI.helpMenu.classList.replace("flex", "hidden");
                UI.fileMenu.classList.replace("flex", "hidden");

                UI.languageMenu.style.top = `${UI.languageMenuButton.offsetTop + UI.languageMenuButton.offsetHeight}px`;
                UI.languageMenu.style.left = `${UI.languageMenuButton.offsetLeft}px`;
                break;
            case "ru-button":
                if (settings.language !== Language.Russian) {
                    initializeLocalization(Language.Russian);
                    applyLocalization(localization, theme);
                }
                break;
            case "en-button":
                if (settings.language !== Language.English) {
                    initializeLocalization(Language.English);
                    applyLocalization(localization, theme);
                }
                break;
        }
    }

    async function handleSearchPanelClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case UI.searchSwitch.id: {
                UI.searchPanelContent.innerHTML = "";
                UI.pageSelectContainer.toggleMultiple("hidden", "flex");
                UI.logFileSelect.toggleMultiple("hidden");

                if (target.innerHTML.trim() === "search") {
                    target.innerHTML = "menu_book";

                    for (const file of Object.keys(replacementLog)) {
                        const fileOption = document.createElement("option");
                        fileOption.value = file;
                        UI.logFileSelect.appendChild(fileOption);
                    }
                } else {
                    target.innerHTML = "search";
                }

                break;
            }
            case "previous-page-button": {
                const page = Number(UI.searchCurrentPage.textContent);

                if (page > 0) {
                    await loadMatchObject(page - 1);
                }
                break;
            }
            case "next-page-button": {
                const page = Number(UI.searchCurrentPage.textContent);

                if (page < Number(UI.searchTotalPages.textContent)) {
                    await loadMatchObject(page + 1);
                }
                break;
            }
        }
    }

    async function handleSearchMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case "apply-search-button": {
                const predicate = UI.searchInput.value;

                if (predicate.trim()) {
                    await searchText(predicate, SearchAction.Search);
                }
                break;
            }
            case "replace-button":
            case "put-button": {
                const searchText = UI.searchInput.value;
                const replacerText = UI.replaceInput.value;

                if (searchText.trim()) {
                    await replacer.replaceAll(
                        searchText,
                        replacerText,
                        Number(UI.searchModeSelect.value),
                        target.id === "replace-button"
                            ? SearchAction.Replace
                            : SearchAction.Put,
                    );
                }
                break;
            }
            case "case-button":
                toggleCaseSensitive();
                break;
            case "whole-button":
                toggleWholeWordSearch();
                break;
            case "regex-button":
                toggleRegExpSearch();
                break;
            case "location-button":
                toggleLocalSearch();
                break;
        }
    }

    async function handleReadMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case UI.readModeSelect.id:
                switch (UI.readModeSelect.value) {
                    case "0":
                        UI.readModeDescription.innerHTML =
                            localization.appendModeDescription;
                        UI.duplicateModeSelect.value =
                            projectSettings.duplicateMode.toString();
                        UI.trimCheckbox.innerHTML = projectSettings.trim
                            ? "check"
                            : "";
                        UI.romanizeCheckbox.innerHTML = projectSettings.romanize
                            ? "check"
                            : "";
                        UI.disableCustomProcessingCheckbox.innerHTML =
                            projectSettings.disableCustomProcessing
                                ? "check"
                                : "";

                        UI.duplicateModeSelect.disabled = true;
                        break;
                    case "1":
                        UI.readModeDescription.innerHTML =
                            localization.forceModeDescription;

                        UI.duplicateModeSelect.disabled = false;
                        UI.duplicateModeSelect.value = "0";
                        UI.trimCheckbox.innerHTML = "";
                        UI.romanizeCheckbox.innerHTML = "";
                        UI.disableCustomProcessingCheckbox.innerHTML = "";
                        break;
                }
                break;
            case UI.applyReadButton.id: {
                const readMode = Number(UI.readModeSelect.value) as ReadMode;

                const duplicateMode = Number(UI.duplicateModeSelect.value);
                const romanize = Boolean(UI.romanizeCheckbox.textContent);
                const disableCustomProcessing = Boolean(
                    UI.disableCustomProcessingCheckbox.textContent,
                );
                const trim = Boolean(UI.trimCheckbox.textContent);

                if (readMode === ReadMode.Force) {
                    const metadata = {
                        disableCustomProcessing,
                        trim,
                        duplicateMode,
                        romanize,
                    };

                    Object.assign(projectSettings, metadata);

                    await writeTextFile(
                        join(settings.translationPath, ".rvpacker-metadata"),
                        JSON.stringify(metadata),
                    );
                } else {
                    await saver.saveAll();
                }

                const fileFlags = getFileFlags();
                UI.readButton.firstElementChild!.classList.add("animate-spin");

                await invokeRead({
                    projectPath: settings.projectPath,
                    sourcePath: settings.sourcePath,
                    translationPath: settings.translationPath,
                    engineType: settings.engineType,
                    readMode,
                    duplicateMode,
                    romanize,
                    disableCustomProcessing,
                    disableProcessing: fileFlags,
                    ignore: Boolean(UI.ignoreCheckbox.textContent),
                    trim,
                });

                if (await beforeClose(true)) {
                    location.reload();
                }
                break;
            }
        }
    }

    async function handlePurgeMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (target?.id !== UI.applyPurgeButton.id) {
            return;
        }

        await saver.saveAll();

        UI.purgeButton.firstElementChild!.classList.add("animate-spin");

        const fileFlags = getFileFlags();

        await invokePurge({
            sourcePath: settings.sourcePath,
            translationPath: settings.translationPath,
            engineType: settings.engineType,
            duplicateMode: projectSettings.duplicateMode,
            gameTitle: UI.currentGameTitle.getAttribute("source-title")!,
            romanize: projectSettings.romanize,
            disableCustomProcessing: projectSettings.disableCustomProcessing,
            disableProcessing: fileFlags,
            createIgnore: Boolean(UI.createIgnoreCheckbox.textContent),
            trim: projectSettings.trim,
        });

        UI.purgeButton.firstElementChild!.classList.remove("animate-spin");

        if (await beforeClose(true)) {
            location.reload();
        }
    }

    async function handleWriteMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id === UI.outputPathButton.id) {
            const directory = (await openPath({
                directory: true,
                multiple: false,
            }))!;

            if (directory) {
                UI.outputPathInput.value = directory;
            }
        }
    }

    async function handleDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (UI.tabContent.contains(target) && target.tagName === "DIV") {
            const rowContainer = target.parentElement;

            if (rowContainer && /\d$/.test(rowContainer.id)) {
                await writeToClipboard(target.textContent);
            }
        }

        if (target.id.includes("checkbox")) {
            if (UI.readModeSelect.value === "0") {
                switch (target.id) {
                    case UI.trimCheckbox.id:
                    case UI.romanizeCheckbox.id:
                    case UI.disableCustomProcessingCheckbox.id:
                        return;
                }
            }

            target.innerHTML = !target.textContent ? "check" : "";
        }

        if (target.classList.contains("dropdown-menu")) {
            for (const element of document.querySelectorAll(".dropdown-menu")) {
                element.classList.replace("flex", "hidden");
            }
        }
    }

    function showWriteMenu() {
        UI.writeMenu.toggleMultiple("hidden", "flex");

        if (UI.writeMenu.classList.contains("hidden")) {
            return;
        }

        requestAnimationFrame(() => {
            UI.writeMenu.style.left = `${UI.writeButton.offsetLeft}px`;
            UI.writeMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
        });

        UI.outputPathInput.value = settings.programDataPath;
        UI.disableMapProcessingCheckbox.innerHTML =
            UI.disableOtherProcessingCheckbox.innerHTML =
            UI.disableSystemProcessingCheckbox.innerHTML =
            UI.disablePluginProcessingCheckbox.innerHTML =
                "";
    }

    async function handleTopPanelClick(event: MouseEvent) {
        const target = (event.target as HTMLElement).closest(`[id$="button"]`);

        if (
            !target ||
            (!settings.projectPath && target.id !== "open-directory-button") ||
            !UI.topPanelButtonsDiv.contains(target)
        ) {
            return;
        }

        const button = event.button as MouseButton;

        switch (target.id) {
            case "menu-button":
                UI.leftPanel.toggleMultiple(
                    "translate-x-0",
                    "-translate-x-full",
                );
                break;
            case UI.saveButton.id:
                await saver.saveAll();
                break;
            case "write-button": {
                UI.disableMapProcessingCheckbox = UI.writeMenu.querySelector(
                    "#disable-map-processing-checkbox",
                )!;
                UI.disableOtherProcessingCheckbox = UI.writeMenu.querySelector(
                    "#disable-other-processing-checkbox",
                )!;
                UI.disableSystemProcessingCheckbox = UI.writeMenu.querySelector(
                    "#disable-system-processing-checkbox",
                )!;
                UI.disablePluginProcessingCheckbox = UI.writeMenu.querySelector(
                    "#disable-plugin-processing-checkbox",
                )!;

                if (button === MouseButton.Right) {
                    showWriteMenu();
                } else if (button === MouseButton.Left) {
                    if (UI.writeMenu.classList.contains("hidden")) {
                        await write();
                        return;
                    }

                    const fileFlags = getFileFlags();
                    await write(UI.outputPathInput.value, fileFlags);
                }
                break;
            }
            case "open-directory-button": {
                const directory =
                    (await openPath({
                        directory: true,
                        multiple: false,
                    })) ?? "";

                if (directory.empty()) {
                    return;
                }

                if (directory === settings.projectPath) {
                    await message(localization.directoryAlreadyOpened);
                    return;
                }

                await openProject(
                    directory,
                    settings.projectPath ? true : false,
                );
                break;
            }
            case "settings-button": {
                const settingsWindow = new WebviewWindow("settings", {
                    url: "settingswindow.html",
                    title: localization.settingsButtonTitle,
                    center: true,
                    resizable: false,
                });

                const settingsUnlisten = await settingsWindow.once<Settings>(
                    "get-settings",
                    async (data) => {
                        Object.assign(settings, data.payload);
                        backup();

                        await loadFont(settings.fontUrl);
                    },
                );

                await settingsWindow.once(
                    "tauri://destroyed",
                    settingsUnlisten,
                );
                break;
            }
            case UI.themeButton.id:
                UI.themeMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    UI.themeMenu.style.left = `${UI.themeButton.offsetLeft}px`;
                    UI.themeMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case UI.bookmarksButton.id:
                UI.bookmarksMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    UI.bookmarksMenu.style.left = `${UI.bookmarksButton.offsetLeft}px`;
                    UI.bookmarksMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case UI.readButton.id: {
                if (!projectSettings.sourceDirectory) {
                    alert(localization.gameFilesDoNotExist);
                    return;
                }

                UI.readMenu.toggleMultiple("hidden", "flex");

                if (UI.readMenu.classList.contains("hidden")) {
                    return;
                }

                UI.disableMapProcessingCheckbox = UI.readMenu.querySelector(
                    "#disable-map-processing-checkbox",
                )!;
                UI.disableOtherProcessingCheckbox = UI.readMenu.querySelector(
                    "#disable-other-processing-checkbox",
                )!;
                UI.disableSystemProcessingCheckbox = UI.readMenu.querySelector(
                    "#disable-system-processing-checkbox",
                )!;
                UI.disablePluginProcessingCheckbox = UI.readMenu.querySelector(
                    "#disable-plugin-processing-checkbox",
                )!;

                requestAnimationFrame(() => {
                    UI.readMenu.style.left = `${UI.readButton.offsetLeft}px`;
                    UI.readMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            }
            case UI.searchButton.id:
                if (!UI.searchMenu.classList.contains("hidden")) {
                    UI.searchMenu.classList.add("hidden");
                    return;
                }

                UI.searchMenu.classList.remove("hidden");
                requestAnimationFrame(() => {
                    UI.searchMenu.style.left = `${UI.searchButton.offsetLeft}px`;
                    UI.searchMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case UI.toolsButton.id:
                UI.toolsMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    UI.toolsMenu.style.left = `${UI.toolsButton.offsetLeft}px`;
                    UI.toolsMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            case UI.purgeButton.id: {
                if (!projectSettings.sourceDirectory) {
                    alert(localization.gameFilesDoNotExist);
                    return;
                }

                UI.purgeMenu.toggleMultiple("hidden", "flex");

                if (UI.purgeMenu.classList.contains("hidden")) {
                    return;
                }

                UI.disableMapProcessingCheckbox = UI.purgeMenu.querySelector(
                    "#disable-map-processing-checkbox",
                )!;
                UI.disableOtherProcessingCheckbox = UI.purgeMenu.querySelector(
                    "#disable-other-processing-checkbox",
                )!;
                UI.disableSystemProcessingCheckbox = UI.purgeMenu.querySelector(
                    "#disable-system-processing-checkbox",
                )!;
                UI.disablePluginProcessingCheckbox = UI.purgeMenu.querySelector(
                    "#disable-plugin-processing-checkbox",
                )!;

                requestAnimationFrame(() => {
                    UI.purgeMenu.style.left = `${UI.purgeButton.offsetLeft}px`;
                    UI.purgeMenu.style.top = `${UI.menuBar.clientHeight + UI.topPanel.clientHeight}px`;
                });
                break;
            }
        }
    }

    await attachConsole();

    const settings: Settings = await loadSettings();
    const localization = new MainWindowLocalization(settings.language);

    const themes = JSON.parse(
        await readTextFile(THEME_FILE_PATH, { baseDir: RESOURCE_DIRECTORY }),
    ) as ThemeObject;
    let theme: Theme = themes[settings.theme];

    await checkForUpdates();
    applyLocalization(localization, theme);

    const STYLE_SHEET = getThemeStyleSheet()!;
    const UI = setupUi(WindowType.Main) as MainWindowUI;

    let backupIsActive: number | null = null;

    let currentTheme: string;
    setTheme(theme);

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
    };

    const batchWindow = new BatchWindow(settings, tabInfo, UI);
    let lastCharacters = "";
    let lastSubstitutionCharacter: { char: string; pos: number } | null = null;
    let textareaStatus!: TextAreaStatus;

    let projectSettings!: ProjectSettings;

    const bookmarks: Bookmark[] = [];

    let currentFocusedElement: [string, string] | [] = [];

    let changeTimer = -1;
    let shift = false;
    let ctrl = false;

    let multipleTextAreasSelected = false;

    const replacementLog: ReplacementLog = await loadReplacementLog();

    const activeGhostLines: HTMLDivElement[] = [];

    const selectedTextareas = new Map<number, string>();
    const replacedTextareas = new Map<number, string>();

    const searchFlags: SearchFlagsObject = { flags: SearchFlags.None };
    const searcher = new Searcher(settings, searchFlags, tabInfo);
    const replacer = new Replacer(
        settings,
        replacementLog,
        searchFlags,
        tabInfo,
        searcher,
    );
    const saver = new Saver(
        settings,
        tabInfo,
        UI.currentGameTitle,
        UI.saveButton.firstElementChild!,
    );

    let clipboardText = "";

    await APP_WINDOW.setZoom(settings.zoom);

    await openProject(settings.projectPath, false);
    await loadFont(settings.fontUrl);

    UI.topPanelButtonsDiv.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    UI.topPanelButtonsDiv.addEventListener("mousedown", handleTopPanelClick);
    UI.tabContent.addEventListener("paste", handleTabContentPaste);
    UI.tabContent.addEventListener("keyup", handleTabContentKeyup);
    UI.tabContent.addEventListener("input", handleTabContentInput);
    UI.searchPanelContent.addEventListener("mousedown", handleResultClick);
    UI.goToRowInput.addEventListener("keydown", handleGotoRowInputKeypress);
    UI.searchMenu.addEventListener("change", handleSearchMenuChange);
    UI.searchMenu.addEventListener("keydown", handleSearchMenuKeydown);
    UI.themeWindow.addEventListener("input", handleThemeWindowInput);
    UI.toolsMenu.addEventListener("click", handleToolsMenuClick);
    UI.themeMenu.addEventListener("click", handleThemeMenuClick);
    UI.bookmarksMenu.addEventListener("click", handleBookmarksMenuClick);
    UI.leftPanel.addEventListener("click", handleLeftPanelClick);
    UI.themeWindow.addEventListener("click", handleThemeWindowClick);
    UI.menuBar.addEventListener("click", handleMenuBarClick);
    UI.searchPanel.addEventListener("click", handleSearchPanelClick);
    UI.searchMenu.addEventListener("click", handleSearchMenuClick);
    UI.readMenu.addEventListener("click", handleReadMenuClick);
    UI.purgeMenu.addEventListener("click", handlePurgeMenuClick);
    UI.writeMenu.addEventListener("click", handleWriteMenuClick);
    UI.tabContent.addEventListener("keydown", handleTabContentKeydown, true);
    document.body.addEventListener("keydown", handleKeypress);
    document.body.addEventListener("keyup", (event) => {
        if (event.key === "Shift") {
            shift = false;
        }

        if (event.key === "Control") {
            ctrl = false;
        }
    });

    UI.tabContent.addEventListener("focus", handleFocus, true);
    UI.tabContent.addEventListener("blur", handleBlur, true);
    UI.tabContent.addEventListener("mousedown", handleTabContentMousedown);
    UI.tabContent.addEventListener("copy", handleTabContentCopy);
    UI.tabContent.addEventListener("cut", handleTabContentCut);
    document.addEventListener("click", handleDocumentClick);

    await listen("fetch-settings", async () => {
        await emit("settings", [settings, theme, projectSettings]);
    });

    await listen<string | null>("change-tab", async (event) => {
        await changeTab(event.payload);
    });

    await listen<boolean>("saved", (event) => {
        saver.saved = event.payload;
    });

    await listen<number>("update-progress", (event) => {
        updateTabProgress(event.payload);
    });

    await APP_WINDOW.onCloseRequested(async (event) => {
        if (await beforeClose(false)) {
            await exit();
        } else {
            event.preventDefault();
        }
    });
});
