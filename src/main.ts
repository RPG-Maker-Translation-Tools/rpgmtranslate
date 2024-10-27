import {
    animateProgressText,
    applyLocalization,
    applyTheme,
    CompileSettings,
    getThemeStyleSheet,
    join,
    Settings,
} from "./extensions/functions";
import "./extensions/htmlelement-extensions";
import {
    invokeAddToScope,
    invokeCompile,
    invokeEscapeText,
    invokeRead,
    invokeReadLastLine,
    invokeTranslateText,
} from "./extensions/invokes";
import { MainWindowLocalization } from "./extensions/localization";
import "./extensions/string-extensions";
import { EngineType, Language, ProcessingMode, SaveMode, SearchMode, State } from "./types/enums";

import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ask, message, open as openPath } from "@tauri-apps/plugin-dialog";
import {
    BaseDirectory,
    copyFile,
    exists,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { locale as getLocale } from "@tauri-apps/plugin-os";
import { exit } from "@tauri-apps/plugin-process";
const { Resource } = BaseDirectory;
const appWindow = getCurrentWebviewWindow();

import XRegExp from "xregexp";

document.addEventListener("DOMContentLoaded", async () => {
    const tw = (strings: TemplateStringsArray, ...values: string[]): string => String.raw({ raw: strings }, ...values);

    // #region Static constants
    const NEW_LINE = "\\#";
    const LINES_SEPARATOR = "<#>";
    const sheet = getThemeStyleSheet()!;

    const translationDir = "translation";

    const programDataDir = ".rpgmtranslate";
    const logFile = "replacement-log.json";

    const settingsPath = "res/settings.json";

    const contentContainer = document.getElementById("content-container") as HTMLDivElement;
    const searchInput = document.getElementById("search-input") as HTMLTextAreaElement;
    const replaceInput = document.getElementById("replace-input") as HTMLTextAreaElement;
    const leftPanel = document.getElementById("left-panel") as HTMLDivElement;
    const searchPanel = document.getElementById("search-results") as HTMLDivElement;
    const searchPanelFound = document.getElementById("search-content") as HTMLDivElement;
    const searchPanelReplaced = document.getElementById("replace-content") as HTMLDivElement;
    const searchCurrentPage = document.getElementById("search-current-page") as HTMLSpanElement;
    const searchTotalPages = document.getElementById("search-total-pages") as HTMLSpanElement;
    const topPanel = document.getElementById("top-panel") as HTMLDivElement;
    const topPanelButtonsContainer = document.getElementById("top-panel-buttons") as HTMLDivElement;
    const saveButton = document.getElementById("save-button") as HTMLButtonElement;
    const compileButton = document.getElementById("compile-button") as HTMLButtonElement;
    const themeButton = document.getElementById("theme-button") as HTMLButtonElement;
    const themeMenu = document.getElementById("theme-menu") as HTMLDivElement;
    const toolsButton = document.getElementById("tools-button") as HTMLButtonElement;
    const toolsMenu = document.getElementById("tools-menu") as HTMLDivElement;
    const searchCaseButton = document.getElementById("case-button") as HTMLButtonElement;
    const searchWholeButton = document.getElementById("whole-button") as HTMLButtonElement;
    const searchRegexButton = document.getElementById("regex-button") as HTMLButtonElement;
    const searchModeSelect = document.getElementById("search-mode") as HTMLSelectElement;
    const searchLocationButton = document.getElementById("location-button") as HTMLButtonElement;
    const goToRowInput = document.getElementById("goto-row-input") as HTMLInputElement;
    const menuBar = document.getElementById("menu-bar") as HTMLDivElement;
    const fileMenuButton = document.getElementById("file-menu-button") as HTMLButtonElement;
    const helpMenuButton = document.getElementById("help-menu-button") as HTMLButtonElement;
    const languageMenuButton = document.getElementById("language-menu-button") as HTMLButtonElement;
    const fileMenu = document.getElementById("file-menu") as HTMLDivElement;
    const helpMenu = document.getElementById("help-menu") as HTMLDivElement;
    const languageMenu = document.getElementById("language-menu") as HTMLDivElement;
    const currentState = document.getElementById("current-state") as HTMLDivElement;
    const themeWindow = document.getElementById("theme-window") as HTMLDivElement;
    const createThemeMenuButton = document.getElementById("create-theme-menu-button") as HTMLButtonElement;
    const searchMenu = document.getElementById("search-menu") as HTMLDivElement;
    const searchButton = document.getElementById("search-button") as HTMLButtonElement;
    const bookmarksButton = document.getElementById("bookmarks-button") as HTMLButtonElement;
    const bookmarksMenu = document.getElementById("bookmarks-menu") as HTMLDivElement;
    const projectStatus = document.getElementById("project-status") as HTMLDivElement;
    const currentGameEngine = document.getElementById("current-game-engine") as HTMLDivElement;
    const currentGameTitle = document.getElementById("current-game-title") as HTMLInputElement;
    // #endregion

    // #region Program initialization
    let clickTimer: number | null = null;
    let backupIsActive = false;
    let originalDir = "";

    let windowLocalization: MainWindowLocalization;

    const settings: Settings = (await exists(settingsPath, { baseDir: Resource }))
        ? (JSON.parse(await readTextFile(settingsPath, { baseDir: Resource })) as Settings)
        : (await createSettings())!;

    // Set theme
    const themes = JSON.parse(await readTextFile("res/themes.json", { baseDir: Resource })) as ThemeObject;

    let theme: Theme = themes[settings.theme];
    let currentTheme: string;

    setTheme(theme);

    // Set language
    setLanguage(settings.language);

    // Initialize the project
    let state: State | null = null;
    let nextBackupNumber: number;

    const observerMain = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.firstElementChild?.classList.toggle("hidden", !entry.isIntersecting);
            }
        },
        {
            root: document,
        },
    );

    const observerFound = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.firstElementChild?.classList.toggle("hidden", !entry.isIntersecting);
            }
        },
        { root: searchPanelFound },
    );

    const observerReplaced = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.firstElementChild?.classList.toggle("hidden", !entry.isIntersecting);
            }
        },
        { root: searchPanelReplaced },
    );

    await initializeProject(settings.projectPath);

    // Load the font
    const textAreaPropertiesMemo: TextAreaPropertiesMemo = {};
    await loadFont(settings.fontUrl);
    // #endregion

    let replaced: Record<string, Record<string, string>> = {};
    const activeGhostLines: HTMLDivElement[] = [];

    let selectedTextareas: Record<string, string> = {};
    let replacedTextareas: Record<string, string> = {};

    const bookmarks: string[] = await fetchBookmarks(join(settings.projectPath, programDataDir, "bookmarks.txt"));

    let searchRegex = false;
    let searchWhole = false;
    let searchCase = false;
    let searchLocation = false;

    let saved = true;
    let saving = false;
    let currentFocusedElement: [string, string] | [] = [];

    let shiftPressed = false;

    let multipleTextAreasSelected = false;

    let zoom = 1;

    await appWindow.setZoom(zoom);

    function addBookmark(bookmarkTitle: string) {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = tw`backgroundPrimary backgroundSecondHovered flex flex-row items-center justify-center p-2`;
        bookmarkElement.innerHTML = bookmarkTitle;

        bookmarksMenu.appendChild(bookmarkElement);
    }

    async function fetchBookmarks(bookmarksFilePath: string) {
        if (!(await exists(bookmarksFilePath))) {
            return [];
        }

        const bookmarksFileContent = await readTextFile(bookmarksFilePath);
        const bookmarkTitles = bookmarksFileContent.split(",");

        for (const bookmarkTitle of bookmarkTitles) {
            if (!bookmarkTitle) {
                continue;
            }

            const parts = bookmarkTitle.split("-", 2);
            const rowElement = document.getElementById(`${parts[0]}-row-${parts[1]}`);
            rowElement?.lastElementChild?.firstElementChild?.classList.toggle("backgroundThird");

            addBookmark(bookmarkTitle);
        }

        return bookmarkTitles;
    }

    async function determineLanguage(): Promise<Language> {
        const locale: string = (await getLocale()) ?? "en";
        const mainPart: string = locale.split("-", 1)[0];

        switch (mainPart) {
            case "ru":
            case "uk":
            case "be":
                return Language.Russian;
            default:
                return Language.English;
        }
    }

    async function handleMousedown(event: MouseEvent) {
        const target = event.target as HTMLElement;

        if (target.classList.contains("bookmarkButton")) {
            const row = target.closest("[id]")!;
            const parts = row.id.split("-", 3);
            const bookmarkText = `${parts[0]}-${parts.at(-1)!}`;

            const bookmarkId = bookmarks.findIndex((string) => string === bookmarkText);
            if (bookmarkId) {
                bookmarks.splice(bookmarkId, 1);

                for (const bookmark of bookmarksMenu.children) {
                    if (bookmark.textContent === bookmarkText) {
                        bookmark.remove();
                    }
                }
            } else {
                bookmarks.push(bookmarkText);
                addBookmark(bookmarkText);
            }

            await writeTextFile(
                join(settings.projectPath, programDataDir, "bookmarks.txt"),
                Array.from(bookmarks).join(","),
            );
            target.classList.toggle("backgroundThird");
        } else if (event.button === 0) {
            if (shiftPressed) {
                if (
                    contentContainer.contains(document.activeElement) &&
                    document.activeElement?.tagName === "TEXTAREA"
                ) {
                    event.preventDefault();
                    selectedTextareas = {};

                    multipleTextAreasSelected = true;
                    const target = event.target as HTMLTextAreaElement;

                    const targetId = target.id.split("-");
                    const targetRow = Number.parseInt(targetId.pop()!);

                    const focusedElementId = document.activeElement.id.split("-");
                    const focusedElementRow = Number.parseInt(focusedElementId.pop()!);

                    const rowsRange = targetRow - focusedElementRow;
                    const rowsToSelect = Math.abs(rowsRange);

                    if (rowsRange > 0) {
                        for (let i = 0; i <= rowsToSelect; i++) {
                            const line = focusedElementRow + i;

                            const nextElement = document.getElementById(
                                `${targetId.join("-")}-${line}`,
                            ) as HTMLTextAreaElement;

                            nextElement.style.borderColor = theme.borderFocused;
                            selectedTextareas[nextElement.id] = nextElement.value;
                        }
                    } else {
                        for (let i = rowsToSelect; i >= 0; i--) {
                            const line = focusedElementRow - i;

                            const nextElement = document.getElementById(
                                `${targetId.join("-")}-${line}`,
                            ) as HTMLTextAreaElement;

                            nextElement.style.borderColor = theme.borderFocused;
                            selectedTextareas[nextElement.id] = nextElement.value;
                        }
                    }
                }
            } else {
                multipleTextAreasSelected = false;

                for (const id of Object.keys(selectedTextareas)) {
                    const element = document.getElementById(id) as HTMLTextAreaElement;
                    element.style.borderColor = "";
                }
            }
        }
    }

    function showThemeWindow() {
        themeWindow.classList.remove("hidden");

        function changeStyle(inputElement: Event) {
            const target = inputElement.target as HTMLInputElement;
            const id = target.id;
            const value = target.value;

            applyTheme(sheet, [id, value]);
        }

        async function createTheme() {
            const themeNameInput = themeWindow.lastElementChild!.firstElementChild!
                .lastElementChild as HTMLInputElement;
            const themeName = themeNameInput.value;

            const newTheme = { name: themeName } as Theme;

            for (const div of themeWindow.children[1].children as HTMLCollectionOf<HTMLDivElement>) {
                for (const subdiv of div.children) {
                    const inputElement = subdiv.firstElementChild as HTMLInputElement;
                    newTheme[inputElement.id] = inputElement.value;
                }
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                await message(
                    `${windowLocalization.invalidThemeName} ${windowLocalization.allowedThemeNameCharacters}`,
                );
                return;
            }

            themes[themeName] = newTheme;

            await writeTextFile("res/themes.json", JSON.stringify(themes), { baseDir: Resource });

            const newThemeButton = document.createElement("button");
            newThemeButton.id = themeName;
            newThemeButton.textContent = themeName;

            themeMenu.insertBefore(themeMenu.lastElementChild as HTMLElement, newThemeButton);
        }

        requestAnimationFrame(() => {
            themeWindow.style.left = `${(document.body.clientWidth - themeWindow.clientWidth) / 2}px`;

            let i = 1;
            const themeColors = Object.values(theme);

            for (const div of themeWindow.children[1].children as HTMLCollectionOf<HTMLDivElement>) {
                for (const subdiv of div.children) {
                    const inputElement = subdiv.firstElementChild as HTMLInputElement;

                    inputElement.value = themeColors[i];
                    inputElement.addEventListener("input", changeStyle);
                    i++;
                }
            }

            const closeButton = themeWindow.firstElementChild!.firstElementChild as HTMLButtonElement;
            const createThemeButton = themeWindow.lastElementChild!.lastElementChild as HTMLButtonElement;
            createThemeButton.addEventListener("click", createTheme);

            closeButton.addEventListener("click", () => {
                for (const div of themeWindow.children[1].children as HTMLCollectionOf<HTMLDivElement>) {
                    for (const subdiv of div.children) {
                        const inputElement = subdiv.firstElementChild as HTMLInputElement;
                        inputElement.removeEventListener("input", changeStyle);
                    }
                }

                createThemeButton.removeEventListener("click", createTheme);
                themeWindow.classList.add("hidden");
            });
        });
    }

    async function ensureProjectIsValid(pathToProject: string): Promise<boolean> {
        if (!pathToProject) {
            return false;
        }

        if (!(await exists(pathToProject))) {
            await message(windowLocalization.selectedFolderMissing);
            return false;
        }

        if (await exists(join(pathToProject, "Data"))) {
            originalDir = "Data";
        } else if (await exists(join(pathToProject, "data"))) {
            originalDir = "data";
        }

        if (await exists(join(pathToProject, "original"))) {
            originalDir = "original";
        }

        if (await exists(join(pathToProject, originalDir, "System.rxdata"))) {
            settings.engineType = EngineType.XP;
            currentGameEngine.innerHTML = "XP";
        } else if (await exists(join(pathToProject, originalDir, "System.rvdata"))) {
            settings.engineType = EngineType.VX;
            currentGameEngine.innerHTML = "VX";
        } else if (await exists(join(pathToProject, originalDir, "System.rvdata2"))) {
            settings.engineType = EngineType.VXAce;
            currentGameEngine.innerHTML = "VX Ace";
        } else if (await exists(join(pathToProject, originalDir, "System.json"))) {
            settings.engineType = EngineType.New;
            currentGameEngine.innerHTML = "MV / MZ";
        } else {
            await message(windowLocalization.cannotDetermineEngine);

            await changeState(null);
            contentContainer.innerHTML = "";
            currentGameEngine.innerHTML = "";
            currentGameTitle.value = "";
            return false;
        }

        return true;
    }

    async function openDirectory() {
        const directory = await openPath({ directory: true, multiple: false });

        if (directory) {
            if (directory === settings.projectPath) {
                await message(windowLocalization.directoryAlreadyOpened);
                return;
            }

            await changeState(null);
            contentContainer.innerHTML = "";
            currentGameTitle.innerHTML = "";

            await initializeProject(directory);
        }
    }

    async function createSettings(): Promise<Settings | undefined> {
        const language = await determineLanguage();

        windowLocalization = new MainWindowLocalization(language);

        await message(windowLocalization.cannotGetSettings);
        const askCreateSettings = await ask(windowLocalization.askCreateSettings);

        if (askCreateSettings) {
            const newSettings = new Settings(language);

            await invokeAddToScope({ window: appWindow, path: settingsPath });
            await writeTextFile(settingsPath, JSON.stringify(newSettings), {
                baseDir: Resource,
            });

            alert(windowLocalization.createdSettings);
            return newSettings;
        } else {
            await exit();
        }
    }

    function setLanguage(language: Language) {
        settings.language = language;
        windowLocalization = new MainWindowLocalization(language);
        initializeLocalization();
    }

    async function createRegExp(text: string): Promise<RegExp | undefined> {
        text = text.trim();
        if (!text) {
            return;
        }

        let regexp = searchRegex ? text : await invokeEscapeText({ text });
        regexp = searchWhole ? `(?<!\\p{L})${regexp}(?!\\p{L})` : regexp;

        const attr = searchCase ? "g" : "gi";

        try {
            return XRegExp(regexp, attr);
        } catch (err) {
            await message(`${windowLocalization.invalidRegexp} (${text}), ${err}`);
            return;
        }
    }

    function appendMatch(metadata: string, result: string, counterpartTextMisc?: string) {
        const [file, type, row] = metadata.split("-");
        const reverseType = type.startsWith("o") ? "translation" : "original";
        const resultContainer = document.createElement("div");

        const resultElement = document.createElement("div");
        resultElement.className = tw`textSecond borderPrimary backgroundSecond my-1 cursor-pointer border-2 p-1 text-xl`;

        const counterpartElement = document.getElementById(metadata.replace(type, reverseType));

        const mainDiv = document.createElement("div");
        mainDiv.className = tw`text-base`;

        const resultDiv = document.createElement("div");
        resultDiv.innerHTML = result;
        mainDiv.appendChild(resultDiv);

        const originalInfo = document.createElement("div");
        originalInfo.className = tw`textThird text-xs`;

        originalInfo.innerHTML = `${file} - ${type} - ${row}`;
        mainDiv.appendChild(originalInfo);

        const arrow = document.createElement("div");
        arrow.className = tw`textSecond flex items-center justify-center font-material text-xl`;
        arrow.innerHTML = "arrow_downward";
        mainDiv.appendChild(arrow);

        const counterpart = document.createElement("div");

        const counterpartText = counterpartElement
            ? counterpartElement.tagName === "TEXTAREA"
                ? (counterpartElement as HTMLTextAreaElement).value
                : counterpartElement.innerHTML
            : counterpartTextMisc;
        counterpart.innerHTML = counterpartText!.replaceAllMultiple({ "<": "&lt;", ">": "&gt;" });

        mainDiv.appendChild(counterpart);

        const counterpartInfo = document.createElement("div");
        counterpartInfo.className = tw`textThird text-xs`;

        counterpartInfo.innerHTML = `${file} - ${reverseType} - ${row}`;
        mainDiv.appendChild(counterpartInfo);

        resultElement.appendChild(mainDiv);

        resultElement.setAttribute("data", `${file}-${type}-${row}`);
        resultContainer.appendChild(resultElement);
        searchPanelFound.appendChild(resultContainer);
    }

    function createMatchesContainer(elementText: string, matches: string[]): string {
        const result: string[] = [];
        let lastIndex = 0;

        for (const match of matches) {
            const start = elementText.indexOf(match, lastIndex);
            const end = start + match.length;

            const beforeDiv = `<span>${elementText.slice(lastIndex, start)}</span>`;
            const matchDiv = `<span class="backgroundThird">${match}</span>`;

            result.push(beforeDiv);
            result.push(matchDiv);

            lastIndex = end;
        }

        const afterDiv = `<span>${elementText.slice(lastIndex)}</span>`;
        result.push(afterDiv);

        return result.join("");
    }

    async function searchText(
        text: string,
        isReplace: boolean,
    ): Promise<null | undefined | Map<HTMLTextAreaElement, string>> {
        const regexp: RegExp | undefined = await createRegExp(text);
        if (!regexp) {
            return;
        }

        const searchMode = Number.parseInt(searchModeSelect.value) as SearchMode;
        const results = isReplace ? new Map<HTMLTextAreaElement, string>() : null;
        const objectToWrite = new Map<string, string | [string, string]>();
        let file = 0;

        const currentSearchArray = contentContainer.firstElementChild?.children;

        for (const child of currentSearchArray ?? []) {
            const node = child.firstElementChild!.children as HTMLCollectionOf<HTMLTextAreaElement>;

            if (searchMode !== SearchMode.OnlyOriginal) {
                const elementText = node[2].value.replaceAllMultiple({
                    "<": "&lt;",
                    ">": "&gt;",
                });
                const matches = elementText.match(regexp);

                if (matches) {
                    const result = createMatchesContainer(elementText, matches);
                    isReplace ? results!.set(node[2], result) : objectToWrite.set(node[2].id, result);
                }
            }

            if (searchMode !== SearchMode.OnlyTranslation) {
                const elementText = node[1].innerHTML.replaceAllMultiple({ "<": "&lt;", ">": "&gt;" });
                const matches = elementText.match(regexp);

                if (matches) {
                    const result = createMatchesContainer(elementText, matches);
                    isReplace ? results!.set(node[1], result) : objectToWrite.set(node[1].id, result);
                }
            }

            if ((objectToWrite.size + 1) % 1000 === 0) {
                await writeTextFile(
                    join(settings.projectPath, programDataDir, `matches-${file}.json`),
                    JSON.stringify(Object.fromEntries(objectToWrite)),
                );

                objectToWrite.clear();
                file++;
            }
        }

        if (!searchLocation) {
            const translationEntries = await readDir(join(settings.projectPath, programDataDir, translationDir));
            const mapsEntries = await readDir(join(settings.projectPath, programDataDir, "temp-maps"));

            for (const [i, entry] of [
                mapsEntries.sort((a, b) => Number.parseInt(a.name.slice(4)) - Number.parseInt(b.name.slice(4))),
                translationEntries,
            ]
                .flat()
                .entries()) {
                const name = entry.name;
                const nameWithoutExtension = name.slice(0, -4);

                if (!name.endsWith(".txt") || (state && name.startsWith(state)) || name === "maps.txt") {
                    continue;
                }

                for (const [lineNumber, line] of (
                    await readTextFile(
                        i < mapsEntries.length
                            ? join(settings.projectPath, programDataDir, "temp-maps", name)
                            : join(settings.projectPath, programDataDir, translationDir, name),
                    )
                )
                    .split("\n")
                    .entries()) {
                    const [original, translated] = line.split(LINES_SEPARATOR);

                    if (searchMode !== SearchMode.OnlyTranslation) {
                        const originalMatches = original.match(regexp);
                        if (originalMatches) {
                            const result = createMatchesContainer(original, originalMatches);
                            objectToWrite.set(`${nameWithoutExtension}-original-${lineNumber + 1}`, [
                                result,
                                translated,
                            ]);
                        }
                    }

                    if (searchMode !== SearchMode.OnlyOriginal) {
                        const translatedMatches = translated.match(regexp);
                        if (translatedMatches) {
                            const result = createMatchesContainer(translated, translatedMatches);
                            objectToWrite.set(`${nameWithoutExtension}-translation-${lineNumber + 1}`, [
                                result,
                                original,
                            ]);
                        }
                    }

                    if ((objectToWrite.size + 1) % 1000 === 0) {
                        await writeTextFile(
                            join(settings.projectPath, programDataDir, `matches-${file}.json`),
                            JSON.stringify(Object.fromEntries(objectToWrite)),
                        );

                        objectToWrite.clear();
                        file++;
                    }
                }
            }
        }

        if (objectToWrite.size > 0) {
            await writeTextFile(
                join(settings.projectPath, programDataDir, `matches-${file}.json`),
                JSON.stringify(Object.fromEntries(objectToWrite)),
            );
        }

        searchTotalPages.textContent = file.toString();
        searchCurrentPage.textContent = "0";

        const matches = JSON.parse(
            await readTextFile(join(settings.projectPath, programDataDir, "matches-0.json")),
        ) as object;

        for (const [id, result] of Object.entries(matches) as [string, string | [string, string]]) {
            if (typeof result === "object") {
                appendMatch(id, result[0] as string, result[1] as string);
            } else {
                appendMatch(id, result);
            }
        }

        return results;
    }

    async function handleReplacedClick(event: MouseEvent) {
        const target = event.target as HTMLElement;

        const element = target.classList.contains("replaced-element") ? target : target.parentElement!;

        if (element.hasAttribute("reverted") || !searchPanelReplaced.contains(element)) {
            return;
        }

        const clicked = document.getElementById(element.firstElementChild!.textContent!) as HTMLTextAreaElement;
        const secondParent = element.parentElement!.parentElement!;

        if (event.button === 0) {
            await changeState(secondParent.parentElement!.id as State);

            secondParent.scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else if (event.button === 2) {
            clicked.value = element.children[1].textContent!;

            element.innerHTML = `<span class="text-base"><code>${element.firstElementChild!.textContent!}</code>\n${windowLocalization.textReverted}\n<code>${element.children[1].textContent!}</code></span>`;
            element.setAttribute("reverted", "");

            const replacementLogContent: Record<string, { original: string; translation: string }> = JSON.parse(
                await readTextFile(join(settings.projectPath, programDataDir, logFile)),
            ) as Record<string, { original: string; translation: string }>;

            delete replacementLogContent[clicked.id];

            await writeTextFile(
                join(settings.projectPath, programDataDir, logFile),
                JSON.stringify(replacementLogContent),
            );
        }
    }

    function showSearchPanel(hide = true) {
        if (searchPanel.getAttribute("moving") === "false") {
            if (hide) {
                searchPanel.toggleMultiple("translate-x-0", "translate-x-full");
            } else {
                searchPanel.classList.replace("translate-x-full", "translate-x-0");
            }

            searchPanel.setAttribute("moving", "true");
        }

        let loadingContainer: HTMLDivElement | null = null;

        if (searchPanelFound.children.length > 0 && searchPanelFound.firstElementChild?.id !== "no-results") {
            loadingContainer = document.createElement("div");
            loadingContainer.className = tw`flex size-full items-center justify-center`;
            loadingContainer.innerHTML = searchPanel.classList.contains("translate-x-0")
                ? `<div class="text-4xl animate-spin font-material">refresh</div>`
                : "";

            searchPanelFound.appendChild(loadingContainer);
        }

        if (searchPanel.getAttribute("shown") === "false") {
            searchPanel.addEventListener(
                "transitionend",
                () => {
                    if (loadingContainer) {
                        searchPanelFound.removeChild(loadingContainer);
                    }

                    searchPanel.setAttribute("shown", "true");
                    searchPanel.setAttribute("moving", "false");
                },
                { once: true },
            );
        } else {
            if (searchPanel.classList.contains("translate-x-full")) {
                searchPanel.setAttribute("shown", "false");
                searchPanel.setAttribute("moving", "true");

                searchPanel.addEventListener(
                    "transitionend",
                    () => {
                        searchPanel.setAttribute("moving", "false");
                    },
                    {
                        once: true,
                    },
                );
                return;
            }

            if (loadingContainer) {
                searchPanelFound.removeChild(loadingContainer);
            }

            searchPanel.setAttribute("moving", "false");
        }
    }

    async function handleResultClick(button: number, elementId: string, resultElement: HTMLDivElement) {
        const [file, type, row] = elementId.split("-");

        if (button === 0) {
            await changeState(file as State);

            document.getElementById(elementId)!.parentElement?.parentElement?.scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else if (button === 2) {
            if (type.startsWith("o")) {
                alert(windowLocalization.originalTextIrreplacable);
                return;
            } else {
                if (replaceInput.value.trim()) {
                    const elementToReplace = document.getElementById(elementId);

                    let newText: string;

                    if (elementToReplace) {
                        newText = (await replaceText(elementToReplace as HTMLTextAreaElement))!;
                    } else {
                        const regexp: RegExp | undefined = await createRegExp(searchInput.value);
                        if (!regexp) {
                            return;
                        }

                        const normalizedFilename = file + ".txt";

                        const content = (
                            await readTextFile(
                                join(settings.projectPath, programDataDir, translationDir, normalizedFilename),
                            )
                        ).split("\n");

                        const lineToReplace = Number.parseInt(row) - 1;
                        const requiredLine = content[lineToReplace];
                        const [original, translated] = requiredLine.split(LINES_SEPARATOR);

                        const translatedReplaced = translated
                            .split(regexp)
                            .flatMap((part, i, arr) => [
                                part,
                                i < arr.length - 1 ? `<span class="bg-red-600">${replaceInput.value}</span>` : "",
                            ])
                            .join("");

                        content[lineToReplace] =
                            `${original}${LINES_SEPARATOR}${translatedReplaced.replaceAll(/<span(.*?)>|<\/span>/g, "")}`;

                        newText = translatedReplaced;

                        await writeTextFile(
                            join(settings.projectPath, programDataDir, translationDir, normalizedFilename),
                            content.join("\n"),
                        );
                    }

                    if (newText) {
                        saved = false;
                        resultElement.firstElementChild!.children[type.startsWith("o") ? 3 : 0].innerHTML = newText;
                    }
                }
            }
        }
    }

    async function handleResultSelecting(event: MouseEvent) {
        const target = event.target as HTMLDivElement;

        const resultElement = (
            target.parentElement?.hasAttribute("data")
                ? target.parentElement
                : target.parentElement?.parentElement?.hasAttribute("data")
                  ? target.parentElement.parentElement
                  : target.parentElement?.parentElement?.parentElement
        ) as HTMLDivElement;

        if (!searchPanelFound.contains(resultElement)) {
            return;
        }

        await handleResultClick(event.button, resultElement.getAttribute("data")!, resultElement);
    }

    async function displaySearchResults(text: string | null = null, hide = true) {
        if (!text) {
            showSearchPanel(hide);
            return;
        }

        text = text.trim();
        if (!text) {
            return;
        }

        const noMatches: null | undefined | Map<HTMLTextAreaElement, string> = await searchText(text, false);

        if (noMatches) {
            searchPanelFound.innerHTML = `<div id="no-results" class="flex justify-center items-center h-full">${windowLocalization.noMatches}</div>`;
            showSearchPanel(false);
            return;
        }

        observerFound.disconnect();
        searchPanelFound.style.height = `${searchPanelFound.scrollHeight}px`;

        for (const container of searchPanelFound.children as HTMLCollectionOf<HTMLDivElement>) {
            container.style.width = `${container.clientWidth}px`;
            container.style.height = `${container.clientHeight}px`;

            observerFound.observe(container);
        }

        for (const container of searchPanelFound.children as HTMLCollectionOf<HTMLDivElement>) {
            container.firstElementChild?.classList.add("hidden");
        }

        showSearchPanel(hide);

        searchPanelFound.removeEventListener("mousedown", handleResultSelecting);
        searchPanelFound.addEventListener("mousedown", handleResultSelecting);
    }

    async function updateLog() {
        const logFilePath = join(settings.projectPath, programDataDir, logFile);
        const prevFile = JSON.parse(await readTextFile(logFilePath)) as Record<string, Record<string, string>>;

        const newObject: Record<string, Record<string, string>> = {
            ...prevFile,
            ...replaced,
        };

        await writeTextFile(logFilePath, JSON.stringify(newObject));
        replaced = {};
    }

    async function replaceText(text: string | HTMLTextAreaElement): Promise<string | undefined> {
        if (text instanceof HTMLTextAreaElement) {
            const regexp: RegExp | undefined = await createRegExp(searchInput.value);
            if (!regexp) {
                return;
            }

            const replacerText: string = replaceInput.value;

            const newValue = text.value
                .split(regexp)
                .flatMap((part, i, arr) => [
                    part,
                    i < arr.length - 1 ? `<span class="bg-red-600">${replacerText}</span>` : "",
                ])
                .join("");

            replaced[text.id] = { original: text.value, translation: newValue };

            await updateLog();

            text.value = newValue.replaceAll(/<span(.*?)>|<\/span>/g, "");
            return newValue;
        } else {
            text = text.trim();
            if (!text) {
                return;
            }

            const results: null | undefined | Map<HTMLTextAreaElement, string> = await searchText(text, true);
            if (!results) {
                return;
            }

            const regexp: RegExp | undefined = await createRegExp(text);
            if (!regexp) {
                return;
            }

            for (const textarea of results.keys()) {
                if (!textarea.id.includes("original")) {
                    const newValue = textarea.value.replace(regexp, replaceInput.value);

                    replaced[textarea.id] = {
                        original: textarea.value,
                        translation: newValue,
                    };

                    textarea.value = newValue;
                }
            }

            await updateLog();
        }
    }

    async function save(mode: SaveMode) {
        if (saved || saving || !state || !settings.projectPath) {
            return;
        }

        saving = true;
        saveButton.firstElementChild!.classList.add("animate-spin");

        const translationPath = join(settings.projectPath, programDataDir, translationDir);
        const outputArray: string[] = [];

        for (const child of contentContainer.firstElementChild!.children) {
            const originalTextElement = child.firstElementChild!.children[1] as HTMLDivElement;
            const translatedTextElement = child.firstElementChild!.children[2] as HTMLTextAreaElement;

            outputArray.push(
                originalTextElement.textContent!.replaceAll("\n", NEW_LINE) +
                    LINES_SEPARATOR +
                    translatedTextElement.value.replaceAll("\n", NEW_LINE),
            );
        }

        if (state === State.System) {
            const originalTitle = currentGameTitle.getAttribute("original-title")!;
            const output =
                originalTitle +
                LINES_SEPARATOR +
                (originalTitle === currentGameTitle.value ? "" : currentGameTitle.value);

            outputArray.push(output);
        }

        const filePath = `${state}.txt`;

        await writeTextFile(
            state.startsWith("maps")
                ? join(settings.projectPath, programDataDir, "temp-maps", filePath)
                : join(translationPath, filePath),
            outputArray.join("\n"),
        );

        outputArray.length = 0;

        if (mode === SaveMode.Maps && state.startsWith("maps")) {
            const tempPath = join(settings.projectPath, programDataDir, "temp-maps");
            const entries = await readDir(tempPath);
            outputArray.length = entries.length;

            for (const entry of entries) {
                outputArray[Number.parseInt(entry.name.slice(4)) - 1] = await readTextFile(join(tempPath, entry.name));
            }

            await writeTextFile(join(translationPath, "maps.txt"), outputArray.join("\n"));
        }

        if (mode === SaveMode.Backup) {
            const date = new Date();
            const formattedDate = [
                date.getFullYear(),
                (date.getMonth() + 1).toString().padStart(2, "0"),
                date.getDate().toString().padStart(2, "0"),
                date.getHours().toString().padStart(2, "0"),
                date.getMinutes().toString().padStart(2, "0"),
                date.getSeconds().toString().padStart(2, "0"),
            ].join("-");

            nextBackupNumber = (nextBackupNumber % settings.backup.max) + 1;

            const backupFolderName = join(
                settings.projectPath,
                programDataDir,
                "backups",
                `${formattedDate}_${nextBackupNumber.toString().padStart(2, "0")}`,
            );

            await mkdir(backupFolderName, { recursive: true });
            await mkdir(join(backupFolderName, "temp-maps"));
            await mkdir(join(backupFolderName, translationDir));

            for (const entry of await readDir(translationPath)) {
                await copyFile(join(translationPath, entry.name), join(backupFolderName, translationDir, entry.name));
            }

            const tempMapsPath = join(settings.projectPath, programDataDir, "temp-maps");
            for (const entry of await readDir(tempMapsPath)) {
                await copyFile(join(tempMapsPath, entry.name), join(backupFolderName, "temp-maps", entry.name));
            }
        }

        if (mode !== SaveMode.Backup) {
            saved = true;
        }

        // Because we're saving only one file, it'll be extremely fast, and saveButton won't even be able to animate spin.
        // So we're waiting for the end of its spin, and only then remove this class
        setTimeout(() => {
            saveButton.firstElementChild!.classList.remove("animate-spin");
        }, 1000);

        saving = false;
    }

    function backup() {
        const intervalId = setInterval(async () => {
            if (settings.backup.enabled) {
                backupIsActive = true;
                await save(SaveMode.Backup);
            } else {
                backupIsActive = false;
                clearInterval(intervalId);
            }
        }, settings.backup.period * 1000);
    }

    async function changeState(newState: State | null) {
        if (state && state === newState) {
            return;
        }

        observerMain.disconnect();

        if (state) {
            await save(SaveMode.SingleFile);

            let totalFields = contentContainer.firstElementChild?.children.length;

            if (totalFields) {
                let translatedFields = 0;

                for (const child of contentContainer.firstElementChild!.children) {
                    const original = child.firstElementChild!.children[1] as HTMLDivElement;
                    const translation = child.firstElementChild!.children[2] as HTMLTextAreaElement;

                    if (original.textContent!.startsWith("<!--")) {
                        totalFields--;
                    } else if (translation.value) {
                        translatedFields++;
                    }
                }

                const percentage = Math.round((translatedFields / totalFields) * 100);

                for (const child of leftPanel.children) {
                    if (child.textContent!.startsWith(state)) {
                        const progressBar = child.lastElementChild?.firstElementChild as HTMLSpanElement | null;

                        if (progressBar) {
                            progressBar.style.width = progressBar.innerHTML = `${percentage}%`;
                        }
                        break;
                    }
                }
            }
        }

        contentContainer.firstElementChild?.remove();

        if (!newState) {
            state = null;
            currentState.innerHTML = "";
        } else {
            state = newState;

            // Have to recreate content each time
            await createContentForState(newState);

            currentState.innerHTML = newState;

            for (const child of contentContainer.firstElementChild!.children) {
                observerMain.observe(child);
            }
        }
    }

    function showGoToRowInput() {
        goToRowInput.classList.remove("hidden");
        goToRowInput.focus();

        const lastRow = contentContainer.firstElementChild!.lastElementChild!.id.split("-", 3).at(-1)!;

        goToRowInput.placeholder = `${windowLocalization.goToRow} ${lastRow}`;
    }

    function jumpToRow(key: "alt" | "ctrl") {
        const focusedElement = document.activeElement as HTMLElement;
        if (!contentContainer.contains(focusedElement) && focusedElement.tagName !== "TEXTAREA") {
            return;
        }

        const idParts = focusedElement.id.split("-", 3);
        const index = Number.parseInt(idParts.pop()!);

        if (Number.isNaN(index)) {
            return;
        }

        const step = key === "alt" ? 1 : -1;
        const nextElement = document.getElementById(
            `${idParts.join("-")}-${index + step}`,
        ) as HTMLTextAreaElement | null;

        if (!nextElement) {
            return;
        }

        window.scrollBy(0, step * nextElement.clientHeight);
        focusedElement.blur();
        nextElement.focus();
        nextElement.setSelectionRange(0, 0);
    }

    function handleGotoRowInputKeypress(event: KeyboardEvent) {
        if (event.code === "Enter") {
            const targetRow = document.getElementById(`${state!}-${goToRowInput.value}`) as HTMLTextAreaElement | null;

            if (targetRow) {
                targetRow.scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            }

            goToRowInput.value = "";
            goToRowInput.classList.add("hidden");
            goToRowInput.removeEventListener("keydown", handleGotoRowInputKeypress);
        } else if (event.code === "Escape") {
            goToRowInput.value = "";
            goToRowInput.classList.add("hidden");
            goToRowInput.removeEventListener("keydown", handleGotoRowInputKeypress);
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
            if (event.ctrlKey) {
                switch (event.code) {
                    case "KeyZ":
                        event.preventDefault();

                        for (const id of Object.keys(selectedTextareas)) {
                            const textarea = document.getElementById(id) as HTMLTextAreaElement;
                            textarea.value = selectedTextareas[id];
                        }

                        for (const id of Object.keys(replacedTextareas)) {
                            const textarea = document.getElementById(id) as HTMLTextAreaElement;
                            textarea.value = replacedTextareas[id];
                            textarea.calculateHeight();
                        }

                        replacedTextareas = {};
                        break;
                    case "KeyS":
                        await save(SaveMode.Maps);
                        break;
                    case "KeyG":
                        event.preventDefault();

                        if (state && goToRowInput.classList.contains("hidden")) {
                            showGoToRowInput();
                            goToRowInput.addEventListener("keydown", handleGotoRowInputKeypress);
                        } else if (!goToRowInput.classList.contains("hidden")) {
                            goToRowInput.classList.add("hidden");
                            goToRowInput.removeEventListener("keydown", handleGotoRowInputKeypress);
                        }
                        break;
                    case "KeyF":
                        event.preventDefault();

                        searchMenu.classList.replace("hidden", "flex");
                        searchInput.focus();
                        break;
                    case "KeyB":
                        bookmarksMenu.toggleMultiple("hidden", "flex");

                        requestAnimationFrame(() => {
                            bookmarksMenu.style.left = `${bookmarksButton.offsetLeft}px`;
                            bookmarksMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;
                        });
                        break;
                    case "Equal":
                        if (zoom < 7) {
                            await appWindow.setZoom((zoom += 0.1));
                        }
                        break;
                    case "Minus":
                        if (zoom > 0.1) {
                            await appWindow.setZoom((zoom -= 0.1));
                        }
                        break;
                }
            } else if (event.altKey) {
                switch (event.code) {
                    case "KeyC":
                        await compile(false);
                        break;
                    case "KeyR":
                        await createReadWindow();
                        break;
                    case "F4":
                        await appWindow.close();
                        break;
                }
            } else {
                switch (event.code) {
                    case "Escape":
                        await changeState(null);
                        break;
                    case "Tab":
                        leftPanel.toggleMultiple("translate-x-0", "-translate-x-full");
                        break;
                    case "KeyR":
                        await displaySearchResults();
                        break;
                    case "Digit1":
                        await changeState(State.Actors);
                        break;
                    case "Digit2":
                        await changeState(State.Armors);
                        break;
                    case "Digit3":
                        await changeState(State.Classes);
                        break;
                    case "Digit4":
                        await changeState(State.CommonEvents);
                        break;
                    case "Digit5":
                        await changeState(State.Enemies);
                        break;
                    case "Digit6":
                        await changeState(State.Items);
                        break;
                    case "Digit7":
                        await changeState(State.Skills);
                        break;
                    case "Digit8":
                        await changeState(State.States);
                        break;
                    case "Digit9":
                        await changeState(State.System);
                        break;
                    case "Digit0":
                        await changeState(State.Troops);
                        break;
                    case "Minus":
                        await changeState(State.Weapons);
                        break;
                }
            }
        } else {
            switch (event.code) {
                case "Escape":
                    if (document.activeElement) {
                        (document.activeElement as HTMLElement).blur();
                    }
                    break;
                case "Enter":
                    if (event.altKey) {
                        jumpToRow("alt");
                    } else if (event.ctrlKey) {
                        jumpToRow("ctrl");
                    }
                    break;
                case "KeyT":
                    if (event.ctrlKey) {
                        const selectedField = event.target as HTMLTextAreaElement;

                        if (!selectedField.value) {
                            if (!selectedField.placeholder) {
                                const counterpart = selectedField.parentElement!.children[1];

                                // Change hard-coded to and from values to user defined
                                const translated = await invokeTranslateText({
                                    text: counterpart.textContent!,
                                    to: "ru",
                                    from: "en",
                                });

                                selectedField.placeholder = translated;
                            } else {
                                selectedField.value = selectedField.placeholder;
                                selectedField.placeholder = "";
                            }
                        }
                        break;
                    }
            }
        }

        if (event.key === "Shift" && !event.repeat) {
            shiftPressed = true;
        }
    }

    async function handleSearchInputKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                searchInput.value += "\n";
                searchInput.calculateHeight();
            } else {
                if (searchInput.value.trim()) {
                    searchPanelFound.innerHTML = "";
                    await displaySearchResults(searchInput.value, false);
                }
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                searchInput.calculateHeight();
            });
        } else if (event.altKey) {
            switch (event.code) {
                case "KeyC":
                    searchCase = !searchCase;
                    searchCaseButton.classList.toggle("backgroundThird");
                    break;
                case "KeyW":
                    searchWhole = !searchWhole;
                    searchWholeButton.classList.toggle("backgroundThird");
                    break;
                case "KeyR":
                    searchRegex = !searchRegex;
                    searchRegexButton.classList.toggle("backgroundThird");
                    break;
                case "KeyL":
                    searchLocation = !searchLocation;
                    searchLocationButton.classList.toggle("backgroundThird");
                    break;
            }
        }
    }

    function handleReplaceInputKeypress(event: KeyboardEvent) {
        if (!settings.projectPath) {
            return;
        }

        if (event.code === "Enter") {
            event.preventDefault();

            if (event.ctrlKey) {
                replaceInput.value += "\n";
                replaceInput.calculateHeight();
            }
        } else if (event.code === "Backspace") {
            requestAnimationFrame(() => {
                replaceInput.calculateHeight();
            });
        }
    }

    function fromHTML(html: string): HTMLElement | HTMLCollection {
        const template = document.createElement("template");
        template.innerHTML = html;

        const result = template.content.children as HTMLCollectionOf<HTMLElement>;

        if (result.length === 1) {
            return result[0];
        }

        return result;
    }

    async function createContentForState(state: State) {
        let contentName = state.toString();
        let pathToContent = join(settings.projectPath, programDataDir, translationDir, contentName + ".txt");

        if (contentName.startsWith("maps")) {
            pathToContent = join(settings.projectPath, programDataDir, "temp-maps", `${contentName}.txt`);
        }

        if (contentName.startsWith("plugins") && !(await exists(pathToContent))) {
            if (await exists(join(settings.projectPath, programDataDir, translationDir, "scripts.txt"))) {
                contentName = "scripts";
                pathToContent = join(settings.projectPath, programDataDir, translationDir, contentName + ".txt");
                (leftPanel.lastElementChild as HTMLElement).innerHTML = State.Scripts;
            }
        }

        const content = (await readTextFile(pathToContent)).split("\n");

        const contentDiv = document.createElement("div");
        contentDiv.id = contentName;
        contentDiv.className = tw`flex-col`;

        if (contentName === "system") {
            content.pop();
        }

        let contentDivHeight = 0;

        for (let i = 0; i < content.length; i++) {
            const [originalText, translationText] = content[i].split(LINES_SEPARATOR, 2);
            const added = i + 1;

            const originalTextSplit = originalText.replaceAll(NEW_LINE, "\n");
            const translationTextSplit = translationText.split(NEW_LINE);

            const textParent = document.createElement("div");
            textParent.id = `${contentName}-${added}`;
            textParent.className = tw`h-auto w-full`;

            const textContainer = document.createElement("div");
            textContainer.className = tw`flex h-full flex-row justify-around py-[1px]`;

            const originalTextElement = document.createElement("div");
            originalTextElement.title = windowLocalization.originalTextFieldTitle;
            originalTextElement.id = `${contentName}-original-${added}`;
            originalTextElement.className = tw`outlinePrimary backgroundPrimary font inline-block w-full cursor-pointer whitespace-pre-wrap p-1 outline outline-2`;

            if (settings.fontUrl) {
                originalTextElement.style.fontFamily = "font";
            }

            originalTextElement.textContent = originalTextSplit;

            const translationTextElement = document.createElement("textarea");
            translationTextElement.id = `${contentName}-translation-${added}`;
            translationTextElement.rows = translationTextSplit.length;
            translationTextElement.className = tw`outlinePrimary outlineFocused backgroundPrimary font h-auto w-full resize-none overflow-hidden p-1 outline outline-2 focus:z-10`;
            translationTextElement.spellcheck = false;
            translationTextElement.autocomplete = "off";
            translationTextElement.autocapitalize = "off";
            translationTextElement.autofocus = false;

            if (settings.fontUrl) {
                translationTextElement.style.fontFamily = "font";
            }

            translationTextElement.value = translationTextSplit.join("\n");

            const rowElement = document.createElement("div");
            rowElement.id = `${contentName}-row-${added}`;
            rowElement.className = tw`outlinePrimary backgroundPrimary flex w-48 flex-row p-1 outline outline-2`;

            const spanElement = document.createElement("span");
            spanElement.textContent = (i + 1).toString();

            const innerDiv = document.createElement("div");
            innerDiv.className = tw`flex w-full items-start justify-end p-0.5`;

            const button = document.createElement("button");
            button.className = tw`borderPrimary backgroundPrimaryHovered textThird flex h-6 w-6 items-center justify-center rounded-md border-2 font-material text-xl`;
            button.textContent = "bookmark";

            innerDiv.appendChild(button);
            rowElement.appendChild(spanElement);
            rowElement.appendChild(innerDiv);

            originalTextElement.classList.add("text-lg");
            document.body.appendChild(originalTextElement);

            const { lineHeight, paddingTop } = window.getComputedStyle(originalTextElement);
            const minHeight =
                (originalTextElement.innerHTML.count("\n") + 1) * Number.parseInt(lineHeight) +
                Number.parseInt(paddingTop) * 2;

            document.body.removeChild(originalTextElement);
            originalTextElement.classList.remove("text-lg");

            rowElement.style.minHeight =
                originalTextElement.style.minHeight =
                translationTextElement.style.minHeight =
                textParent.style.minHeight =
                    `${minHeight}px`;

            // This 4 subtraction - is some kind of element size trickery and is required to truncate the contentDivHeight to the right height
            // Otherwise it overflows
            contentDivHeight += minHeight - 4;

            textContainer.appendChild(rowElement);
            textContainer.appendChild(originalTextElement);
            textContainer.appendChild(translationTextElement);
            textParent.appendChild(textContainer);
            contentDiv.appendChild(textParent);
        }

        contentDiv.style.minHeight = `${contentDivHeight}px`;
        contentContainer.appendChild(contentDiv);
    }

    async function compile(silent: boolean) {
        if (!settings.projectPath) {
            return;
        }

        const compileSettings: CompileSettings = JSON.parse(
            await readTextFile(join(settings.projectPath, programDataDir, "compile-settings.json")),
        ) as CompileSettings;

        if (!compileSettings.initialized || !compileSettings.doNotAskAgain || !silent) {
            const compileWindow = new WebviewWindow("compile", {
                url: "compile.html",
                title: windowLocalization.compileWindowTitle,
                center: true,
            });

            const compileUnlisten = await compileWindow.once("compile", async () => {
                await compile(true);
            });
            await compileWindow.once("tauri://destroyed", compileUnlisten);
        } else {
            compileButton.firstElementChild!.classList.add("animate-spin");

            let incorrectCompileSettings = false;

            if (typeof compileSettings.mapsProcessingMode !== "number") {
                compileSettings.mapsProcessingMode = 0;
                incorrectCompileSettings = true;
            }

            if (typeof compileSettings.romanize !== "boolean") {
                compileSettings.romanize = false;
                incorrectCompileSettings = true;
            }

            if (typeof compileSettings.disableCustomProcessing !== "boolean") {
                compileSettings.disableCustomProcessing = false;
                incorrectCompileSettings = true;
            }

            if (incorrectCompileSettings) {
                await writeTextFile(
                    join(settings.projectPath, programDataDir, "compile-settings.json"),
                    JSON.stringify(compileSettings),
                );
            }

            const executionTime = await invokeCompile({
                projectPath: settings.projectPath,
                originalDir,
                outputPath: compileSettings.customOutputPath.path,
                gameTitle: currentGameTitle.value,
                mapsProcessingMode: compileSettings.mapsProcessingMode,
                romanize: compileSettings.romanize,
                disableCustomProcessing: compileSettings.disableCustomProcessing,
                disableProcessing: Object.values(compileSettings.disableProcessing.of),
                engineType: settings.engineType!,
            });

            compileButton.firstElementChild!.classList.remove("animate-spin");
            alert(`${windowLocalization.compileSuccess} ${executionTime}`);
        }
    }

    function getNewLinePositions(textarea: HTMLTextAreaElement): { left: number; top: number }[] {
        const positions: { left: number; top: number }[] = [];
        const lines = textarea.value.split("\n");

        if (
            !textAreaPropertiesMemo.lineHeight ||
            !textAreaPropertiesMemo.padding ||
            !textAreaPropertiesMemo.fontSize ||
            !textAreaPropertiesMemo.fontFamily
        ) {
            const computedStyles = window.getComputedStyle(textarea);
            textAreaPropertiesMemo.lineHeight = Number.parseInt(computedStyles.lineHeight);
            textAreaPropertiesMemo.padding = Number.parseInt(computedStyles.paddingTop);
            textAreaPropertiesMemo.fontSize = computedStyles.fontSize;
            textAreaPropertiesMemo.fontFamily = computedStyles.fontFamily;
        }

        const { lineHeight, fontSize, fontFamily } = textAreaPropertiesMemo;

        const offsetTop = textarea.offsetTop;
        const offsetLeft = textarea.offsetLeft;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize} ${fontFamily}`;

        let top = offsetTop;

        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            const textWidth = context.measureText(`${line} `).width;
            const left = offsetLeft + textWidth;

            positions.push({ left, top });
            top += lineHeight;
        }

        return positions;
    }

    function trackFocus(focusedElement: Event) {
        for (const ghost of activeGhostLines) {
            ghost.remove();
        }

        const result = getNewLinePositions(focusedElement.target as HTMLTextAreaElement);

        for (const { left, top } of result) {
            const ghostNewLine = fromHTML(
                `<div class="z-50 cursor-default pointer-events-none select-none absolute textThird" style="left: ${left}px; top: ${top}px">\\n</div>`,
            ) as HTMLDivElement;

            activeGhostLines.push(ghostNewLine);
            document.body.appendChild(ghostNewLine);
        }
    }

    function calculateHeight(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        const lineBreaks = target.value.split("\n").length;

        if (textAreaPropertiesMemo.lineBreaks === lineBreaks) {
            return;
        }

        textAreaPropertiesMemo.lineBreaks = lineBreaks;

        if (!textAreaPropertiesMemo.lineHeight || !textAreaPropertiesMemo.padding) {
            const computedStyles = window.getComputedStyle(target);
            textAreaPropertiesMemo.lineHeight = Number.parseInt(computedStyles.lineHeight);
            textAreaPropertiesMemo.padding = Number.parseInt(computedStyles.paddingTop);
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
            contentContainer.contains(target) &&
            target.tagName === "TEXTAREA" &&
            target.id !== currentFocusedElement[0]
        ) {
            currentFocusedElement = [target.id, target.value];

            target.addEventListener("keyup", calculateHeight);
            target.addEventListener("input", trackFocus);

            trackFocus(event);
        }
    }

    function handleBlur(event: FocusEvent) {
        const target = event.target as HTMLTextAreaElement;

        for (const ghost of activeGhostLines) {
            ghost.remove();
        }

        if (target.id == currentFocusedElement[0]) {
            if (saved && currentFocusedElement[1] !== target.value) {
                saved = false;
            }

            currentFocusedElement.length = 0;

            if (contentContainer.contains(target) && target.tagName === "TEXTAREA") {
                target.removeEventListener("keyup", calculateHeight);
                target.removeEventListener("input", trackFocus);
            }
        }
    }

    async function loadFont(fontUrl: string) {
        if (fontUrl) {
            const font = await new FontFace("font", `url(${fontUrl})`).load();
            document.fonts.add(font);

            textAreaPropertiesMemo.fontFamily = "font";

            for (const element of document.querySelectorAll(".font")) {
                (element as HTMLTextAreaElement).style.fontFamily = "font";
            }
        } else {
            textAreaPropertiesMemo.fontFamily = document.body.style.fontFamily;

            for (const element of document.querySelectorAll(".font")) {
                (element as HTMLTextAreaElement).style.fontFamily = "";
            }
        }
    }

    async function createSettingsWindow() {
        const settingsWindow = new WebviewWindow("settings", {
            url: "settings.html",
            title: windowLocalization.settingsButtonTitle,
            center: true,
            resizable: false,
        });

        const settingsUnlisten = await settingsWindow.once<
            [boolean, number, number, Intl.UnicodeBCP47LocaleIdentifier, Intl.UnicodeBCP47LocaleIdentifier, string]
        >("get-settings", async (data) => {
            const [enabled, max, period, from, to, fontUrl] = data.payload;

            if (enabled && !backupIsActive) {
                backup();
            }

            settings.backup.enabled = enabled;
            settings.backup.max = max;
            settings.backup.period = period;
            settings.from = from;
            settings.to = to;
            settings.fontUrl = fontUrl;

            await loadFont(fontUrl);
        });

        await settingsWindow.once("tauri://destroyed", settingsUnlisten);
    }

    async function exitConfirmation(): Promise<boolean> {
        let askExitUnsaved: boolean;
        if (saved) {
            askExitUnsaved = true;
        } else {
            askExitUnsaved = await ask(windowLocalization.unsavedChanges);
        }

        let askExit: boolean;
        if (!askExitUnsaved) {
            askExit = await ask(windowLocalization.exit);
        } else {
            await save(SaveMode.Maps);
            return true;
        }

        if (!askExit) {
            return false;
        } else {
            return true;
        }
    }

    async function handleFileMenuClick(event: Event) {
        const target = event.target as HTMLElement;
        fileMenu.classList.replace("flex", "hidden");

        switch (target.id) {
            case "reload-button":
                await waitForSave();

                if (await exitConfirmation()) {
                    await writeTextFile(settingsPath, JSON.stringify(settings), { baseDir: Resource });
                    location.reload();
                }
                break;
        }
    }

    function handleHelpMenuClick(event: MouseEvent) {
        helpMenu.classList.replace("flex", "hidden");
        const target = event.target as HTMLElement;

        switch (target.id) {
            case "help-button":
                new WebviewWindow("help", {
                    url: "help.html",
                    title: windowLocalization.helpButton,
                    center: true,
                });
                break;
            case "about-button":
                new WebviewWindow("about", {
                    url: "about.html",
                    title: windowLocalization.aboutButton,
                    center: true,
                    resizable: false,
                });
                break;
        }
    }

    function handleLanguageMenuClick(event: MouseEvent) {
        languageMenu.classList.replace("flex", "hidden");
        const target = event.target as HTMLElement;

        switch (target.id) {
            case "ru-button":
                if (settings.language !== Language.Russian) {
                    setLanguage(Language.Russian);
                }
                break;
            case "en-button":
                if (settings.language !== Language.English) {
                    setLanguage(Language.English);
                }
                break;
        }
    }

    function handleMenuBarClick(event: MouseEvent) {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case fileMenuButton.id:
                fileMenu.toggleMultiple("hidden", "flex");
                helpMenu.classList.replace("flex", "hidden");
                languageMenu.classList.replace("flex", "hidden");

                fileMenu.style.top = `${fileMenuButton.offsetTop + fileMenuButton.offsetHeight}px`;
                fileMenu.style.left = `${fileMenuButton.offsetLeft}px`;

                fileMenu.addEventListener(
                    "click",
                    async (event) => {
                        await handleFileMenuClick(event);
                    },
                    {
                        once: true,
                    },
                );
                break;
            case helpMenuButton.id:
                helpMenu.toggleMultiple("hidden", "flex");
                fileMenu.classList.replace("flex", "hidden");
                languageMenu.classList.replace("flex", "hidden");

                helpMenu.style.top = `${helpMenuButton.offsetTop + helpMenuButton.offsetHeight}px`;
                helpMenu.style.left = `${helpMenuButton.offsetLeft}px`;

                helpMenu.addEventListener(
                    "click",
                    (event) => {
                        handleHelpMenuClick(event);
                    },
                    {
                        once: true,
                    },
                );
                break;
            case languageMenuButton.id:
                languageMenu.toggleMultiple("hidden", "flex");
                helpMenu.classList.replace("flex", "hidden");
                fileMenu.classList.replace("flex", "hidden");

                languageMenu.style.top = `${languageMenuButton.offsetTop + languageMenuButton.offsetHeight}px`;
                languageMenu.style.left = `${languageMenuButton.offsetLeft}px`;

                languageMenu.addEventListener(
                    "click",
                    (event) => {
                        handleLanguageMenuClick(event);
                    },
                    {
                        once: true,
                    },
                );
                break;
        }
    }

    async function waitForSave() {
        while (saving) {
            await new Promise((resolve) => setTimeout(resolve, 200));
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

    function initializeLocalization() {
        applyLocalization(windowLocalization, theme);

        for (const div of themeWindow.children[1].children) {
            for (const subdiv of div.children) {
                const label = subdiv.lastElementChild as HTMLLabelElement;
                // @ts-expect-error object can be indexed by string fuck off
                label.innerHTML = windowLocalization[subdiv.firstElementChild?.id];
            }
        }
    }

    async function loadProject() {
        const translationPath = join(settings.projectPath, programDataDir, translationDir);
        const parsed = await exists(translationPath);

        if (!parsed) {
            await mkdir(translationPath, { recursive: true });
            let gameTitle!: string;

            if (settings.engineType === EngineType.New) {
                gameTitle = (
                    JSON.parse(await readTextFile(join(settings.projectPath, originalDir, "System.json"))) as {
                        gameTitle: string;
                    }
                ).gameTitle;
            } else {
                const iniFileContent = (await readTextFile(join(settings.projectPath, "Game.ini"))).split("\n");

                for (const line of iniFileContent) {
                    if (line.toLowerCase().startsWith("title")) {
                        gameTitle = line.split("=", 2)[1].trim();
                    }
                }
            }

            await invokeRead({
                projectPath: settings.projectPath,
                originalDir,
                gameTitle,
                mapsProcessingMode: 0,
                romanize: false,
                disableCustomProcessing: false,
                disableProcessing: [false, false, false, false],
                processingMode: ProcessingMode.Default,
                engineType: settings.engineType!,
            });
        }
    }

    async function initializeProject(pathToProject: string) {
        await invokeAddToScope({ window: appWindow, path: pathToProject });

        projectStatus.innerHTML = windowLocalization.loadingProject;
        const interval = animateProgressText(projectStatus);

        const projectIsValid = await ensureProjectIsValid(pathToProject);

        if (!projectIsValid) {
            settings.projectPath = "";
            projectStatus.innerHTML = windowLocalization.noProjectSelected;
        } else {
            settings.projectPath = pathToProject;

            // Create program data directory
            const programDataDirPath = join(settings.projectPath, programDataDir);
            await invokeAddToScope({ window: appWindow, path: programDataDirPath });

            if (!(await exists(programDataDirPath))) {
                await mkdir(programDataDirPath);
            }

            await loadProject();

            const translationFiles = await readDir(join(settings.projectPath, programDataDir, translationDir));
            leftPanel.innerHTML = "";

            for (const entry of translationFiles) {
                const name = entry.name;
                if (!name.endsWith(".txt")) {
                    continue;
                }

                if (name.startsWith("maps")) {
                    const mapsLines = (
                        await readTextFile(join(settings.projectPath, programDataDir, translationDir, name))
                    ).split("\n");

                    const result: string[] = [];
                    let i = 1;

                    await mkdir(join(settings.projectPath, programDataDir, "temp-maps"), { recursive: true });

                    for (let l = 0; l <= mapsLines.length; l++) {
                        const line = mapsLines[l];

                        if (l === mapsLines.length || line.startsWith("<!-- Map")) {
                            if (!result.length) {
                                result.push(line);
                                continue;
                            }

                            const joined = result.join("\n");
                            await writeTextFile(
                                join(settings.projectPath, programDataDir, "temp-maps", `maps${i}.txt`),
                                joined,
                            );

                            const buttonElement = document.createElement("button");
                            buttonElement.className = "menu-button backgroundPrimary backgroundPrimaryHovered";

                            const mapsNumberSpan = document.createElement("span");
                            mapsNumberSpan.innerHTML = `maps${i}`;
                            mapsNumberSpan.className = "pr-1";
                            buttonElement.appendChild(mapsNumberSpan);

                            if (result.length <= 1) {
                                buttonElement.classList.replace("backgroundPrimary", "bg-red-600");
                            }

                            let totalLines = result.length;
                            let translatedLines = 0;

                            for (const line of result) {
                                if (line.startsWith("<!--")) {
                                    totalLines--;
                                } else if (!line.endsWith(LINES_SEPARATOR)) {
                                    translatedLines++;
                                }
                            }

                            if (totalLines > 0) {
                                const translatedRatio = Math.round((translatedLines / totalLines) * 100);
                                const progressBar = document.createElement("div");
                                const progressMeter = document.createElement("div");

                                progressBar.className = tw`backgroundSecond w-full rounded-sm`;
                                progressMeter.className = tw`backgroundThird textPrimary rounded-sm p-0.5 text-center text-xs font-medium leading-none`;
                                progressMeter.style.width = progressMeter.textContent = `${translatedRatio}%`;

                                progressBar.appendChild(progressMeter);
                                buttonElement.appendChild(progressBar);
                            }

                            leftPanel.insertBefore(buttonElement, leftPanel.children[i]);

                            result.length = 0;
                            result.push(line);
                            i++;
                        } else {
                            result.push(line);
                        }
                    }
                } else {
                    const content = await readTextFile(
                        join(settings.projectPath, programDataDir, translationDir, entry.name),
                    );
                    const split = content.split("\n");

                    const buttonElement = document.createElement("button");
                    buttonElement.className = "menu-button backgroundPrimary backgroundPrimaryHovered";

                    const stateSpan = document.createElement("span");
                    stateSpan.innerHTML = entry.name.slice(0, -4);
                    stateSpan.className = "pr-1";
                    buttonElement.appendChild(stateSpan);

                    let totalLines = split.length;
                    let translatedLines = 0;

                    for (const line of split) {
                        if (line.startsWith("<!--")) {
                            totalLines--;
                        } else if (!line.endsWith(LINES_SEPARATOR)) {
                            translatedLines++;
                        }
                    }

                    if (totalLines > 0) {
                        const translatedRatio = Math.round((translatedLines / totalLines) * 100);
                        const progressBar = document.createElement("div");
                        const progressMeter = document.createElement("div");

                        progressBar.className = tw`backgroundSecond w-full rounded-sm`;
                        progressMeter.className = tw`backgroundThird textPrimary rounded-sm p-0.5 text-center text-xs font-medium leading-none`;
                        progressMeter.style.width = progressMeter.textContent = `${translatedRatio}%`;

                        progressBar.appendChild(progressMeter);
                        buttonElement.appendChild(progressBar);
                    }

                    leftPanel.appendChild(buttonElement);
                }
            }

            // Create log file
            const logFilePath = join(settings.projectPath, programDataDir, logFile);
            if (!(await exists(logFilePath))) {
                await writeTextFile(logFilePath, "{}");
            }

            // Create compile settings
            const compileSettingsPath = join(settings.projectPath, programDataDir, "compile-settings.json");
            if (!(await exists(compileSettingsPath))) {
                await writeTextFile(compileSettingsPath, JSON.stringify(new CompileSettings()));
            }

            // Initialize themes
            for (const themeName of Object.keys(themes)) {
                const themeButton = document.createElement("button");
                themeButton.id = themeButton.innerHTML = themeName;
                themeButton.className = tw`backgroundPrimary backgroundPrimaryHovered p-2 text-base`;

                themeMenu.insertBefore(themeButton, createThemeMenuButton);
            }

            const backupPath = join(programDataDirPath, "backups");
            if (!(await exists(backupPath))) {
                await mkdir(backupPath);
            }

            nextBackupNumber = (await readDir(backupPath))
                .map((entry) => Number.parseInt(entry.name.slice(0, -2)))
                .sort((a, b) => a - b)[0];

            if (!nextBackupNumber) {
                nextBackupNumber = 0;
            }

            if (settings.backup.enabled) {
                backup();
            }

            if (settings.firstLaunch) {
                new WebviewWindow("help", {
                    url: "help.html",
                    title: windowLocalization.helpButton,
                    center: true,
                    alwaysOnTop: true,
                });

                settings.firstLaunch = false;
            }

            const [originalTitle, translatedTitle] = (
                await invokeReadLastLine({
                    filePath: join(settings.projectPath, programDataDir, translationDir, "system.txt"),
                })
            ).split(LINES_SEPARATOR);

            currentGameTitle.setAttribute("original-title", originalTitle);

            if (translatedTitle) {
                currentGameTitle.value = translatedTitle;
            } else {
                currentGameTitle.value = originalTitle;
            }

            if (projectStatus.textContent) {
                projectStatus.innerHTML = "";
            }
        }

        clearInterval(interval);
    }

    async function createReadWindow() {
        const readWindow = new WebviewWindow("read", {
            title: windowLocalization.readWindowTitle,
            url: "read.html",
            center: true,
        });

        const unlistenRestart = await readWindow.once("restart", async () => {
            await writeTextFile(settingsPath, JSON.stringify(settings), { baseDir: Resource });
            location.reload();
        });

        const unlistenFetch = await readWindow.once("fetch", async () => {
            await emit("metadata", [currentGameTitle.getAttribute("original-title")!, settings.engineType]);
        });

        await readWindow.once("tauri://destroyed", () => {
            unlistenRestart();
            unlistenFetch();
        });
    }

    leftPanel.addEventListener("click", async (event) => {
        await changeState(
            leftPanel.secondHighestParent(event.target as HTMLElement).firstElementChild!.textContent as State,
        );
    });

    function wrapText(text: string, width: number): string {
        const lines = text.split("\n");
        const remainder: string[] = [];
        const wrappedLines: string[] = [];

        for (let line of lines) {
            if (remainder.length) {
                line = `${remainder.join(" ")} ${line}`;
                remainder.length = 0;
            }

            if (line.length > width) {
                const words = line.split(" ");

                while (words.join(" ").length > width) {
                    remainder.unshift(words.pop()!);
                }

                wrappedLines.push(words.join(" "));
            } else {
                wrappedLines.push(line);
            }
        }

        if (remainder.length) {
            wrappedLines.push(remainder.join(" "));
        }

        return wrappedLines.join("\n");
    }

    topPanelButtonsContainer.addEventListener("click", async (event) => {
        const target = topPanelButtonsContainer.secondHighestParent(event.target as HTMLElement);

        if ((!settings.projectPath && target.id !== "open-directory-button") || target === topPanelButtonsContainer) {
            return;
        }

        switch (target.id) {
            case "menu-button":
                leftPanel.toggleMultiple("translate-x-0", "-translate-x-full");
                break;
            case saveButton.id:
                await save(SaveMode.Maps);
                break;
            case "compile-button":
                if (clickTimer === null) {
                    clickTimer = setTimeout(async () => {
                        clickTimer = null;
                        await compile(true);
                    }, 250);
                } else {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    await compile(false);
                }
                break;
            case "open-directory-button":
                await openDirectory();
                break;
            case "settings-button":
                await createSettingsWindow();
                break;
            case themeButton.id:
                themeMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    themeMenu.style.left = `${themeButton.offsetLeft}px`;
                    themeMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;

                    themeMenu.addEventListener("click", (event: MouseEvent) => {
                        const target = event.target as HTMLButtonElement;

                        if (!themeMenu.contains(target)) {
                            return;
                        }

                        if (target.id === "create-theme-menu-button") {
                            showThemeWindow();
                            return;
                        }

                        setTheme(themes[target.id]);
                    });
                });
                break;
            case bookmarksButton.id:
                bookmarksMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    bookmarksMenu.style.left = `${bookmarksButton.offsetLeft}px`;
                    bookmarksMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;
                });
                break;
            case "read-button":
                await createReadWindow();
                break;
            case "search-button":
                if (searchMenu.classList.contains("hidden")) {
                    searchMenu.classList.remove("hidden");
                    requestAnimationFrame(() => {
                        searchMenu.style.left = `${searchButton.offsetLeft}px`;
                        searchMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;
                    });
                } else {
                    searchMenu.classList.add("hidden");
                }
                break;
            case toolsButton.id:
                if (!state) {
                    return;
                }

                toolsMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    toolsMenu.style.left = `${toolsButton.offsetLeft}px`;
                    toolsMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;

                    toolsMenu.addEventListener("click", async (event: MouseEvent) => {
                        const target = event.target as HTMLButtonElement;

                        if (!toolsMenu.contains(target)) {
                            return;
                        }

                        // TODO: Each button should open the popup for user to configure the action.
                        // For example, if user wants to trim the text in all files' fields, they should be able to select all fields.
                        // And, for example, for trim, they should be able to select the trim mode (left, right, both).
                        switch (target.id) {
                            case "trim-tools-menu-button":
                                for (const element of contentContainer.firstElementChild!.children) {
                                    const translationField = element.firstElementChild!
                                        .lastElementChild as HTMLTextAreaElement;
                                    translationField.value = translationField.value.trim();
                                }
                                break;
                            case "translate-tools-menu-button":
                                for (const element of contentContainer.firstElementChild!.children) {
                                    const children = element.firstElementChild!.children;
                                    const originalField = children[1] as HTMLDivElement;
                                    const translationField = children[2] as HTMLTextAreaElement;

                                    if (!settings.from || !settings.to) {
                                        alert(windowLocalization.translationLanguagesNotSelected);
                                        return;
                                    }

                                    const translated = await invokeTranslateText({
                                        text: originalField.textContent!,
                                        from: settings.from,
                                        to: settings.to,
                                    });

                                    translationField.value = translated;
                                }
                                break;
                            case "wrap-tools-menu-button":
                                {
                                    const wrapNumberInput = document.createElement("input");
                                    wrapNumberInput.className = tw`input backgroundPrimary textPrimary h-10 w-48 text-base`;
                                    wrapNumberInput.placeholder = "Number of characters";
                                    wrapNumberInput.style.position = "fixed";

                                    const { x, y } = toolsMenu.lastElementChild!.getBoundingClientRect();
                                    wrapNumberInput.style.left = `${x + toolsMenu.lastElementChild!.clientWidth}px`;
                                    wrapNumberInput.style.top = `${y}px`;
                                    wrapNumberInput.style.zIndex = "50";
                                    wrapNumberInput.onkeydown = (event) => {
                                        if (event.key === "Enter") {
                                            for (const element of contentContainer.firstElementChild!.children) {
                                                const translation = element.firstElementChild!
                                                    .lastElementChild as HTMLTextAreaElement;

                                                translation.value = wrapText(
                                                    translation.value,
                                                    Number.parseInt(wrapNumberInput.value),
                                                );

                                                translation.calculateHeight();
                                            }

                                            wrapNumberInput.remove();
                                        }
                                    };

                                    document.body.appendChild(wrapNumberInput);
                                }
                                break;
                        }
                    });
                });

                break;
        }
    });

    searchPanel.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case "switch-search-content":
                {
                    searchPanelFound.toggleMultiple("hidden", "flex");
                    searchPanelReplaced.toggleMultiple("hidden", "flex");

                    const searchSwitch = target;

                    if (searchSwitch.innerHTML.trim() === "search") {
                        searchSwitch.innerHTML = "menu_book";

                        const replacementLogContent: Record<string, { original: string; translation: string }> =
                            JSON.parse(
                                await readTextFile(join(settings.projectPath, programDataDir, logFile)),
                            ) as Record<string, { original: string; translation: string }>;

                        for (const [key, value] of Object.entries(replacementLogContent)) {
                            const replacedContainer = document.createElement("div");

                            const replacedElement = document.createElement("div");
                            replacedElement.className = tw`textSecond borderPrimary backgroundSecond my-1 cursor-pointer border-2 p-1 text-xl`;

                            replacedElement.innerHTML = `<div class="text-base textThird">${key}</div><div class=text-base>${value.original}</div><div class="flex justify-center items-center text-xl textPrimary font-material">arrow_downward</div><div class="text-base">${value.translation}</div>`;

                            replacedContainer.appendChild(replacedElement);
                            searchPanelReplaced.appendChild(replacedContainer);
                        }

                        observerFound.disconnect();
                        searchPanelReplaced.style.height = `${searchPanelReplaced.scrollHeight}px`;

                        for (const container of searchPanelReplaced.children as HTMLCollectionOf<HTMLElement>) {
                            container.style.width = `${container.clientWidth}px`;
                            container.style.height = `${container.clientHeight}px`;

                            observerReplaced.observe(container);
                            container.firstElementChild?.classList.add("hidden");
                        }

                        searchPanelReplaced.addEventListener("mousedown", handleReplacedClick);
                    } else {
                        searchSwitch.innerHTML = "search";
                        searchPanelReplaced.innerHTML = "";

                        searchPanelReplaced.removeEventListener("mousedown", handleReplacedClick);
                    }
                }
                break;
            case "previous-page-button": {
                const page = Number.parseInt(searchCurrentPage.textContent!);

                if (page > 0) {
                    searchCurrentPage.textContent = (page - 1).toString();
                    searchPanelFound.innerHTML = "";

                    const matches = JSON.parse(
                        await readTextFile(
                            join(settings.projectPath, programDataDir, `matches-${searchCurrentPage.textContent}.json`),
                        ),
                    ) as object;

                    for (const [id, result] of Object.entries(matches)) {
                        appendMatch(id, result as string);
                    }
                }
                break;
            }
            case "next-page-button": {
                const page = Number.parseInt(searchCurrentPage.textContent!);

                if (page < Number.parseInt(searchTotalPages.textContent!)) {
                    searchCurrentPage.textContent = (page + 1).toString();
                    searchPanelFound.innerHTML = "";

                    const matches = JSON.parse(
                        await readTextFile(
                            join(settings.projectPath, programDataDir, `matches-${searchCurrentPage.textContent}.json`),
                        ),
                    ) as object;

                    for (const [id, result] of Object.entries(matches)) {
                        appendMatch(id, result as string);
                    }
                }
                break;
            }
        }
    });

    searchInput.addEventListener("focus", () => {
        searchInput.addEventListener("change", calculateHeight);
        searchInput.addEventListener("keydown", handleSearchInputKeypress);

        searchInput.addEventListener("blur", () => {
            searchInput.value = searchInput.value.trim();
            searchInput.removeEventListener("keydown", handleSearchInputKeypress);
            searchInput.removeEventListener("change", calculateHeight);
            searchInput.calculateHeight();
        });
    });

    replaceInput.addEventListener("focus", () => {
        replaceInput.addEventListener("keydown", handleReplaceInputKeypress);
        replaceInput.addEventListener("change", calculateHeight);

        replaceInput.addEventListener("blur", () => {
            replaceInput.value = replaceInput.value.trim();
            replaceInput.removeEventListener("keydown", handleReplaceInputKeypress);
            replaceInput.removeEventListener("change", calculateHeight);
            replaceInput.calculateHeight();
        });
    });

    menuBar.addEventListener("click", (event) => {
        handleMenuBarClick(event);
    });

    document.body.addEventListener("keydown", handleKeypress);
    document.body.addEventListener("keyup", (event) => {
        if (event.key === "Shift") {
            shiftPressed = false;
        }
    });

    contentContainer.addEventListener("focus", handleFocus, true);
    contentContainer.addEventListener("blur", handleBlur, true);
    contentContainer.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        if (target.id.includes("original")) {
            await navigator.clipboard.writeText(target.textContent!);
        }
    });

    searchMenu.addEventListener("click", async (event) => {
        if (!settings.projectPath) {
            return;
        }

        const target = event.target as HTMLElement;

        switch (target.id) {
            case "replace-button":
                if (searchInput.value.trim() && replaceInput.value.trim()) {
                    await replaceText(searchInput.value);
                }
                break;
            case "case-button":
                searchCase = !searchCase;
                searchCaseButton.classList.toggle("backgroundThird");
                break;
            case "whole-button":
                searchWhole = !searchWhole;
                searchWholeButton.classList.toggle("backgroundThird");
                break;
            case "regex-button":
                searchRegex = !searchRegex;
                searchRegexButton.classList.toggle("backgroundThird");
                break;
            case "location-button":
                searchLocation = !searchLocation;
                searchLocationButton.classList.toggle("backgroundThird");
                break;
        }
    });

    contentContainer.addEventListener("mousedown", handleMousedown);
    contentContainer.addEventListener("paste", (event) => {
        const text = event.clipboardData?.getData("text/plain");

        if (
            contentContainer.contains(document.activeElement) &&
            document.activeElement?.tagName === "TEXTAREA" &&
            text?.includes("\\\\#")
        ) {
            event.preventDefault();
            const clipboardTextSplit = text.split("\\\\#");
            const textRows = clipboardTextSplit.length;

            if (textRows < 1) {
                return;
            } else {
                const focusedElement = document.activeElement as HTMLElement;
                const focusedElementId = focusedElement.id.split("-");
                const focusedElementNumber = Number.parseInt(focusedElementId.pop()!);

                for (let i = 0; i < textRows; i++) {
                    const elementToReplace = document.getElementById(
                        `${focusedElementId.join("-")}-${focusedElementNumber + i}`,
                    ) as HTMLTextAreaElement;

                    replacedTextareas[elementToReplace.id] = elementToReplace.value.replaceAll(text, "");
                    elementToReplace.value = clipboardTextSplit[i];
                    elementToReplace.calculateHeight();
                }

                saved = false;
            }
        }
    });

    contentContainer.addEventListener("copy", (event) => {
        if (
            multipleTextAreasSelected &&
            contentContainer.contains(document.activeElement) &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            selectedTextareas[document.activeElement.id] = (document.activeElement as HTMLTextAreaElement).value;
            event.clipboardData?.setData("text/plain", Array.from(Object.values(selectedTextareas)).join("\\\\#"));
        }
    });

    bookmarksMenu.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        if (target.id === bookmarksMenu.id) {
            return;
        }

        const parts = target.textContent!.split("-", 2);
        const rowId = `${parts[0]}-row-${parts[1]}`;

        await changeState(parts[0] as State);
        (document.getElementById(rowId) as HTMLDivElement).scrollIntoView({
            inline: "center",
            block: "center",
        });
    });

    contentContainer.addEventListener("cut", (event) => {
        if (
            multipleTextAreasSelected &&
            contentContainer.contains(document.activeElement) &&
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            event.preventDefault();
            event.clipboardData?.setData("text/plain", Array.from(Object.values(selectedTextareas)).join("\\\\#"));

            for (const key of Object.keys(selectedTextareas)) {
                const textarea = document.getElementById(key) as HTMLTextAreaElement;
                textarea.value = "";
            }

            saved = false;
        }
    });

    await listen("fetch-settings", async () => {
        await emit("settings", [settings, theme]);
    });

    async function cleanup() {
        const dataDirEntries = await readDir(join(settings.projectPath, programDataDir));

        for (const entry of dataDirEntries) {
            const name = entry.name;

            if (name === "temp-maps") {
                await removePath(join(settings.projectPath, programDataDir, "temp-maps"), { recursive: true });
            } else if (entry.isFile && !["compile-settings.json", "replacement-log.json"].includes(name)) {
                await removePath(join(settings.projectPath, programDataDir, name));
            }
        }
    }

    await appWindow.onCloseRequested(async (event) => {
        await waitForSave();
        await cleanup();

        if (await exitConfirmation()) {
            await writeTextFile(settingsPath, JSON.stringify(settings), { baseDir: Resource });
            await exit();
        } else {
            event.preventDefault();
        }
    });
});
