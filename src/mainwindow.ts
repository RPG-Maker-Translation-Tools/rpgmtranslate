import {
    BatchAction,
    JumpDirection,
    Language,
    MapsProcessingMode,
    MouseButton,
    ProcessingMode,
    ReplaceMode,
    RowDeleteMode,
    SaveMode,
    SearchFlags,
} from "./types/enums";
import {
    BOOKMARK_COMMENT_PREFIX,
    CHARACTER_SUBSTITUTIONS,
    COMMENT_PREFIX,
    COMMENT_SUFFIX_LENGTH,
    ENGINE_NAMES,
    INTERRUPTING_KEYS,
    JSON_EXTENSION,
    LINES_SEPARATOR,
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
    SETTINGS_PATH,
    TEMP_MAPS_DIRECTORY,
    THEME_FILE_PATH,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
    ZOOM_STEP,
} from "./utilities/constants";
import {
    animateProgressText,
    applyLocalization,
    applyTheme,
    createRegExp,
    escapeHTML,
    getThemeStyleSheet,
    join,
    setupUi,
    sleep,
    tw,
} from "./utilities/functions";
import "./utilities/htmlelement-extensions";
import {
    invokeAddToScope,
    invokeCompile,
    invokeConvertToLF,
    invokeExtractArchive,
    invokePurge,
    invokeRead,
    invokeReadLastLine,
    invokeTranslateText,
} from "./utilities/invokes";
import { MainWindowLocalization } from "./utilities/localization";
import "./utilities/string-extensions";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import {
    getCurrentWebviewWindow,
    WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
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
import { attachConsole } from "@tauri-apps/plugin-log";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { check as checkVersion } from "@tauri-apps/plugin-updater";
import { BatchWindow } from "./types/batchwindow";
import { ProjectSettings } from "./types/projectsettings";
import { Replacer } from "./types/replacer";
import { Saver } from "./types/saver";
import { Searcher } from "./types/searcher";
import { Settings } from "./types/settings";
const APP_WINDOW = getCurrentWebviewWindow();

document.addEventListener("DOMContentLoaded", async () => {
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

                const original = Object.entries(CHARACTER_SUBSTITUTIONS).find(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ([_, subChar]) =>
                        subChar === lastSubstitutionCharacter!.char,
                )?.[0];

                if (original) {
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

            const match = Object.keys(CHARACTER_SUBSTITUTIONS).find(
                (sequence) => lastCharacters.endsWith(sequence),
            );

            if (match) {
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
        const [file, type, row] = metadata.split("-");
        const isTranslation = type.startsWith("t");
        let rowNumber = Number(row);

        // External files are 0-indexed
        if (file !== currentTab.name) {
            rowNumber += 1;
        }

        const reverseType = isTranslation ? "original" : "translation";

        const resultContainer = document.createElement("div");
        resultContainer.className = tw`textSecond borderPrimary backgroundSecond my-1 cursor-pointer border-2 p-1 text-base`;

        const rowContainer =
            file !== currentTab.name
                ? null
                : (ui.tabContent.children[rowNumber - 1] as HTMLDivElement);
        const counterpartElement = rowContainer?.children[
            isTranslation ? 1 : 2
        ] as HTMLElement | null;

        const resultDiv = document.createElement("div");
        resultDiv.innerHTML = result;
        resultContainer.appendChild(resultDiv);

        const originalInfo = document.createElement("div");
        originalInfo.className = tw`textThird text-xs`;

        originalInfo.innerHTML = `${file} - ${type} - ${rowNumber}`;
        resultContainer.appendChild(originalInfo);

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

        counterpartInfo.innerHTML = `${file} - ${reverseType} - ${rowNumber}`;
        resultContainer.appendChild(counterpartInfo);

        resultContainer.setAttribute("data", `${file}-${type}-${rowNumber}`);
        return resultContainer;
    }

    async function loadMatchObject(matchIndex: number) {
        ui.searchCurrentPage.textContent = matchIndex.toString();
        ui.searchPanelFound.innerHTML = "";

        const matchFile = join(
            settings.programDataPath,
            `matches-${matchIndex}${JSON_EXTENSION}`,
        );

        const matchObject = JSON.parse(
            await readTextFile(matchFile),
        ) as MatchObject;

        for (const [id, matches] of Object.entries(matchObject)) {
            ui.searchPanelFound.appendChild(
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
            const dataDirEntries = await readDir(settings.programDataPath);

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
            );

            projectSettings.translationLanguages = {
                from: ui.fromLanguageInput.value,
                to: ui.toLanguageInput.value,
            };

            await writeTextFile(
                settings.projectSettingsPath,
                JSON.stringify(projectSettings),
            );
        }

        await writeTextFile(SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: RESOURCE_DIRECTORY,
        });

        return true;
    }

    async function fetchReplacementLog(): Promise<ReplacementLog> {
        const replaced: ReplacementLog = {};

        if (settings.projectPath && (await exists(settings.logPath))) {
            Object.assign(
                replaced,
                JSON.parse(
                    await readTextFile(settings.logPath),
                ) as ReplacementLog,
            );
        }

        return replaced;
    }

    function updateProgressMeter() {
        const total = totalRows;
        const translated = translatedRowsArray.reduce((a, b) => a + b, 0);

        ui.globalProgressMeter.style.width = `${Math.round((translated / total) * PERCENT_MULTIPLIER)}%`;
        ui.globalProgressMeter.innerHTML = `${translated} / ${total}`;
    }

    function addBookmark(bookmark: Bookmark) {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = tw`backgroundPrimary backgroundSecondHovered flex h-auto flex-row items-center justify-center p-1`;
        bookmarkElement.innerHTML = `${bookmark.title}<br>${bookmark.description}`;

        bookmarks.push(bookmark);
        ui.bookmarksMenu.appendChild(bookmarkElement);
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

        await invokeAddToScope({ path: SETTINGS_PATH });
        await writeTextFile(SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: RESOURCE_DIRECTORY,
        });

        return settings;
    }

    function initializeLocalization(language: Language) {
        settings.language = language;
        Object.assign(localization, new MainWindowLocalization(language));
    }

    async function handleReplacedClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const element = target.closest("[reverted]")!;

        if (
            element.getAttribute("reverted") === "1" ||
            !ui.searchPanelReplaced.contains(element)
        ) {
            return;
        }

        const rowContainerId = element.firstElementChild!.textContent!;
        const [file, row] = rowContainerId.split("-");
        const rowNumber = Number(row) - 1;

        const button = event.button as MouseButton;

        if (button === MouseButton.Left) {
            await changeTab(file);

            ui.tabContent.children[rowNumber].scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else if (button === MouseButton.Right) {
            if (currentTab.name === file) {
                const textarea = ui.tabContent.children[rowNumber]
                    .lastElementChild! as HTMLTextAreaElement;
                textarea.value = element.children[1].textContent!;
            } else {
                const filePath = join(
                    settings.programDataPath,
                    file.startsWith("maps")
                        ? TEMP_MAPS_DIRECTORY
                        : TRANSLATION_DIRECTORY,
                    `${file}${TXT_EXTENSION}`,
                );

                const fileLines = (await readTextFile(filePath)).split("\n");

                const neededLineSplit =
                    fileLines[rowNumber].split(LINES_SEPARATOR);
                neededLineSplit[1] =
                    element.children[1].textContent!.replaceAll("\n", NEW_LINE);

                fileLines[rowNumber] = neededLineSplit.join(LINES_SEPARATOR);

                await writeTextFile(filePath, fileLines.join("\n"));
            }

            element.innerHTML = `<div class="textThird">${element.firstElementChild!.textContent!}</div>${localization.textReverted}<div>${element.children[1].textContent!}</div>`;
            element.setAttribute("reverted", "1");
            delete replacementLog[rowContainerId];
        }
    }

    function showSearchPanel() {
        ui.searchPanel.classList.replace("translate-x-full", "translate-x-0");
    }

    function toggleSearchPanel() {
        ui.searchPanel.toggleMultiple("translate-x-0", "translate-x-full");
    }

    async function replaceOrPut(
        replacerText: string,
        file: string,
        rowNumber: number,
        replaceMode: ReplaceMode,
    ): Promise<string | undefined> {
        let newText = "";

        if (file === currentTab.name) {
            const textarea = ui.tabContent.children[rowNumber]
                .lastElementChild! as HTMLTextAreaElement;

            newText = (await replacer.replaceTextHTML(
                textarea,
                replacerText,
                replaceMode,
            ))!;
        } else {
            const regexp = await createRegExp(
                ui.searchInput.value,
                searchFlags,
            );

            if (!regexp) {
                return;
            }

            const normalizedFilename = `${file}${TXT_EXTENSION}`;
            const pathToFile = join(
                settings.programDataPath,
                normalizedFilename.startsWith("maps")
                    ? TEMP_MAPS_DIRECTORY
                    : TRANSLATION_DIRECTORY,
                normalizedFilename,
            );

            const content = (await readTextFile(pathToFile)).split("\n");

            const requiredLine = content[rowNumber];

            const [original, translation] = requiredLine.split(LINES_SEPARATOR);

            if (replaceMode === ReplaceMode.Put) {
                const replacerTextNormalized = replacerText.replaceAll(
                    "\n",
                    NEW_LINE,
                );
                content[rowNumber] =
                    `${original}${LINES_SEPARATOR}${replacerTextNormalized}`;

                newText = `<span class="bg-red-600">${replacerText}</span>`;
            } else {
                const translationNormalized = translation
                    .replaceAll(NEW_LINE, "\n")
                    .trim();

                const translationReplaced = translationNormalized
                    .split(regexp)
                    .flatMap((part, i, arr) => [
                        part,
                        i < arr.length - 1
                            ? `<span class="bg-red-600">${replacerText}</span>`
                            : "",
                    ])
                    .join("");

                const translationReplacedNormalized =
                    translationReplaced.replaceAll(/<span(.*?)>|<\/span>/g, "");

                replacementLog[`${file}-${rowNumber}`] = {
                    old: translationNormalized,
                    new: translationReplacedNormalized,
                };

                content[rowNumber] =
                    `${original}${LINES_SEPARATOR}${translationReplacedNormalized.replaceAll("\n", NEW_LINE)}`;

                newText = translationReplaced;
            }

            await writeTextFile(pathToFile, content.join("\n"));
        }

        return newText;
    }

    async function handleResultClick(event: MouseEvent) {
        const target = event.target as HTMLDivElement;
        const resultElement = target.closest("[data]")!;

        if (!ui.searchPanelFound.contains(resultElement)) {
            return;
        }

        const button = event.button as MouseButton;

        const elementId = resultElement.getAttribute("data")!;
        const [file, type, row] = elementId.split("-");
        const isTranslation = type.startsWith("t");
        const rowNumber = Number(row) - 1;

        let replaceMode: ReplaceMode | null = null;

        switch (button) {
            case MouseButton.Left:
                replaceMode = ReplaceMode.Search;
                break;
            case MouseButton.Center:
                replaceMode = ReplaceMode.Put;
                break;
            case MouseButton.Right:
                replaceMode = ReplaceMode.Replace;
                break;
        }

        if (replaceMode === null) {
            return;
        }

        if (replaceMode === ReplaceMode.Search) {
            await changeTab(file);

            ui.tabContent.children[rowNumber].scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else {
            if (!isTranslation) {
                alert(localization.originalTextIrreplacable);
                return;
            }

            const replacerText = ui.replaceInput.value;

            if (!replacerText.trim()) {
                return;
            }

            const newText = await replaceOrPut(
                replacerText,
                file,
                rowNumber,
                replaceMode,
            );

            if (!newText) {
                return;
            }

            saved = false;

            if (replaceMode === ReplaceMode.Put) {
                resultElement.firstElementChild!.children[0].innerHTML =
                    newText;
            } else {
                resultElement.children[3].innerHTML = newText;
            }
        }
    }

    async function save(mode: SaveMode) {
        if (mode !== SaveMode.Backup && saver.saving) {
            return;
        }

        if (mode !== SaveMode.SingleFile) {
            ui.saveButton.firstElementChild!.classList.add("animate-spin");
        }

        if (await saver.save(mode)) {
            saved = true;
        }

        ui.saveButton.firstElementChild!.classList.remove("animate-spin");
    }

    function backup() {
        if (!settings.backup.enabled || backupIsActive) {
            return;
        }

        backupIsActive = setInterval(async () => {
            if (settings.backup.enabled) {
                await save(SaveMode.Backup);
            } else {
                clearInterval(backupIsActive!);
            }
        }, settings.backup.period * SECOND_MS);
    }

    function calculateRows(
        forCurrentTab: boolean,
        rows?: string[],
    ): [number, number, number] {
        let totalRows: number;
        let translatedRows = 0;

        if (forCurrentTab) {
            totalRows = ui.tabContent.children.length;

            if (totalRows === 0) {
                return [0, 0, 0];
            }

            for (const rowContainer of ui.tabContent.children) {
                const originalTextDiv = rowContainer
                    .children[1] as HTMLDivElement;
                const translationTextArea = rowContainer
                    .children[2] as HTMLTextAreaElement;

                if (originalTextDiv.textContent!.startsWith(COMMENT_PREFIX)) {
                    totalRows--;
                } else if (translationTextArea.value) {
                    translatedRows++;
                }
            }
        } else {
            totalRows = rows!.length;

            if (totalRows === 0) {
                return [0, 0, 0];
            }

            for (const line of rows!) {
                if (line.startsWith(COMMENT_PREFIX)) {
                    totalRows--;
                } else if (!line.endsWith(LINES_SEPARATOR)) {
                    translatedRows++;
                }
            }
        }

        const percentage = Math.floor(
            (translatedRows / totalRows) * PERCENT_MULTIPLIER,
        );

        return [totalRows, translatedRows, percentage];
    }

    function updateProgress(
        progressBar: HTMLSpanElement | null,
        translatedRows: number,
        percentage: number,
    ) {
        if (progressBar) {
            translatedRowsArray[currentTab.index!] = translatedRows;
            updateProgressMeter();

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
        if ((currentTab.name && currentTab.name === filename) || changeTimer) {
            return;
        }

        await awaitSave();

        if (currentTab.name) {
            await save(SaveMode.SingleFile);
            const calculated = calculateRows(true);
            const translatedRows = calculated[1];
            const percentage = calculated[2];

            const selectedTab = ui.leftPanel.children[currentTab.index!];

            const progressBar = selectedTab.lastElementChild
                ?.firstElementChild as HTMLSpanElement | null;

            updateProgress(progressBar, translatedRows, percentage);

            selectedTab.classList.replace(
                "backgroundThird",
                "backgroundPrimary",
            );
        }

        ui.tabContent.innerHTML = "";

        if (filename) {
            ui.currentTabDiv.innerHTML = currentTab.name = filename;

            if (!newTabIndex) {
                let i = 0;

                for (const element of ui.leftPanel.children) {
                    if (element.firstElementChild!.textContent === filename) {
                        newTabIndex = i;
                        break;
                    }

                    i++;
                }
            }

            currentTab.index = newTabIndex!;

            const selectedTab = ui.leftPanel.children[currentTab.index];
            selectedTab.classList.replace(
                "backgroundPrimary",
                "backgroundThird",
            );

            await createTabContent(filename);
        } else {
            currentTab.name = null;
            ui.currentTabDiv.innerHTML = "";
        }

        changeTimer = setTimeout(() => {
            changeTimer = null;
            // eslint-disable-next-line no-magic-numbers
        }, SECOND_MS / 10);

        selectedTextareas.clear();
        replacedTextareas.clear();
    }

    function handleGotoRowInputKeypress(event: KeyboardEvent) {
        if (event.code === "Enter") {
            const targetRow = document.getElementById(
                `${currentTab.name!}-${ui.goToRowInput.value}`,
            ) as HTMLDivElement | null;

            if (targetRow) {
                targetRow.scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }

            ui.goToRowInput.value = "";
            ui.goToRowInput.classList.add("hidden");
        } else if (event.code === "Escape") {
            ui.goToRowInput.value = "";
            ui.goToRowInput.classList.add("hidden");
        }
    }

    function areLanguageTagsValid(): boolean {
        const from = ui.fromLanguageInput.value.trim();
        const to = ui.toLanguageInput.value.trim();

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
                    const rowContainer = ui.tabContent.children[
                        rowNumber
                    ] as HTMLDivElement;
                    const translationTextArea =
                        rowContainer.lastElementChild! as HTMLTextAreaElement;
                    translationTextArea.value = value;
                }

                for (const [rowNumber, value] of replacedTextareas.entries()) {
                    const rowContainer = ui.tabContent.children[
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
                await save(SaveMode.AllFiles);
                break;
            case "KeyG":
                event.preventDefault();

                if (currentTab.name) {
                    if (ui.goToRowInput.classList.contains("hidden")) {
                        ui.goToRowInput.classList.remove("hidden");
                        ui.goToRowInput.focus();

                        const lastRow =
                            ui.tabContent.lastElementChild!.id.split("-")[1];
                        ui.goToRowInput.placeholder = `${localization.goToRow} ${lastRow}`;
                    } else {
                        ui.goToRowInput.classList.add("hidden");
                    }
                }
                break;
            case "KeyF":
                event.preventDefault();

                ui.searchMenu.classList.replace("hidden", "flex");
                ui.searchInput.focus();
                break;
            case "KeyB":
                ui.bookmarksMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    ui.bookmarksMenu.style.left = `${ui.bookmarksButton.offsetLeft}px`;
                    ui.bookmarksMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
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
            !ui.tabContent.contains(focusedElement) &&
            focusedElement.tagName !== "TEXTAREA"
        ) {
            return;
        }

        const [file, row] = focusedElement
            .closest(`[id^="${currentTab.name}"]`)!
            .id.split("-");
        const rowNumber = Number(row);

        if (
            Number.isNaN(rowNumber) ||
            (rowNumber === 1 && direction === JumpDirection.Previous) ||
            (rowNumber === ui.tabContent.children.length &&
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
            await handleCtrlKeypress(event);
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    await startCompilation();
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
                    ui.leftPanel.toggleMultiple(
                        "translate-x-0",
                        "-translate-x-full",
                    );
                    break;
                case "KeyR":
                    toggleSearchPanel();
                    break;
                case "ArrowDown":
                    if (currentTab.index !== null) {
                        const newStateIndex =
                            (currentTab.index + 1) %
                            ui.leftPanel.children.length;

                        await changeTab(
                            ui.leftPanel.children[newStateIndex]
                                .firstElementChild!.textContent,
                            newStateIndex,
                        );
                    }
                    break;
                case "ArrowUp":
                    if (currentTab.index !== null) {
                        const newStateIndex =
                            (currentTab.index -
                                1 +
                                ui.leftPanel.children.length) %
                            ui.leftPanel.children.length;
                        await changeTab(
                            ui.leftPanel.children[newStateIndex]
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

                    const originalTextDiv = selectedTextArea.parentElement!
                        .children[1] as HTMLDivElement;
                    let originalText = originalTextDiv.textContent!;

                    if (
                        originalText.startsWith(MAP_DISPLAY_NAME_COMMENT_PREFIX)
                    ) {
                        originalText = originalText.slice(
                            MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                            -COMMENT_SUFFIX_LENGTH,
                        );
                    }

                    const translation = await invokeTranslateText({
                        text: originalText,
                        to: ui.toLanguageInput.value.trim(),
                        from: ui.fromLanguageInput.value.trim(),
                        replace: false,
                    });

                    selectedTextArea.placeholder = translation;
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
            shiftPressed = true;
        }
    }

    function toggleCaseSensitive() {
        const toggled = ui.searchCaseButton.classList.toggle("backgroundThird");

        if (toggled) {
            searchFlags.flags |= SearchFlags.CaseSensitive;
        } else {
            searchFlags.flags &= ~SearchFlags.CaseSensitive;
        }
    }

    function toggleWholeWordSearch() {
        const toggled =
            ui.searchWholeButton.classList.toggle("backgroundThird");

        if (toggled) {
            searchFlags.flags |= SearchFlags.WholeWord;
        } else {
            searchFlags.flags &= ~SearchFlags.WholeWord;
        }
    }

    function toggleRegExpSearch() {
        const toggled =
            ui.searchRegexButton.classList.toggle("backgroundThird");

        if (toggled) {
            searchFlags.flags |= SearchFlags.RegExp;
        } else {
            searchFlags.flags &= ~SearchFlags.RegExp;
        }
    }

    function toggleLocalSearch() {
        const toggled =
            ui.searchLocationButton.classList.toggle("backgroundThird");

        if (toggled) {
            searchFlags.flags |= SearchFlags.OnlyLocal;
        } else {
            searchFlags.flags &= ~SearchFlags.OnlyLocal;
        }
    }

    async function searchText(predicate: string, replaceMode: ReplaceMode) {
        const matchPageCount = (
            await searcher.search(
                predicate,
                Number(ui.searchModeSelect.value),
                replaceMode,
            )
        )[1];

        ui.searchTotalPages.innerHTML = matchPageCount.toString();
        ui.searchCurrentPage.innerHTML = "0";

        if (replaceMode === ReplaceMode.Search) {
            if (matchPageCount === -1) {
                ui.searchPanelFound.innerHTML = `<div id="no-results" class="content-center h-full">${localization.noMatches}</div>`;
            } else {
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
                ui.searchInput.value += "\n";
                return;
            }

            const predicate = ui.searchInput.value;

            if (predicate.trim()) {
                await searchText(predicate, ReplaceMode.Search);
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
            ui.searchInput.calculateHeight();
        });
    }

    function handleReplaceInputKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                ui.replaceInput.value += "\n";
                ui.replaceInput.calculateHeight();
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                ui.replaceInput.calculateHeight();
            });
        }
    }

    function createRow(
        original: string,
        translation: string[],
        tabName: string,
        i: number,
    ) {
        const textParent = document.createElement("div");
        textParent.id = `${tabName}-${i}`;
        textParent.className = tw`flex w-full flex-row justify-around py-[1px]`;

        const originalTextDiv = document.createElement("div");
        originalTextDiv.className = tw`outlinePrimary backgroundPrimary font inline-block w-full cursor-pointer p-1 whitespace-pre-wrap outline outline-2`;

        if (settings.fontUrl) {
            originalTextDiv.style.fontFamily = "font";
        }

        originalTextDiv.textContent = original;

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
        rowNumberSpan.textContent = i.toString();

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

        originalTextDiv.classList.add("text-lg");
        document.body.appendChild(originalTextDiv);

        const { lineHeight, paddingTop } =
            window.getComputedStyle(originalTextDiv);
        const minHeight =
            (originalTextDiv.innerHTML.count("\n") + 1) *
                Number.parseInt(lineHeight) +
            Number.parseInt(paddingTop) * 2;

        document.body.removeChild(originalTextDiv);
        originalTextDiv.classList.remove("text-lg");

        textParent.style.minHeight =
            rowNumberContainer.style.minHeight =
            originalTextDiv.style.minHeight =
            translationTextArea.style.minHeight =
            textParent.style.minHeight =
                `${minHeight}px`;

        textParent.appendChild(rowNumberContainer);
        textParent.appendChild(originalTextDiv);
        textParent.appendChild(translationTextArea);

        return textParent;
    }

    async function createTabContent(state: string) {
        const contentName = state.toString();
        const formattedFilename = `${contentName}${TXT_EXTENSION}`;

        let pathToContent = join(settings.translationPath, formattedFilename);

        if (
            contentName.startsWith("plugins") &&
            !(await exists(pathToContent))
        ) {
            if (await exists(join(settings.translationPath, "scripts.txt"))) {
                pathToContent = join(
                    settings.translationPath,
                    formattedFilename,
                );
            }
        } else if (contentName.startsWith("maps")) {
            pathToContent = join(settings.tempMapsPath, formattedFilename);
        }

        const content = (await readTextFile(pathToContent)).split("\n");

        if (contentName === "system") {
            content.pop();
        }

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < content.length; i++) {
            if (content[i].trim() === "") {
                continue;
            }

            const [originalText, translationText] =
                content[i].split(LINES_SEPARATOR);
            const added = i + 1;

            const originalTextSplit = originalText.replaceAll(NEW_LINE, "\n");
            const translationTextSplit = translationText.split(NEW_LINE);

            const row = createRow(
                originalTextSplit,
                translationTextSplit,
                contentName,
                added,
            );

            fragment.appendChild(row);
        }

        ui.tabContent.appendChild(fragment);
    }

    async function startCompilation(
        path?: string,
        disableProcessing?: boolean[],
    ) {
        if (!settings.projectPath || !projectSettings.originalDirectory) {
            if (!projectSettings.originalDirectory) {
                alert(localization.gameFilesDoNotExist);
            }
            return;
        }

        ui.compileMenu.classList.replace("flex", "hidden");
        ui.compileButton.firstElementChild!.classList.add("animate-spin");

        const executionTime = await invokeCompile(
            settings.projectPath,
            projectSettings.originalDirectory,
            path ?? settings.projectPath,
            ui.currentGameTitle.value,
            projectSettings.mapsProcessingMode,
            projectSettings.romanize,
            projectSettings.disableCustomProcessing,
            disableProcessing ?? [false, false, false, false],
            settings.engineType,
            projectSettings.trim,
        );

        ui.compileButton.firstElementChild!.classList.remove("animate-spin");
        alert(`${localization.compileSuccess} ${executionTime}`);
    }

    function getNewLinePositions(
        textarea: HTMLTextAreaElement,
    ): { left: number; top: number }[] {
        const positions: { left: number; top: number }[] = [];
        const lines = textarea.value.split("\n");

        if (
            !textAreaPropertiesMemo.lineHeight ||
            !textAreaPropertiesMemo.padding ||
            !textAreaPropertiesMemo.fontSize ||
            !textAreaPropertiesMemo.fontFamily
        ) {
            const computedStyles = window.getComputedStyle(textarea);
            textAreaPropertiesMemo.lineHeight = Number.parseInt(
                computedStyles.lineHeight,
            );
            textAreaPropertiesMemo.padding = Number.parseInt(
                computedStyles.paddingTop,
            );
            textAreaPropertiesMemo.fontSize = computedStyles.fontSize;
            textAreaPropertiesMemo.fontFamily = computedStyles.fontFamily;
        }

        const { lineHeight, fontSize, fontFamily } = textAreaPropertiesMemo;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize} ${fontFamily}`;

        let top = textarea.offsetTop;

        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            const textWidth = context.measureText(`${line} `).width;
            const left = textarea.offsetLeft + textWidth;

            positions.push({ left, top });
            top += lineHeight;
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
        const lineBreaks = target.value.split("\n").length;

        if (textAreaPropertiesMemo.lineBreaks === lineBreaks) {
            return;
        }

        textAreaPropertiesMemo.lineBreaks = lineBreaks;

        if (
            !textAreaPropertiesMemo.lineHeight ||
            !textAreaPropertiesMemo.padding
        ) {
            const computedStyles = window.getComputedStyle(target);
            textAreaPropertiesMemo.lineHeight = Number.parseInt(
                computedStyles.lineHeight,
            );
            textAreaPropertiesMemo.padding = Number.parseInt(
                computedStyles.paddingTop,
            );
        }

        const { lineHeight, padding } = textAreaPropertiesMemo;
        const newHeight = lineBreaks * lineHeight + padding * 2;

        const parent = target.parentElement;

        if (parent) {
            for (const child of parent.children) {
                (child as HTMLElement).style.height = `${newHeight}px`;
            }
        }
    }

    function handleFocus(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;

        if (
            ui.tabContent.contains(target) &&
            target.tagName === "TEXTAREA" &&
            target.id !== currentFocusedElement[0]
        ) {
            currentFocusedElement = [target.id, target.value];
        }
    }

    function handleBlur(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;
        target.placeholder = "";

        for (const ghost of activeGhostLines) {
            ghost.remove();
        }

        if (target.id == currentFocusedElement[0]) {
            if (saved && currentFocusedElement[1] !== target.value) {
                saved = false;
            }

            currentFocusedElement.length = 0;
        }
    }

    async function loadFont(fontUrl: string) {
        if (!fontUrl) {
            textAreaPropertiesMemo.fontFamily = document.body.style.fontFamily;

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            for (const element of document.querySelectorAll(
                ".font",
            ) as NodeListOf<HTMLElement>) {
                element.style.fontFamily = "";
            }
            return;
        }

        await invokeAddToScope({ path: fontUrl });

        const font = await new FontFace(
            "font",
            `url(${convertFileSrc(fontUrl)})`,
        ).load();
        document.fonts.add(font);

        textAreaPropertiesMemo.fontFamily = "font";

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        for (const element of document.querySelectorAll(
            ".font",
        ) as NodeListOf<HTMLElement>) {
            element.style.fontFamily = "font";
        }
    }

    async function exitConfirmation(): Promise<boolean> {
        if (saved) {
            return true;
        }

        const askExitUnsaved: boolean = await ask(localization.unsavedChanges);

        if (!askExitUnsaved) {
            const exitRequested = await ask(localization.exit);
            return exitRequested;
        }

        await save(SaveMode.AllFiles);
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

        applyTheme(sheet, theme);
        settings.theme = newTheme.name;
    }

    function createTab(
        name: string,
        rows: string[],
        tabIndex: number,
    ): HTMLButtonElement | undefined {
        if (name === "system") {
            // Remove the game title row
            rows = rows.slice(0, -1);
        }

        const [total, translated, percentage] = calculateRows(false, rows);

        if (total === 0) {
            return;
        }

        totalRows += total;
        translatedRowsArray.push(translated);

        const buttonElement = document.createElement("button");
        buttonElement.className = tw`backgroundPrimary backgroundPrimaryHovered flex h-8 w-full cursor-pointer flex-row justify-center p-1`;
        buttonElement.id = (tabIndex - 1).toString();

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
        checkboxLabel.innerHTML = buttonElement.firstElementChild!.textContent!;

        checkboxDiv.append(checkbox, checkboxLabel);
        batchWindow.addCheckbox(checkboxDiv);

        return buttonElement;
    }

    async function extractArchive(projectPath: string): Promise<boolean> {
        let extracted = false;

        for (const archive of ["Game.rgssad", "Game.rgss2a", "Game.rgss3a"]) {
            const archivePath = join(projectPath, archive);

            if (await exists(archivePath)) {
                await invokeExtractArchive({
                    inputPath: archivePath,
                    outputPath: projectPath,
                    processingMode: ProcessingMode.Default,
                });

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
        const originalDirectoryFound =
            await projectSettings.findOriginalDirectory(projectPath);

        if (!originalDirectoryFound) {
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
            projectSettings = new ProjectSettings(
                JSON.parse(
                    await readTextFile(projectSettingsPath),
                ) as ProjectSettingsOptions,
            );
        }

        const engineTypeFound =
            await projectSettings.findEngineType(projectPath);

        if (!engineTypeFound) {
            await message(localization.cannotDetermineEngine);
            await changeTab(null);
            ui.tabContent.innerHTML =
                ui.currentGameEngine.innerHTML =
                ui.currentGameTitle.value =
                    "";

            return false;
        }

        settings.engineType = projectSettings.engineType;

        for (const element of [
            ui.gameInfo,
            ui.currentTabDiv,
            ui.progressMeterContainer,
        ]) {
            element.classList.replace("hidden", "flex");
        }

        ui.toLanguageInput.value = projectSettings.translationLanguages.to;
        ui.fromLanguageInput.value = projectSettings.translationLanguages.from;
        ui.trimCheckbox.textContent = projectSettings.trim ? "check" : "";
        ui.romanizeCheckbox.textContent = projectSettings.romanize
            ? "check"
            : "";
        ui.disableCustomProcessingCheckbox.textContent =
            projectSettings.disableCustomProcessing ? "check" : "";
        ui.mapsProcessingModeSelect.value =
            projectSettings.mapsProcessingMode.toString();

        ui.currentGameEngine.innerHTML = ENGINE_NAMES[settings.engineType];
        return true;
    }

    async function copyTranslationFromRoot(translationPath: string) {
        await mkdir(settings.translationPath, { recursive: true });

        for (const entry of await readDir(translationPath)) {
            await copyFile(
                join(translationPath, entry.name),
                join(settings.translationPath, entry.name),
            );
        }

        // The only case when files must be converted to LF
        // is when they're cloned from Windows machine
        await invokeConvertToLF(settings.translationPath);

        const metadataPath = join(translationPath, RVPACKER_METADATA_FILE);

        if (await exists(metadataPath)) {
            const metadata = JSON.parse(await readTextFile(metadataPath)) as {
                mapsProcessingMode: MapsProcessingMode;
                romanize: boolean;
                disableCustomProcessing: boolean;
                trim: boolean;
            };

            Object.assign(projectSettings, {
                mapsProcessingMode: metadata.mapsProcessingMode,
                romanize: metadata.romanize,
                disableCustomProcessing: metadata.disableCustomProcessing,
                trim: metadata.trim,
            });
        }
    }

    async function parseContentLines(
        contentLines: string[],
        translationFileBasename: string,
        tabIndex: number,
    ): Promise<number> {
        const result: string[] = [];
        const mapsNumbers: number[] = [];

        for (let lineIndex = 0; lineIndex <= contentLines.length; lineIndex++) {
            const line = contentLines[lineIndex];

            if (
                lineIndex === contentLines.length ||
                line.startsWith(MAP_COMMENT) ||
                line.startsWith(BOOKMARK_COMMENT_PREFIX)
            ) {
                if (lineIndex !== contentLines.length) {
                    mapsNumbers.push(
                        Number(
                            line.slice(
                                line.lastIndexOf(LINES_SEPARATOR) +
                                    LINES_SEPARATOR.length,
                            ),
                        ),
                    );

                    if (line.startsWith(BOOKMARK_COMMENT_PREFIX)) {
                        addBookmark({
                            title: `${translationFileBasename}-${lineIndex + 1}`,
                            description: line.slice(
                                line.lastIndexOf(LINES_SEPARATOR) +
                                    LINES_SEPARATOR.length,
                            ),
                        });
                        continue;
                    }
                }

                if (result.length === 0) {
                    result.push(line);
                    continue;
                }

                const mapsNumber = mapsNumbers.shift();
                await writeTextFile(
                    join(
                        settings.tempMapsPath,
                        `maps${mapsNumber}${TXT_EXTENSION}`,
                    ),
                    result.join("\n"),
                );

                const tab = createTab(`maps${mapsNumber}`, result, tabIndex);

                if (tab) {
                    ui.leftPanel.appendChild(tab);
                    tabIndex++;
                }

                result.length = 0;
            }

            if (lineIndex < contentLines.length) {
                result.push(line);
            }
        }

        return tabIndex;
    }

    async function parseTranslationFiles() {
        const translationFiles = await readDir(settings.translationPath);
        let tabIndex = 1;

        for (const translationFile of translationFiles) {
            if (!translationFile.name.endsWith(TXT_EXTENSION)) {
                continue;
            }

            const translationFileContent = await readTextFile(
                join(settings.translationPath, translationFile.name),
            );

            if (!translationFileContent) {
                continue;
            }

            const contentLines = translationFileContent.split("\n");

            if (contentLines.length === 1) {
                continue;
            }

            const translationFileBasename = translationFile.name.slice(
                0,
                -TXT_EXTENSION_LENGTH,
            );

            if (!translationFileBasename.startsWith("maps")) {
                for (const [lineIndex, line] of contentLines.entries()) {
                    if (line.startsWith(BOOKMARK_COMMENT_PREFIX)) {
                        addBookmark({
                            title: `${translationFileBasename}-${lineIndex + 1}`,
                            description: line.slice(
                                line.lastIndexOf(LINES_SEPARATOR) +
                                    LINES_SEPARATOR.length,
                            ),
                        });
                    }
                }

                const tabCreated = createTab(
                    translationFileBasename,
                    contentLines,
                    tabIndex,
                );

                if (tabCreated) {
                    ui.leftPanel.appendChild(tabCreated);
                    tabIndex++;
                }

                continue;
            }

            const result = await parseContentLines(
                contentLines,
                translationFileBasename,
                tabIndex,
            );

            tabIndex = result;
        }
    }

    async function openProject(pathToProject: string, openingNew: boolean) {
        await invokeAddToScope({ path: pathToProject });

        if (!(await isProjectValid(pathToProject))) {
            await settings.setProjectPath("");
            ui.projectStatus.innerHTML = localization.noProjectSelected;
            return;
        }

        // Save and reset everything before opening a new project
        if (openingNew) {
            await save(SaveMode.AllFiles);
            await beforeClose(true);
            await changeTab(null);
            ui.leftPanel.innerHTML = "";
            batchWindow.clear();
            ui.currentGameTitle.innerHTML = "";
            totalRows = 0;
            translatedRowsArray.length = 0;
        }

        ui.projectStatus.innerHTML = localization.loadingProject;
        const interval = animateProgressText(ui.projectStatus);

        await settings.setProjectPath(pathToProject);

        if (!(await exists(settings.translationPath))) {
            const rootTranslationPath = join(
                settings.projectPath,
                TRANSLATION_DIRECTORY,
            );

            if (await exists(rootTranslationPath)) {
                await copyTranslationFromRoot(rootTranslationPath);
            } else {
                await invokeRead(
                    settings.projectPath,
                    projectSettings.originalDirectory,
                    1,
                    false,
                    false,
                    [false, false, false, false],
                    ProcessingMode.Default,
                    settings.engineType,
                    false,
                    false,
                    false,
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
            ui.themeMenu.insertBefore(themeButton, ui.createThemeMenuButton);
        }

        const backupFiles = await readDir(settings.backupPath);
        settings.nextBackupNumber =
            Math.max(
                ...backupFiles.map((entry) =>
                    Number.parseInt(entry.name.slice(0, -2)),
                ),
            ) + 1;

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
        const [originalTitle, translatedTitle] = (
            await invokeReadLastLine({ filePath: systemFilePath })
        ).split(LINES_SEPARATOR);
        ui.currentGameTitle.setAttribute("original-title", originalTitle);
        ui.currentGameTitle.value = translatedTitle || originalTitle;

        // Reset project status
        ui.projectStatus.innerHTML = "";
        clearInterval(interval);
    }

    async function checkForUpdates() {
        if (!settings.checkForUpdates) {
            return;
        }

        try {
            const update = await checkVersion();

            if (!update) {
                console.log(localization.upToDate);
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

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength;
                        console.log(
                            `Started downloading ${event.data.contentLength} bytes`,
                        );
                        break;
                    case "Progress":
                        downloaded += event.data.chunkLength;
                        console.log(
                            `Downloaded ${downloaded} from ${contentLength}`,
                        );
                        break;
                    case "Finished":
                        console.log("Download finished");
                        break;
                }
            });

            await relaunch();
        } catch (e) {
            console.error(e);
        }
    }

    function updateRowIds(startIndex: number) {
        const children = ui.tabContent.children;

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
        const rowContainerId = target.closest(`[id^="${currentTab.name}"]`)!.id;
        const bookmarkIndex = bookmarks.findIndex(
            (obj) => obj.title === rowContainerId,
        );

        if (bookmarkIndex !== -1) {
            bookmarks.splice(bookmarkIndex, 1);

            for (const bookmark of ui.bookmarksMenu.children) {
                if (bookmark.textContent?.startsWith(rowContainerId)) {
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
                    currentTab.name!,
                    rowNumber,
                );

                ui.tabContent.insertBefore(
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
            case RowDeleteMode.Confirmation: {
                const confirm = await ask(localization.deletingConfirmation);

                if (!confirm) {
                    return;
                }
            }
            // eslint-disable-next-line no-fallthrough
            case RowDeleteMode.Allowed: {
                const rowContainer = target.closest(
                    `[id^="${currentTab.name}"]`,
                )!;
                const position = Number(
                    rowContainer.firstElementChild!.textContent!,
                );

                rowContainer.remove();

                updateRowIds(position - 1);

                totalRows -= 1;
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

                if (!shiftPressed) {
                    multipleTextAreasSelected = false;

                    for (const rowNumber of selectedTextareas.keys()) {
                        const rowContainer = ui.tabContent.children[
                            rowNumber
                        ] as HTMLDivElement;
                        (
                            rowContainer.lastElementChild! as HTMLTextAreaElement
                        ).style.outlineColor = "";
                    }
                }

                if (
                    !ui.tabContent.contains(document.activeElement) ||
                    document.activeElement?.tagName !== "TEXTAREA"
                ) {
                    return;
                }

                event.preventDefault();

                selectedTextareas.clear();
                multipleTextAreasSelected = true;

                const clickedRowContainerNumber = Number(
                    target
                        .closest(`[id^="${currentTab.name}"]`)!
                        .id.split("-")[1],
                );
                const selectedRowContainerNumber = Number(
                    document.activeElement
                        .closest(`[id^="${currentTab.name}"]`)!
                        .id.split("-")[1],
                );

                const rowsRange =
                    clickedRowContainerNumber - selectedRowContainerNumber;
                const rowsToSelect = Math.abs(rowsRange);

                const direction = rowsRange > 0 ? 1 : -1;

                for (let i = 0; i <= Math.abs(rowsToSelect); i++) {
                    const rowNumber =
                        selectedRowContainerNumber + direction * i - 1;

                    const nextRowContainer = ui.tabContent.children[
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

    async function handleTabContentCopy(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            await writeText(Array.from(selectedTextareas.values()).join("\0"));
        }
    }

    async function handleTabContentCut(event: ClipboardEvent) {
        if (
            multipleTextAreasSelected &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            await writeText(Array.from(selectedTextareas.values()).join("\0"));

            for (const rowNumber of selectedTextareas.keys()) {
                const rowContainer = ui.tabContent.children[
                    rowNumber
                ] as HTMLDivElement;
                (rowContainer.lastElementChild! as HTMLTextAreaElement).value =
                    "";
            }

            saved = false;
        }
    }

    async function handleTabContentPaste(event: ClipboardEvent) {
        const normalized = (await readText()).replaceAll(NEW_LINE, "\n");

        await writeText(normalized);

        // eslint-disable-next-line no-magic-numbers
        await sleep(SECOND_MS / 100);

        if (
            document.activeElement?.tagName === "TEXTAREA" &&
            normalized.includes("\0")
        ) {
            event.preventDefault();
            const clipboardTextSplit = normalized.split("\0");
            const textRows = clipboardTextSplit.length;

            if (textRows === 0) {
                return;
            } else {
                const rowContainer = document.activeElement.closest(
                    `[id^="${currentTab.name}"]`,
                )!;
                const rowContainerNumber = Number(
                    rowContainer.id.split("-")[1],
                );

                for (let i = 0; i < textRows; i++) {
                    const rowNumber = rowContainerNumber + i - 1;
                    const rowContainer = ui.tabContent.children[
                        rowNumber
                    ] as HTMLDivElement | null;

                    if (!rowContainer) {
                        continue;
                    }

                    const textAreaToReplace =
                        rowContainer.lastElementChild! as HTMLTextAreaElement;

                    replacedTextareas.set(
                        rowNumber,
                        textAreaToReplace.value.replaceAll(normalized, ""),
                    );
                    textAreaToReplace.value = clipboardTextSplit[i];
                    textAreaToReplace.calculateHeight();
                }

                saved = false;
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

    function handleSearchPanelTransitionEnd() {
        if (ui.searchSwitch.innerHTML.trim() === "search") {
            ui.searchPanelFound.toggleMultiple("hidden", "flex");
        } else {
            ui.searchPanelReplaced.toggleMultiple("hidden", "flex");
        }
    }

    function handleSearchMenuChange(event: Event) {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case ui.searchInput.id:
            case ui.replaceInput.id:
                calculateHeight(event);
                break;
            default:
                break;
        }
    }

    async function handleSearchMenuKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case ui.searchInput.id:
                await handleSearchInputKeypress(event);
                break;
            case ui.replaceInput.id:
                handleReplaceInputKeypress(event);
                break;
            default:
                break;
        }
    }

    function handleThemeWindowInput(event: Event) {
        const target = event.target as HTMLInputElement;

        if (target.type === "color") {
            applyTheme(sheet, [target.id, target.value]);
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

        let batchWindowAction: BatchAction | null = null;

        switch (target.id) {
            case ui.translateToolsMenuButton.id:
                if (!areLanguageTagsValid()) {
                    return;
                }

                batchWindowAction = BatchAction.Translate;
                break;
            case "trim-tools-menu-button":
                batchWindowAction = BatchAction.Trim;
                break;
            case "wrap-tools-menu-button":
                batchWindowAction = BatchAction.Wrap;
                break;
        }

        if (batchWindowAction === null) {
            return;
        }

        batchWindow.show(batchWindowAction);
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

        ui.themeWindow.classList.remove("hidden");
        ui.themeWindow.style.left = `${(document.body.clientWidth - ui.themeWindow.clientWidth) / 2}px`;

        const themeColors = Object.values(theme);
        let colorIndex = 1;

        for (const div of ui.themeWindowBody
            .children as HTMLCollectionOf<HTMLDivElement>) {
            for (const subdiv of div.children) {
                (subdiv.firstElementChild as HTMLInputElement).value =
                    themeColors[colorIndex++];
            }
        }
    }

    async function handleBookmarksMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target || target.id === ui.bookmarksMenu.id) {
            return;
        }

        const [file, row] = target.textContent!.split("-");

        await changeTab(file);
        ui.tabContent.children[Number(row)].scrollIntoView({
            inline: "center",
            block: "center",
        });
    }

    async function handleLeftPanelClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        const leftPanelChildren = Array.from(ui.leftPanel.children);
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
            case ui.createThemeButton.id: {
                const themeNameInput: HTMLInputElement =
                    ui.themeWindow.querySelector("#theme-name-input")!;
                const themeName = themeNameInput.value.trim();

                if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                    await message(
                        `${localization.invalidThemeName} ${localization.allowedThemeNameCharacters}`,
                    );
                    return;
                }

                const newTheme = { name: themeName } as Theme;
                for (const div of ui.themeWindowBody
                    .children as HTMLCollectionOf<HTMLDivElement>) {
                    for (const subdiv of div.children) {
                        const input =
                            subdiv.firstElementChild as HTMLInputElement;
                        newTheme[input.id] = input.value;
                    }
                }

                themes[themeName] = newTheme;
                await writeTextFile(THEME_FILE_PATH, JSON.stringify(themes), {
                    baseDir: RESOURCE_DIRECTORY,
                });

                const newThemeButton = document.createElement("button");
                newThemeButton.id = newThemeButton.textContent = themeName;
                ui.themeMenu.insertBefore(
                    newThemeButton,
                    ui.themeMenu.lastElementChild,
                );
                break;
            }
            case ui.closeButton.id:
                ui.themeWindow.classList.add("hidden");
                break;
        }
    }

    async function handleMenuBarClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        switch (target.id) {
            case ui.fileMenuButton.id:
                ui.fileMenu.toggleMultiple("hidden", "flex");
                ui.helpMenu.classList.replace("flex", "hidden");
                ui.languageMenu.classList.replace("flex", "hidden");

                ui.fileMenu.style.top = `${ui.fileMenuButton.offsetTop + ui.fileMenuButton.offsetHeight}px`;
                ui.fileMenu.style.left = `${ui.fileMenuButton.offsetLeft}px`;
                break;
            case "reload-button":
                if (await beforeClose(false)) {
                    location.reload();
                }
                break;
            case ui.helpMenuButton.id:
                ui.helpMenu.toggleMultiple("hidden", "flex");
                ui.fileMenu.classList.replace("flex", "hidden");
                ui.languageMenu.classList.replace("flex", "hidden");

                ui.helpMenu.style.top = `${ui.helpMenuButton.offsetTop + ui.helpMenuButton.offsetHeight}px`;
                ui.helpMenu.style.left = `${ui.helpMenuButton.offsetLeft}px`;
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
            case ui.languageMenuButton.id:
                ui.languageMenu.toggleMultiple("hidden", "flex");
                ui.helpMenu.classList.replace("flex", "hidden");
                ui.fileMenu.classList.replace("flex", "hidden");

                ui.languageMenu.style.top = `${ui.languageMenuButton.offsetTop + ui.languageMenuButton.offsetHeight}px`;
                ui.languageMenu.style.left = `${ui.languageMenuButton.offsetLeft}px`;
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
            case ui.searchSwitch.id: {
                ui.searchPanelFound.classList.toggle("hidden");
                ui.searchPanelReplaced.classList.toggle("hidden");

                if (target.innerHTML.trim() !== "search") {
                    target.innerHTML = "search";
                    ui.searchPanelReplaced.innerHTML = "";
                    return;
                }

                target.innerHTML = "menu_book";

                for (const [key, value] of Object.entries(replacementLog)) {
                    const replacedContainer = document.createElement("div");
                    replacedContainer.className = tw`textSecond backgroundSecond borderPrimary my-1 cursor-pointer border-2 p-1 text-base`;
                    replacedContainer.setAttribute("reverted", "0");

                    replacedContainer.innerHTML = `<div class="textThird">${key}</div><div>${value.old}</div><div class="flex justify-center items-center text-xl textPrimary font-material w-full">arrow_downward</div><div>${value.new}</div>`;

                    ui.searchPanelReplaced.appendChild(replacedContainer);
                }
                break;
            }
            case "previous-page-button": {
                const page = Number(ui.searchCurrentPage.textContent!);

                if (page > 0) {
                    await loadMatchObject(page - 1);
                }
                break;
            }
            case "next-page-button": {
                const page = Number(ui.searchCurrentPage.textContent!);

                if (page < Number(ui.searchTotalPages.textContent!)) {
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
                const predicate = ui.searchInput.value;

                if (predicate.trim()) {
                    await searchText(predicate, ReplaceMode.Search);
                }
                break;
            }
            case "replace-button":
            case "put-button": {
                const searchText = ui.searchInput.value;
                const replacerText = ui.replaceInput.value;

                const searchTextTrimmed = searchText.trim();
                const replacerTextTrimmed = replacerText.trim();

                if (searchTextTrimmed && replacerTextTrimmed) {
                    await replacer.replaceText(
                        searchText,
                        replacerText,
                        Number(ui.searchModeSelect.value),
                        target.id === "replace-button"
                            ? ReplaceMode.Replace
                            : ReplaceMode.Put,
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
            case ui.readingModeSelect.id:
                switch (ui.readingModeSelect.value) {
                    case "append":
                        ui.readingModeDescription.innerHTML =
                            localization.appendModeDescription;
                        break;
                    case "force":
                        ui.readingModeDescription.innerHTML =
                            localization.forceModeDescription;
                        break;
                }
                break;
            case ui.applyReadButton.id: {
                await save(SaveMode.AllFiles);
                ui.readButton.firstElementChild!.classList.add("animate-spin");
                const readingMode = Number(
                    ui.readingModeSelect.value,
                ) as ProcessingMode;

                await invokeRead(
                    settings.projectPath,
                    projectSettings.originalDirectory,
                    readingMode === ProcessingMode.Append
                        ? projectSettings.mapsProcessingMode
                        : Number(ui.mapsProcessingModeSelect.value),
                    readingMode === ProcessingMode.Append
                        ? projectSettings.romanize
                        : Boolean(ui.romanizeCheckbox.textContent),
                    readingMode === ProcessingMode.Append
                        ? projectSettings.disableCustomProcessing
                        : Boolean(
                              ui.disableCustomProcessingCheckbox.textContent,
                          ),
                    [
                        Boolean(ui.rDisableMapsProcessingCheckbox.textContent),
                        Boolean(ui.rDisableOtherProcessingCheckbox.textContent),
                        Boolean(
                            ui.rDisableSystemProcessingCheckbox.textContent,
                        ),
                        Boolean(
                            ui.rDisablePluginsProcessingCheckbox.textContent,
                        ),
                    ],
                    readingMode,
                    settings.engineType,
                    Boolean(ui.ignoreCheckbox.textContent),
                    readingMode === ProcessingMode.Append
                        ? projectSettings.trim
                        : Boolean(ui.trimCheckbox.textContent),
                    Boolean(ui.sortCheckbox.textContent),
                );

                if (await beforeClose(true)) {
                    location.reload();
                }
                break;
            }
        }
    }

    async function handlePurgeMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id === ui.applyPurgeButton.id) {
            await save(SaveMode.AllFiles);

            ui.purgeButton.firstElementChild!.classList.add("animate-spin");

            await invokePurge(
                settings.projectPath,
                projectSettings.originalDirectory,
                ui.currentGameTitle.getAttribute("original-title")!,
                projectSettings.mapsProcessingMode,
                projectSettings.romanize,
                projectSettings.disableCustomProcessing,
                [
                    Boolean(ui.pDisableMapsProcessingCheckbox.textContent),
                    Boolean(ui.pDisableOtherProcessingCheckbox.textContent),
                    Boolean(ui.pDisableSystemProcessingCheckbox.textContent),
                    Boolean(ui.pDisablePluginsProcessingCheckbox.textContent),
                ],
                settings.engineType,
                Boolean(ui.statCheckbox.textContent),
                Boolean(ui.leaveFilledCheckbox.textContent),
                Boolean(ui.purgeEmptyCheckbox.textContent),
                Boolean(ui.createIgnoreCheckbox.textContent),
                projectSettings.trim,
            );

            ui.purgeButton.firstElementChild!.classList.remove("animate-spin");

            if (!ui.statCheckbox.textContent && (await beforeClose(true))) {
                location.reload();
            }
        }
    }

    async function handleCompileMenuClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (target.id === ui.outputPathButton.id) {
            const directory = (await openPath({
                directory: true,
                multiple: false,
            }))!;

            if (directory) {
                ui.outputPathInput.value = directory;
            }
        }
    }

    async function handleDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        if (ui.tabContent.contains(target) && target.tagName === "DIV") {
            const rowContainer = target.parentElement;

            if (rowContainer && /\d$/.test(rowContainer.id)) {
                await writeText(target.textContent!);
            }
        }

        if (target.id.includes("checkbox")) {
            target.innerHTML = !target.textContent ? "check" : "";
        }

        if (target.classList.contains("dropdown-menu")) {
            for (const element of document.querySelectorAll(".dropdown-menu")) {
                element.classList.replace("flex", "hidden");
            }
        }
    }

    function showCompileMenu() {
        ui.compileMenu.toggleMultiple("hidden", "flex");

        if (ui.compileMenu.classList.contains("hidden")) {
            return;
        }

        requestAnimationFrame(() => {
            ui.compileMenu.style.left = `${ui.compileButton.offsetLeft}px`;
            ui.compileMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
        });

        ui.outputPathInput.value = settings.programDataPath;
        ui.cDisableMapsProcessingCheckbox.innerHTML =
            ui.cDisableOtherProcessingCheckbox.innerHTML =
            ui.cDisableSystemProcessingCheckbox.innerHTML =
            ui.cDisablePluginsProcessingCheckbox.innerHTML =
                "";
    }

    async function handleTopPanelButtonsDivMousedown(event: MouseEvent) {
        const target = (event.target as HTMLElement).closest(`[id$="button"]`);

        if (
            !target ||
            (!settings.projectPath && target.id !== "open-directory-button") ||
            !ui.topPanelButtonsDiv.contains(target)
        ) {
            return;
        }

        const button = event.button as MouseButton;

        switch (target.id) {
            case "menu-button":
                ui.leftPanel.toggleMultiple(
                    "translate-x-0",
                    "-translate-x-full",
                );
                break;
            case ui.saveButton.id:
                await save(SaveMode.AllFiles);
                break;
            case "compile-button": {
                if (button === MouseButton.Right) {
                    showCompileMenu();
                } else if (button === MouseButton.Left) {
                    if (ui.compileButton.classList.contains("hidden")) {
                        await startCompilation();
                        return;
                    }

                    await startCompilation(ui.outputPathInput.value, [
                        Boolean(ui.cDisableMapsProcessingCheckbox.textContent),
                        Boolean(ui.cDisableOtherProcessingCheckbox.textContent),
                        Boolean(
                            ui.cDisableSystemProcessingCheckbox.textContent,
                        ),
                        Boolean(
                            ui.cDisablePluginsProcessingCheckbox.textContent,
                        ),
                    ]);
                }
                break;
            }
            case "open-directory-button": {
                const directory = await openPath({
                    directory: true,
                    multiple: false,
                });

                if (!directory) {
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
            case ui.themeButton.id:
                ui.themeMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    ui.themeMenu.style.left = `${ui.themeButton.offsetLeft}px`;
                    ui.themeMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            case ui.bookmarksButton.id:
                ui.bookmarksMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    ui.bookmarksMenu.style.left = `${ui.bookmarksButton.offsetLeft}px`;
                    ui.bookmarksMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            case ui.readButton.id: {
                if (!projectSettings.originalDirectory) {
                    alert(localization.gameFilesDoNotExist);
                    return;
                }

                ui.readMenu.toggleMultiple("hidden", "flex");

                if (ui.readMenu.classList.contains("hidden")) {
                    return;
                }

                requestAnimationFrame(() => {
                    ui.readMenu.style.left = `${ui.readButton.offsetLeft}px`;
                    ui.readMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            }
            case ui.searchButton.id:
                if (!ui.searchMenu.classList.contains("hidden")) {
                    ui.searchMenu.classList.add("hidden");
                    return;
                }

                ui.searchMenu.classList.remove("hidden");
                requestAnimationFrame(() => {
                    ui.searchMenu.style.left = `${ui.searchButton.offsetLeft}px`;
                    ui.searchMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            case ui.toolsButton.id:
                ui.toolsMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    ui.toolsMenu.style.left = `${ui.toolsButton.offsetLeft}px`;
                    ui.toolsMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            case ui.purgeButton.id: {
                if (!projectSettings.originalDirectory) {
                    alert(localization.gameFilesDoNotExist);
                    return;
                }

                ui.purgeMenu.toggleMultiple("hidden", "flex");

                if (ui.purgeMenu.classList.contains("hidden")) {
                    return;
                }

                requestAnimationFrame(() => {
                    ui.purgeMenu.style.left = `${ui.purgeButton.offsetLeft}px`;
                    ui.purgeMenu.style.top = `${ui.menuBar.clientHeight + ui.topPanel.clientHeight}px`;
                });
                break;
            }
        }
    }

    // #region Settings and localization initialization, check for updates
    await attachConsole();

    const settings: Settings = await loadSettings();
    const localization = new MainWindowLocalization(settings.language);

    const themes = JSON.parse(
        await readTextFile(THEME_FILE_PATH, { baseDir: RESOURCE_DIRECTORY }),
    ) as ThemeObject;
    let theme: Theme = themes[settings.theme];

    initializeLocalization(settings.language);
    await checkForUpdates();
    // #endregion

    // #region Program initialization
    applyLocalization(localization, theme);

    // #region Static constants

    const sheet = getThemeStyleSheet()!;
    const ui = setupUi("mainwindow") as MainWindowUI;

    // #endregion
    let backupIsActive: number | null = null;

    // Set theme
    let currentTheme: string;

    setTheme(theme);

    // Initialize the project
    const currentTab: CurrentTab = {
        name: null,
        index: null,
        content: ui.tabContent,
    };
    const batchWindow = new BatchWindow(settings, currentTab, ui);
    let lastCharacters = "";
    let lastSubstitutionCharacter: { char: string; pos: number } | null = null;

    let projectSettings!: ProjectSettings;

    let totalRows = 0;
    const translatedRowsArray: number[] = [];
    const bookmarks: Bookmark[] = [];

    await openProject(settings.projectPath, false);

    // Load the font
    const textAreaPropertiesMemo: TextAreaPropertiesMemo = {};
    await loadFont(settings.fontUrl);

    const replacementLog: ReplacementLog = await fetchReplacementLog();

    const activeGhostLines: HTMLDivElement[] = [];

    const selectedTextareas = new Map<number, string>();
    const replacedTextareas = new Map<number, string>();

    const searchFlags: SearchFlagsObject = { flags: SearchFlags.None };
    const searcher = new Searcher(settings, searchFlags, currentTab);
    const replacer = new Replacer(
        settings,
        replacementLog,
        searchFlags,
        currentTab,
        searcher,
    );
    const saver = new Saver(settings, currentTab, ui.currentGameTitle);

    let saved = true;
    let currentFocusedElement: [string, string] | [] = [];

    let changeTimer: null | number = null;
    let shiftPressed = false;

    let multipleTextAreasSelected = false;

    await APP_WINDOW.setZoom(settings.zoom);
    // #endregion

    // #region Event listeners
    ui.topPanelButtonsDiv.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    ui.topPanelButtonsDiv.addEventListener(
        "mousedown",
        handleTopPanelButtonsDivMousedown,
    );
    ui.tabContent.addEventListener("paste", handleTabContentPaste);
    ui.tabContent.addEventListener("keyup", handleTabContentKeyup);
    ui.tabContent.addEventListener("input", handleTabContentInput);
    ui.searchPanel.addEventListener(
        "transitionend",
        handleSearchPanelTransitionEnd,
    );
    ui.searchPanelFound.addEventListener("mousedown", handleResultClick);
    ui.goToRowInput.addEventListener("keydown", handleGotoRowInputKeypress);
    ui.searchMenu.addEventListener("change", handleSearchMenuChange);
    ui.searchMenu.addEventListener("keydown", handleSearchMenuKeydown);
    ui.themeWindow.addEventListener("input", handleThemeWindowInput);
    ui.toolsMenu.addEventListener("click", handleToolsMenuClick);
    ui.themeMenu.addEventListener("click", handleThemeMenuClick);
    ui.bookmarksMenu.addEventListener("click", handleBookmarksMenuClick);
    ui.leftPanel.addEventListener("click", handleLeftPanelClick);
    ui.themeWindow.addEventListener("click", handleThemeWindowClick);
    ui.menuBar.addEventListener("click", handleMenuBarClick);
    ui.searchPanel.addEventListener("click", handleSearchPanelClick);
    ui.searchMenu.addEventListener("click", handleSearchMenuClick);
    ui.readMenu.addEventListener("click", handleReadMenuClick);
    ui.purgeMenu.addEventListener("click", handlePurgeMenuClick);
    ui.compileMenu.addEventListener("click", handleCompileMenuClick);
    ui.tabContent.addEventListener("keydown", handleTabContentKeydown, true);
    ui.searchPanelReplaced.addEventListener("mousedown", handleReplacedClick);
    document.body.addEventListener("keydown", handleKeypress);
    document.body.addEventListener("keyup", (event) => {
        if (event.key === "Shift") {
            shiftPressed = false;
        }
    });

    ui.tabContent.addEventListener("focus", handleFocus, true);
    ui.tabContent.addEventListener("blur", handleBlur, true);
    ui.tabContent.addEventListener("mousedown", handleTabContentMousedown);
    ui.tabContent.addEventListener("copy", handleTabContentCopy);
    ui.tabContent.addEventListener("cut", handleTabContentCut);
    document.addEventListener("click", handleDocumentClick);

    await listen("fetch-settings", async () => {
        await emit("settings", [settings, theme, projectSettings]);
    });

    await listen<string | null>("change-tab", async (event) => {
        await changeTab(event.payload);
    });

    await listen<boolean>("saved", (event) => {
        saved = event.payload;
    });

    await listen<[number, number]>("update-progress", (event) => {
        const [index, lineCount] = event.payload;

        const progressBar = ui.leftPanel.children[index].lastElementChild
            ?.firstElementChild as HTMLElement | null;

        updateProgress(progressBar, lineCount, PERCENT_MULTIPLIER);
    });

    await APP_WINDOW.onCloseRequested(async (event) => {
        if (await beforeClose(false)) {
            await exit();
        } else {
            event.preventDefault();
        }
    });
    // #endregion
});
