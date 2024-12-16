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
    addToScope,
    appendToEnd,
    compile,
    escapeText,
    extractArchive,
    read,
    readLastLine,
    translateText,
} from "./extensions/invokes";
import { MainWindowLocalization } from "./extensions/localization";
import "./extensions/string-extensions";
import {
    EngineType,
    FilesAction,
    JumpDirection,
    Language,
    ProcessingMode,
    RowDeleteMode,
    SaveMode,
    SearchMode,
} from "./types/enums";

import { getVersion } from "@tauri-apps/api/app";
import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask, message, open as openPath } from "@tauri-apps/plugin-dialog";
import {
    BaseDirectory,
    copyFile,
    exists,
    mkdir,
    readDir,
    readTextFile,
    readTextFileLines,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { attachConsole } from "@tauri-apps/plugin-log";
import { locale as getLocale } from "@tauri-apps/plugin-os";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { check as checkVersion } from "@tauri-apps/plugin-updater";
const { Resource } = BaseDirectory;
const appWindow = getCurrentWebviewWindow();

import XRegExp from "xregexp";

document.addEventListener("DOMContentLoaded", async () => {
    await attachConsole();
    const tw = (strings: TemplateStringsArray, ...values: string[]): string => String.raw({ raw: strings }, ...values);

    // #region Static constants
    const NEW_LINE = "\\#";
    const LINES_SEPARATOR = "<#>";
    const sheet = getThemeStyleSheet()!;

    const programDataDir = ".rpgmtranslate";

    const translationDir = "translation";
    const tempMapsDir = "temp-maps";

    const logFile = "replacement-log.json";
    const bookmarksFile = "bookmarks.json";

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
    const topPanelButtonsDiv = topPanel.firstElementChild! as HTMLDivElement;
    const saveButton = topPanelButtonsDiv.children[1] as HTMLButtonElement;
    const compileButton = topPanelButtonsDiv.children[2] as HTMLButtonElement;
    const themeButton = topPanelButtonsDiv.children[5] as HTMLButtonElement;
    const themeMenu = topPanelButtonsDiv.children[6] as HTMLDivElement;
    const toolsButton = topPanelButtonsDiv.children[10] as HTMLButtonElement;
    const toolsMenu = topPanelButtonsDiv.children[11] as HTMLDivElement;
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
    const currentProgressMeter = document.getElementById("current-progress-meter") as HTMLDivElement;
    const currentGameEngine = document.getElementById("current-game-engine") as HTMLDivElement;
    const currentGameTitle = document.getElementById("current-game-title") as HTMLInputElement;
    const selectFilesWindow = document.getElementById("select-files-window") as HTMLDivElement;
    // #endregion

    // #region Program initialization
    let windowLocalization!: MainWindowLocalization;

    let settings: Settings = (await exists(settingsPath, { baseDir: Resource }))
        ? (JSON.parse(await readTextFile(settingsPath, { baseDir: Resource })) as Settings)
        : (await createSettings())!;

    const themes = JSON.parse(await readTextFile("res/themes.json", { baseDir: Resource })) as ThemeObject;
    let theme: Theme = themes[settings.theme];

    // Set language
    setLanguage(settings.language);

    // Check for updates
    {
        const update = await checkVersion();

        if (update) {
            const installUpdate = await ask(
                `${windowLocalization.newVersionFound}: ${update.version}\n${windowLocalization.currentVersion}: ${await getVersion()}`,
                { title: windowLocalization.updateAvailable, okLabel: windowLocalization.installUpdate },
            );

            if (installUpdate) {
                let downloaded = 0;
                let contentLength: number | undefined = 0;

                await update.downloadAndInstall((event) => {
                    switch (event.event) {
                        case "Started":
                            contentLength = event.data.contentLength;
                            console.log(`Started downloading ${event.data.contentLength} bytes`);
                            break;
                        case "Progress":
                            downloaded += event.data.chunkLength;
                            console.log(`Downloaded ${downloaded} from ${contentLength}`);
                            break;
                        case "Finished":
                            console.log("Download finished");
                            break;
                    }
                });

                await relaunch();
            }
        } else {
            console.log("Program is already updated");
        }
    }

    let clickTimer: number | null = null;
    let backupIsActive = false;
    let originalDir = "";

    // Set theme
    let currentTheme: string;

    setTheme(theme);

    // Initialize the project
    let state: string | null = null;
    let stateIndex: number | null = null;
    let nextBackupNumber: number;

    const observerMain = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.firstElementChild!.classList.toggle("hidden", !entry.isIntersecting);
            }
        },
        { root: document },
    );

    const observerFound = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.firstElementChild!.classList.toggle("hidden", !entry.isIntersecting);
            }
        },
        { root: document },
    );

    let totalAllLines = 0;
    const translatedLinesArray: number[] = [];

    await initializeProject(settings.projectPath);

    // Load the font
    const textAreaPropertiesMemo: TextAreaPropertiesMemo = {};
    await loadFont(settings.fontUrl);
    // #endregion

    async function fetchReplacementLog(): Promise<ReplacementLog> {
        const replaced: ReplacementLog = {};

        if (settings.projectPath && (await exists(join(settings.projectPath, programDataDir, logFile)))) {
            for (const [key, value] of Object.entries(
                JSON.parse(await readTextFile(join(settings.projectPath, programDataDir, logFile))) as ReplacementLog,
            )) {
                replaced[key] = value;
            }
        }

        return replaced;
    }

    const replaced: ReplacementLog = await fetchReplacementLog();

    const activeGhostLines: HTMLDivElement[] = [];

    const selectedTextareas = new Map<number, string>();
    const replacedTextareas = new Map<number, string>();

    const bookmarks: Bookmark[] = [];

    {
        const bookmarksFilePath = join(settings.projectPath, programDataDir, bookmarksFile);
        await addToScope({ path: bookmarksFilePath });

        if (await exists(bookmarksFilePath)) {
            const bookmarkEntries = JSON.parse(await readTextFile(bookmarksFilePath)) as Bookmark[];

            for (const bookmark of bookmarkEntries) {
                addBookmark(bookmark);
            }
        }
    }

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

    function updateProgressMeter(total: number, translated: number) {
        currentProgressMeter.style.width = `${Math.round((translated / total) * 100)}%`;
        currentProgressMeter.innerHTML = `${translated} / ${total}`;
    }

    function addBookmark(bookmark: Bookmark) {
        const bookmarkElement = document.createElement("button");
        bookmarkElement.className = tw`backgroundPrimary backgroundSecondHovered flex h-auto flex-row items-center justify-center p-1`;
        bookmarkElement.innerHTML = `${bookmark.title}<br>${bookmark.description}`;

        bookmarks.push(bookmark);
        bookmarksMenu.appendChild(bookmarkElement);
    }

    async function createSettings(): Promise<Settings | undefined> {
        let language: Language;

        const locale: string = (await getLocale()) ?? "en";
        const mainPart: string = locale.split("-", 1)[0];

        switch (mainPart) {
            case "ru":
            case "uk":
            case "be":
                language = Language.Russian;
                break;
            default:
                language = Language.English;
                break;
        }

        windowLocalization = new MainWindowLocalization(language);

        await message(windowLocalization.cannotGetSettings);
        const askCreateSettings = await ask(windowLocalization.askCreateSettings);

        if (askCreateSettings) {
            const newSettings = new Settings(language);

            await addToScope({ path: settingsPath });
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

        applyLocalization(windowLocalization, theme);

        for (const div of themeWindow.children[1].children) {
            for (const subdiv of div.children) {
                const label = subdiv.lastElementChild as HTMLLabelElement;
                // @ts-expect-error object can be indexed by string fuck off
                label.innerHTML = windowLocalization[subdiv.firstElementChild?.id];
            }
        }
    }

    async function createRegExp(text: string): Promise<RegExp | null> {
        text = text.trim();
        if (!text) {
            return null;
        }

        let regexp = searchRegex ? text : await escapeText({ text });
        regexp = searchWhole ? `(?<!\\p{L})${regexp}(?!\\p{L})` : regexp;

        const attr = searchCase ? "g" : "gi";

        try {
            return XRegExp(regexp, attr);
        } catch (err) {
            await message(`${windowLocalization.invalidRegexp} (${text}), ${err})`);
            return null;
        }
    }

    function appendMatch(metadata: string, result: string, counterpartTextMisc?: string) {
        const [file, type, row] = metadata.split("-");
        const reverseType = type.startsWith("o") ? "translation" : "original";

        const resultContainer = document.createElement("div");
        resultContainer.className = tw`textSecond borderPrimary backgroundSecond my-1 cursor-pointer border-2 p-1 text-base`;

        const rowContainer =
            file !== state ? null : (contentContainer.children[Number.parseInt(row) - 1] as HTMLDivElement);
        const counterpartElement = rowContainer?.lastElementChild!.children[type.startsWith("o") ? 2 : 1];

        const resultDiv = document.createElement("div");
        resultDiv.innerHTML = result;
        resultContainer.appendChild(resultDiv);

        const originalInfo = document.createElement("div");
        originalInfo.className = tw`textThird text-xs`;

        originalInfo.innerHTML = `${file} - ${type} - ${row}`;
        resultContainer.appendChild(originalInfo);

        const arrow = document.createElement("div");
        arrow.className = tw`textSecond flex items-center justify-center font-material text-xl`;
        arrow.innerHTML = "arrow_downward";
        resultContainer.appendChild(arrow);

        const counterpart = document.createElement("div");

        const counterpartText = counterpartElement
            ? counterpartElement.tagName === "TEXTAREA"
                ? (counterpartElement as HTMLTextAreaElement).value
                : counterpartElement.innerHTML
            : counterpartTextMisc;
        counterpart.innerHTML = counterpartText!.replaceAllMultiple({ "<": "&lt;", ">": "&gt;" });

        resultContainer.appendChild(counterpart);

        const counterpartInfo = document.createElement("div");
        counterpartInfo.className = tw`textThird text-xs`;

        counterpartInfo.innerHTML = `${file} - ${reverseType} - ${row}`;
        resultContainer.appendChild(counterpartInfo);

        resultContainer.setAttribute("data", `${file}-${type}-${row}`);
        searchPanelFound.appendChild(resultContainer);
    }

    async function searchText(text: string, isReplace: boolean): Promise<Map<HTMLTextAreaElement, string> | null> {
        const regexp: RegExp | null = await createRegExp(text);
        if (!regexp) {
            return null;
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

        const programDataDirPath = join(settings.projectPath, programDataDir);

        const searchMode = Number.parseInt(searchModeSelect.value) as SearchMode;
        const results = isReplace ? new Map<HTMLTextAreaElement, string>() : null;
        const objectToWrite = new Map<string, string | [string, string]>();
        let file = 0;

        const openedTab = contentContainer.children;

        for (const file of await readDir(programDataDirPath)) {
            if (file.name.startsWith("matches-")) {
                await removePath(join(programDataDirPath, file.name));
            }
        }

        if (openedTab.length) {
            for (const child of openedTab) {
                const node = child.firstElementChild!.children as HTMLCollectionOf<HTMLTextAreaElement>;

                if (searchMode !== SearchMode.OnlyOriginal) {
                    const elementText = node[2].value.replaceAllMultiple({
                        "<": "&lt;",
                        ">": "&gt;",
                    });
                    const matches = elementText.match(regexp);

                    if (matches) {
                        const result = createMatchesContainer(elementText, matches);
                        const metadata = node[2].parentElement!.parentElement!.id.split("-");
                        const formattedMetadata = `${metadata[0]}-translation-${metadata[1]}`;
                        isReplace ? results!.set(node[2], result) : objectToWrite.set(formattedMetadata, result);
                    }
                }

                if (searchMode !== SearchMode.OnlyTranslation) {
                    const elementText = node[1].innerHTML.replaceAllMultiple({ "<": "&lt;", ">": "&gt;" });
                    const matches = elementText.match(regexp);

                    if (matches) {
                        const result = createMatchesContainer(elementText, matches);
                        const metadata = node[1].parentElement!.parentElement!.id.split("-");
                        const formattedMetadata = `${metadata[0]}-original-${metadata[1]}`;
                        isReplace ? results!.set(node[1], result) : objectToWrite.set(formattedMetadata, result);
                    }
                }

                if ((objectToWrite.size + 1) % 1000 === 0) {
                    await writeTextFile(
                        join(programDataDirPath, `matches-${file}.json`),
                        JSON.stringify(Object.fromEntries(objectToWrite)),
                    );

                    objectToWrite.clear();
                    file++;
                }
            }
        }

        if (!searchLocation) {
            const translationEntries = await readDir(join(programDataDirPath, translationDir));
            const mapsEntries = await readDir(join(programDataDirPath, tempMapsDir));

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
                            ? join(programDataDirPath, tempMapsDir, name)
                            : join(programDataDirPath, translationDir, name),
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
                            join(programDataDirPath, `matches-${file}.json`),
                            JSON.stringify(Object.fromEntries(objectToWrite)),
                        );

                        objectToWrite.clear();
                        file++;
                    }
                }
            }
        }

        searchTotalPages.textContent = file.toString();
        searchCurrentPage.textContent = "0";

        if (objectToWrite.size > 0) {
            await writeTextFile(
                join(programDataDirPath, `matches-${file}.json`),
                JSON.stringify(Object.fromEntries(objectToWrite)),
            );
            file++;
        }

        if (file) {
            const matches = JSON.parse(await readTextFile(join(programDataDirPath, "matches-0.json"))) as object;

            for (const [id, result] of Object.entries(matches) as [string, string | [string, string]]) {
                if (typeof result === "object") {
                    appendMatch(id, result[0] as string, result[1] as string);
                } else {
                    appendMatch(id, result);
                }
            }
        } else {
            searchPanelFound.innerHTML = `<div id="no-results" class="flex justify-center items-center h-full">${windowLocalization.noMatches}</div>`;
            showSearchPanel(false);
        }

        return results;
    }

    async function handleReplacedClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const element = target.hasAttribute("reverted") ? target : target.parentElement!;

        if (element.getAttribute("reverted") === "1" || !searchPanelReplaced.contains(element)) {
            return;
        }

        const rowContainerId = element.firstElementChild!.textContent!;
        const [file, rowNumber] = rowContainerId.split("-");

        const row = Number.parseInt(rowNumber) - 1;

        if (event.button === 0) {
            await changeState(file);

            contentContainer.children[row].scrollIntoView({
                block: "center",
                inline: "center",
            });
        } else if (event.button === 2) {
            if (state === file) {
                const textarea = contentContainer.children[row].lastElementChild!
                    .lastElementChild! as HTMLTextAreaElement;

                textarea.value = element.children[1].textContent!;
            } else {
                const filePath = file.startsWith("maps")
                    ? join(settings.projectPath, programDataDir, tempMapsDir, file + ".txt")
                    : join(settings.projectPath, programDataDir, translationDir, file + ".txt");

                const fileLines = (await readTextFile(filePath)).split("\n");

                const neededLineSplit = fileLines[row].split(LINES_SEPARATOR);
                neededLineSplit[1] = element.children[1].textContent!;

                fileLines[row] = neededLineSplit.join(LINES_SEPARATOR);

                await writeTextFile(filePath, fileLines.join("\n"));
            }

            element.innerHTML = `<div class="textThird">${element.firstElementChild!.textContent!}</div>${windowLocalization.textReverted}<div>${element.children[1].textContent!}</div>`;
            element.setAttribute("reverted", "1");
            delete replaced[rowContainerId];
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

    async function displaySearchResults(text: string | null = null, hide = true) {
        if (!text) {
            showSearchPanel(hide);
            return;
        }

        text = text.trim();
        if (!text) {
            return;
        }

        await searchText(text, false);

        async function handleResultClick(event: MouseEvent) {
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

            const elementId = resultElement.getAttribute("data")!;
            const [file, type, row] = elementId.split("-");

            if (event.button === 0) {
                await changeState(file);

                contentContainer.children[Number.parseInt(row)].scrollIntoView({
                    block: "center",
                    inline: "center",
                });
            } else if (event.button === 2) {
                if (type.startsWith("o")) {
                    alert(windowLocalization.originalTextIrreplacable);
                    return;
                } else {
                    if (replaceInput.value.trim()) {
                        const elementToReplace =
                            file !== state
                                ? null
                                : contentContainer.children[Number.parseInt(row) - 1].lastElementChild!
                                      .lastElementChild!;

                        let newText: string;

                        if (elementToReplace) {
                            newText = (await replaceText(elementToReplace as HTMLTextAreaElement))!;
                        } else {
                            const regexp = await createRegExp(searchInput.value);
                            if (!regexp) {
                                return;
                            }

                            const normalizedFilename = file + ".txt";
                            const pathToFile = normalizedFilename.startsWith("maps")
                                ? join(settings.projectPath, programDataDir, tempMapsDir, normalizedFilename)
                                : join(settings.projectPath, programDataDir, translationDir, normalizedFilename);

                            const content = (await readTextFile(pathToFile)).split("\n");

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

                            await writeTextFile(pathToFile, content.join("\n"));
                        }

                        if (newText) {
                            saved = false;
                            resultElement.firstElementChild!.children[type.startsWith("o") ? 3 : 0].innerHTML = newText;
                        }
                    }
                }
            }
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

        searchPanelFound.removeEventListener("mousedown", handleResultClick);
        searchPanelFound.addEventListener("mousedown", handleResultClick);
    }

    async function replaceText(text: string | HTMLTextAreaElement): Promise<string | undefined> {
        if (text instanceof HTMLTextAreaElement) {
            const regexp: RegExp | null = await createRegExp(searchInput.value);
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

            replaced[text.id] = { old: text.value, new: newValue };

            text.value = newValue.replaceAll(/<span(.*?)>|<\/span>/g, "");
            return newValue;
        } else {
            text = text.trim();
            if (!text) {
                return;
            }

            const results: Map<HTMLTextAreaElement, string> = (await searchText(text, true))!;
            if (!results.size) {
                return;
            }

            const regexp: RegExp | null = await createRegExp(text);
            if (!regexp) {
                return;
            }

            for (const textarea of results.keys()) {
                const newValue = textarea.value.replace(regexp, replaceInput.value);

                replaced[textarea.parentElement!.parentElement!.id] = {
                    old: textarea.value,
                    new: newValue,
                };

                textarea.value = newValue;
            }
        }
    }

    async function save(mode: SaveMode) {
        if (!settings.projectPath || (mode === SaveMode.SingleFile && !state) || (mode !== SaveMode.Backup && saving)) {
            return;
        }

        saving = true;

        if (mode !== SaveMode.SingleFile) {
            saveButton.firstElementChild!.classList.add("animate-spin");
        }

        const translationPath = join(settings.projectPath, programDataDir, translationDir);
        const tempMapsPath = join(settings.projectPath, programDataDir, tempMapsDir);
        const outputArray: string[] = [];

        if (mode !== SaveMode.Backup) {
            if (state) {
                for (const child of contentContainer.children) {
                    const originalTextElement = child.firstElementChild!.children[1] as HTMLDivElement;
                    const translatedTextElement = child.firstElementChild!.children[2] as HTMLTextAreaElement;

                    outputArray.push(
                        originalTextElement.textContent!.replaceAll("\n", NEW_LINE) +
                            LINES_SEPARATOR +
                            translatedTextElement.value.replaceAll("\n", NEW_LINE),
                    );
                }

                if (state === "system") {
                    const originalTitle = currentGameTitle.getAttribute("original-title")!;

                    const output =
                        originalTitle +
                        LINES_SEPARATOR +
                        (originalTitle === currentGameTitle.value ? "" : currentGameTitle.value);

                    outputArray.push(output);
                }

                const filePath = `${state}.txt`;
                const savePath = state.startsWith("maps")
                    ? join(tempMapsPath, filePath)
                    : join(translationPath, filePath);

                await writeTextFile(savePath, outputArray.join("\n"));
            }

            outputArray.length = 0;

            if (mode === SaveMode.AllFiles) {
                const entries = (await readDir(tempMapsPath)).sort(
                    (a, b) => Number.parseInt(a.name.slice(4)) - Number.parseInt(b.name.slice(4)),
                );

                for (const entry of entries) {
                    outputArray.push(await readTextFile(join(tempMapsPath, entry.name)));
                }

                await writeTextFile(join(translationPath, "maps.txt"), outputArray.join("\n"));
                saved = true;
            }
        } else {
            const backupFolderEntries = await readDir(join(settings.projectPath, programDataDir, "backups"));

            if (backupFolderEntries.length >= settings.backup.max) {
                await removePath(join(settings.projectPath, programDataDir, "backups", backupFolderEntries[0].name), {
                    recursive: true,
                });
            }

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
            await mkdir(join(backupFolderName, tempMapsDir));
            await mkdir(join(backupFolderName, translationDir));

            for (const entry of await readDir(translationPath)) {
                await copyFile(join(translationPath, entry.name), join(backupFolderName, translationDir, entry.name));
            }

            for (const entry of await readDir(tempMapsPath)) {
                await copyFile(join(tempMapsPath, entry.name), join(backupFolderName, tempMapsDir, entry.name));
            }
        }

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

    async function changeState(newState: string | null, newStateIndex?: number) {
        if (state && state === newState) {
            return;
        }

        await waitForSave();
        observerMain.disconnect();

        if (state) {
            await save(SaveMode.SingleFile);

            let totalFields = contentContainer.children.length;

            if (totalFields) {
                let translatedFields = 0;

                for (const child of contentContainer.children) {
                    const original = child.firstElementChild!.children[1] as HTMLDivElement;
                    const translation = child.firstElementChild!.children[2] as HTMLTextAreaElement;

                    if (original.textContent!.startsWith("<!--")) {
                        totalFields--;
                    } else if (translation.value) {
                        translatedFields++;
                    }
                }

                const percentage = Math.round((translatedFields / totalFields) * 100);

                const selectedTab = leftPanel.children[stateIndex!];
                const progressBar = selectedTab.lastElementChild?.firstElementChild as HTMLSpanElement | null;

                if (progressBar) {
                    translatedLinesArray[stateIndex!] = translatedFields;
                    updateProgressMeter(
                        totalAllLines,
                        translatedLinesArray.reduce((a, b) => a + b, 0),
                    );

                    progressBar.style.width = progressBar.innerHTML = `${percentage}%`;
                }

                selectedTab.classList.replace("backgroundThird", "backgroundPrimary");
            }
        }

        contentContainer.innerHTML = "";

        if (!newState) {
            state = null;
            currentState.innerHTML = "";
        } else {
            state = newState;

            if (!newStateIndex) {
                let i = 0;
                for (const element of leftPanel.children) {
                    if (element.firstElementChild!.textContent === newState) {
                        newStateIndex = i;
                        break;
                    }

                    i++;
                }
            }

            stateIndex = newStateIndex!;

            const selectedTab = leftPanel.children[newStateIndex!];
            selectedTab.classList.replace("backgroundPrimary", "backgroundThird");

            await createContentForState(newState);

            currentState.innerHTML = newState;

            for (const child of contentContainer.children) {
                observerMain.observe(child);
            }
        }
    }

    function handleGotoRowInputKeypress(event: KeyboardEvent) {
        if (event.code === "Enter") {
            const targetRow = document.getElementById(`${state!}-${goToRowInput.value}`) as HTMLDivElement | null;

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

                        for (const [rowNumber, value] of selectedTextareas.entries()) {
                            const rowContainer = contentContainer.children[rowNumber] as HTMLDivElement;
                            const textarea = rowContainer.lastElementChild!.lastElementChild! as HTMLTextAreaElement;
                            textarea.value = value;
                        }

                        for (const [rowNumber, value] of replacedTextareas.entries()) {
                            const rowContainer = contentContainer.children[rowNumber] as HTMLDivElement;
                            const textarea = rowContainer.lastElementChild!.lastElementChild! as HTMLTextAreaElement;
                            textarea.value = value;
                            textarea.calculateHeight();
                        }

                        replacedTextareas.clear();
                        break;
                    case "KeyS":
                        await save(SaveMode.AllFiles);
                        break;
                    case "KeyG":
                        event.preventDefault();

                        if (state && goToRowInput.classList.contains("hidden")) {
                            goToRowInput.classList.remove("hidden");
                            goToRowInput.focus();

                            const lastRow = contentContainer.lastElementChild!.id.split("-")[1];

                            goToRowInput.placeholder = `${windowLocalization.goToRow} ${lastRow}`;

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
                        await startCompilation(false);
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
                    case "ArrowDown":
                        if (stateIndex !== null) {
                            const newStateIndex = (stateIndex + 1) % leftPanel.children.length;

                            await changeState(
                                leftPanel.children[newStateIndex].firstElementChild!.textContent,
                                newStateIndex,
                            );
                        }
                        break;
                    case "ArrowUp":
                        if (stateIndex !== null) {
                            const newStateIndex =
                                (stateIndex - 1 + leftPanel.children.length) % leftPanel.children.length;
                            await changeState(
                                leftPanel.children[newStateIndex].firstElementChild!.textContent,
                                newStateIndex,
                            );
                        }
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
                case "Enter": {
                    if (event.altKey || event.ctrlKey) {
                        function jump(direction: JumpDirection) {
                            const focusedElement = document.activeElement as HTMLElement;
                            if (!contentContainer.contains(focusedElement) && focusedElement.tagName !== "TEXTAREA") {
                                return;
                            }

                            const idParts = focusedElement.parentElement!.parentElement!.id.split("-");
                            const index = Number.parseInt(idParts[1]);

                            if (Number.isNaN(index)) {
                                return;
                            }

                            const step = direction === JumpDirection.Next ? 1 : -1;
                            const nextElement = document.getElementById(`${idParts[0]}-${index + step}`)
                                ?.lastElementChild?.lastElementChild as HTMLTextAreaElement | null;

                            if (!nextElement) {
                                return;
                            }

                            window.scrollBy(0, step * nextElement.clientHeight);
                            focusedElement.blur();
                            nextElement.focus();
                            nextElement.setSelectionRange(0, 0);
                        }

                        if (event.altKey) {
                            jump(JumpDirection.Next);
                        } else if (event.ctrlKey) {
                            jump(JumpDirection.Previous);
                        }
                    }
                    break;
                }
                case "KeyT":
                    if (event.ctrlKey) {
                        const selectedField = event.target as HTMLTextAreaElement;

                        if (!selectedField.value) {
                            if (!selectedField.placeholder) {
                                const counterpart = selectedField.parentElement!.children[1];

                                if (!settings.translation.from || !settings.translation.to) {
                                    alert(windowLocalization.translationLanguagesNotSelected);
                                    return;
                                }

                                const translated = await translateText({
                                    text: counterpart.textContent!,
                                    to: settings.translation.to,
                                    from: settings.translation.from,
                                    replace: false,
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

    async function createContentForState(state: string) {
        const programDataDirPath = join(settings.projectPath, programDataDir);
        const translationPath = join(programDataDirPath, translationDir);

        const contentName = state.toString();
        const formattedFilename = `${contentName}.txt`;

        let pathToContent = join(translationPath, formattedFilename);

        if (contentName.startsWith("maps")) {
            pathToContent = join(programDataDirPath, tempMapsDir, formattedFilename);
        }

        if (contentName.startsWith("plugins") && !(await exists(pathToContent))) {
            if (await exists(join(translationPath, "scripts.txt"))) {
                pathToContent = join(translationPath, formattedFilename);
            }
        }

        const content = (await readTextFile(pathToContent)).split("\n");

        if (contentName === "system") {
            content.pop();
        }

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < content.length; i++) {
            const [originalText, translationText] = content[i].split(LINES_SEPARATOR);
            const added = i + 1;

            const originalTextSplit = originalText.replaceAll(NEW_LINE, "\n");
            const translationTextSplit = translationText.split(NEW_LINE);

            const textParent = document.createElement("div");
            textParent.id = `${contentName}-${added}`;
            textParent.className = tw`h-auto w-full`;

            const textContainer = document.createElement("div");
            textContainer.className = tw`flex h-full flex-row justify-around py-[1px]`;

            const originalTextElement = document.createElement("div");
            originalTextElement.className = tw`outlinePrimary backgroundPrimary font inline-block w-full cursor-pointer whitespace-pre-wrap p-1 outline outline-2`;

            if (settings.fontUrl) {
                originalTextElement.style.fontFamily = "font";
            }

            originalTextElement.textContent = originalTextSplit;

            const translationTextElement = document.createElement("textarea");
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
            rowElement.className = tw`outlinePrimary backgroundPrimary flex w-48 flex-row p-1 outline outline-2`;

            const spanElement = document.createElement("span");
            spanElement.textContent = added.toString();

            const innerDiv = document.createElement("div");
            innerDiv.className = tw`textThird flex w-full items-start justify-end p-0.5 text-xl`;

            const bookmarkButton = document.createElement("button");
            bookmarkButton.className = tw`borderPrimary backgroundPrimaryHovered flex max-h-6 items-center justify-center rounded-md border-2 font-material`;
            bookmarkButton.textContent = "bookmark";

            if (bookmarks.some((obj) => obj.title === textParent.id)) {
                bookmarkButton.classList.add("backgroundThird");
            }

            const deleteButton = document.createElement("button");
            deleteButton.className = tw`borderPrimary backgroundPrimaryHovered flex max-h-6 items-center justify-center rounded-md border-2 font-material`;
            deleteButton.textContent = "close";

            innerDiv.appendChild(bookmarkButton);
            innerDiv.appendChild(deleteButton);
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

            textContainer.appendChild(rowElement);
            textContainer.appendChild(originalTextElement);
            textContainer.appendChild(translationTextElement);
            textParent.appendChild(textContainer);
            fragment.appendChild(textParent);
        }

        contentContainer.appendChild(fragment);
    }

    async function startCompilation(silent: boolean) {
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
                await startCompilation(true);
            });
            await compileWindow.once("tauri://destroyed", compileUnlisten);
        } else {
            compileButton.firstElementChild!.classList.add("animate-spin");

            let incorrectCompileSettings = false;

            if (typeof compileSettings.logging !== "boolean") {
                compileSettings.logging = false;
                incorrectCompileSettings = true;
            }

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

            const executionTime = await compile({
                projectPath: settings.projectPath,
                originalDir,
                outputPath: compileSettings.customOutputPath.path,
                gameTitle: currentGameTitle.value,
                mapsProcessingMode: compileSettings.mapsProcessingMode,
                romanize: compileSettings.romanize,
                disableCustomProcessing: compileSettings.disableCustomProcessing,
                disableProcessing: Object.values(compileSettings.disableProcessing.of),
                engineType: settings.engineType!,
                logging: compileSettings.logging,
                language: settings.language,
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
        target.placeholder = "";

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
            await addToScope({ path: fontUrl });

            const font = await new FontFace("font", `url(${convertFileSrc(fontUrl)})`).load();
            document.fonts.add(font);

            textAreaPropertiesMemo.fontFamily = "font";

            for (const element of document.querySelectorAll(".font")) {
                (element as HTMLElement).style.fontFamily = "font";
            }
        } else {
            textAreaPropertiesMemo.fontFamily = document.body.style.fontFamily;

            for (const element of document.querySelectorAll(".font")) {
                (element as HTMLElement).style.fontFamily = "";
            }
        }
    }

    async function exitConfirmation(): Promise<boolean> {
        let askExitUnsaved: boolean;
        if (saved) {
            return true;
        } else {
            askExitUnsaved = await ask(windowLocalization.unsavedChanges);
        }

        let askExit: boolean;
        if (!askExitUnsaved) {
            askExit = await ask(windowLocalization.exit);
        } else {
            await save(SaveMode.AllFiles);
            return true;
        }

        if (!askExit) {
            return false;
        } else {
            return true;
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

    async function initializeProject(pathToProject: string) {
        async function ensureProjectIsValid(pathToProject: string): Promise<boolean> {
            if (!pathToProject) {
                return false;
            }

            if (!(await exists(pathToProject))) {
                await message(windowLocalization.selectedFolderMissing);
                return false;
            }

            originalDir = "";

            if (await exists(join(pathToProject, "Data"))) {
                originalDir = "Data";
            } else if (await exists(join(pathToProject, "data"))) {
                originalDir = "data";
            }

            if (await exists(join(pathToProject, "original"))) {
                originalDir = "original";
            }

            if (!originalDir) {
                for (const archiveName of ["Game.rgssad", "Game.rgss2a", "Game.rgss3a"]) {
                    const archivePath = join(pathToProject, archiveName);

                    if (await exists(archivePath)) {
                        await extractArchive({
                            inputPath: archivePath,
                            outputPath: pathToProject,
                            processingMode: ProcessingMode.Default,
                        });
                        break;
                    }
                }

                originalDir = "Data";
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

        await addToScope({ path: pathToProject });

        projectStatus.innerHTML = windowLocalization.loadingProject;
        const interval = animateProgressText(projectStatus);

        const projectIsValid = await ensureProjectIsValid(pathToProject);

        if (!projectIsValid) {
            settings.projectPath = "";
            projectStatus.innerHTML = windowLocalization.noProjectSelected;
        } else {
            totalAllLines = 0;
            translatedLinesArray.length = 0;

            settings.projectPath = pathToProject;

            // Create program data directory
            const programDataDirPath = join(settings.projectPath, programDataDir);
            await addToScope({ path: programDataDirPath });

            if (!(await exists(programDataDirPath))) {
                await mkdir(programDataDirPath);
            }

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
                    for await (const line of await readTextFileLines(join(settings.projectPath, "Game.ini"))) {
                        if (line.toLowerCase().startsWith("title")) {
                            gameTitle = line.split("=")[1].trim();
                        }
                    }
                }

                await read({
                    projectPath: settings.projectPath,
                    originalDir,
                    gameTitle,
                    mapsProcessingMode: 0,
                    romanize: false,
                    disableCustomProcessing: false,
                    disableProcessing: [false, false, false, false],
                    processingMode: ProcessingMode.Default,
                    engineType: settings.engineType!,
                    logging: true,
                    language: settings.language,
                    generateJson: false,
                });

                await appendToEnd({
                    path: join(settings.projectPath, programDataDir, translationDir, "system.txt"),
                    text: `${gameTitle}${LINES_SEPARATOR}`,
                });
            }

            const translationFiles = await readDir(join(settings.projectPath, programDataDir, translationDir));
            leftPanel.innerHTML = "";

            let i = 1;

            await mkdir(join(settings.projectPath, programDataDir, tempMapsDir), { recursive: true });

            function createTab(name: string, content: string[], i: number): HTMLButtonElement | undefined {
                let totalLines = content.length;
                let translatedLines = 0;

                for (const line of content) {
                    if (line.startsWith("<!--")) {
                        totalLines--;
                    } else if (!line.endsWith(LINES_SEPARATOR)) {
                        translatedLines++;
                    }
                }

                if (totalLines === 0) {
                    return;
                }

                const buttonElement = document.createElement("button");
                buttonElement.className = "menu-button backgroundPrimary backgroundPrimaryHovered";
                buttonElement.id = (i - 1).toString();

                const stateSpan = document.createElement("span");
                stateSpan.innerHTML = name;
                stateSpan.className = "pr-1";
                buttonElement.appendChild(stateSpan);

                totalAllLines += totalLines;
                translatedLinesArray.push(translatedLines);

                const translatedRatio = Math.round((translatedLines / totalLines) * 100);
                const progressBar = document.createElement("div");
                const progressMeter = document.createElement("div");

                progressBar.className = tw`backgroundSecond w-full rounded-sm`;
                progressMeter.className = tw`backgroundThird textPrimary rounded-sm p-0.5 text-center text-xs font-medium leading-none`;
                progressMeter.style.width = progressMeter.textContent = `${translatedRatio}%`;

                progressBar.appendChild(progressMeter);
                buttonElement.appendChild(progressBar);

                const checkboxDiv = document.createElement("div");
                checkboxDiv.className = tw`flex flex-row items-center gap-1 p-0.5`;
                checkboxDiv.id = buttonElement.id;

                const checkbox = document.createElement("span");
                checkbox.className = tw`checkbox borderPrimary max-h-6 min-h-6 min-w-6 max-w-6`;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.className = tw`text-base`;
                checkboxLabel.innerHTML = buttonElement.firstElementChild!.textContent!;

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(checkboxLabel);
                selectFilesWindow.children[1].appendChild(checkboxDiv);

                return buttonElement;
            }

            for (const entry of translationFiles) {
                if (!entry.name.endsWith(".txt")) {
                    continue;
                }

                const name = entry.name;
                const content = await readTextFile(join(settings.projectPath, programDataDir, translationDir, name));

                if (!content) {
                    continue;
                }

                const split = content.split("\n");

                if (name.startsWith("maps")) {
                    if (split.length === 1) {
                        continue;
                    }

                    const result: string[] = [];
                    const mapsNumbers: number[] = [];

                    for (let l = 0; l <= split.length; l++) {
                        const line = split[l];

                        if (l === split.length || line.startsWith("<!-- Map")) {
                            if (l !== split.length) {
                                mapsNumbers.push(Number.parseInt(line.slice(8)));
                            }

                            if (!result.length) {
                                result.push(line);
                                continue;
                            }

                            const mapsNumber = mapsNumbers.shift();
                            const joined = result.join("\n");
                            await writeTextFile(
                                join(settings.projectPath, programDataDir, tempMapsDir, `maps${mapsNumber}.txt`),
                                joined,
                            );

                            const tab = createTab(`maps${mapsNumber}`, result, i);

                            if (tab) {
                                leftPanel.appendChild(tab);
                                i++;
                            }

                            result.length = 0;
                        }

                        result.push(line);
                    }
                } else {
                    const tab = createTab(name.slice(0, -4), split, i);

                    if (tab) {
                        leftPanel.appendChild(tab);
                        i++;
                    }
                }
            }

            updateProgressMeter(
                totalAllLines,
                translatedLinesArray.reduce((a, b) => a + b, 0),
            );

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
                await readLastLine({
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

    leftPanel.addEventListener("click", async (event) => {
        let target = event.target as HTMLElement;
        const leftPanelChildren = Array.from(leftPanel.children);

        if (leftPanel.contains(target)) {
            while (!leftPanelChildren.includes(target)) {
                target = target.parentElement!;
            }

            await changeState(target.firstElementChild!.textContent, Number.parseInt(target.id));
        }
    });

    topPanelButtonsDiv.addEventListener("click", async (event) => {
        const target = topPanelButtonsDiv.secondHighestParent(event.target as HTMLElement);

        if ((!settings.projectPath && target.id !== "open-directory-button") || target === topPanelButtonsDiv) {
            return;
        }

        switch (target.id) {
            case "menu-button":
                leftPanel.toggleMultiple("translate-x-0", "-translate-x-full");
                break;
            case saveButton.id:
                await save(SaveMode.AllFiles);
                break;
            case "compile-button":
                if (clickTimer === null) {
                    clickTimer = setTimeout(async () => {
                        clickTimer = null;
                        await startCompilation(true);
                    }, 250);
                } else {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    await startCompilation(false);
                }
                break;
            case "open-directory-button": {
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
                break;
            }
            case "settings-button": {
                const settingsWindow = new WebviewWindow("settings", {
                    url: "settings.html",
                    title: windowLocalization.settingsButtonTitle,
                    center: true,
                    resizable: false,
                });

                const settingsUnlisten = await settingsWindow.once<Settings>("get-settings", async (data) => {
                    settings = data.payload;

                    if (settings.backup.enabled && !backupIsActive) {
                        backup();
                    }

                    await loadFont(settings.fontUrl);
                });

                await settingsWindow.once("tauri://destroyed", settingsUnlisten);
                break;
            }
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

                                for (const div of themeWindow.children[1]
                                    .children as HTMLCollectionOf<HTMLDivElement>) {
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

                                for (const div of themeWindow.children[1]
                                    .children as HTMLCollectionOf<HTMLDivElement>) {
                                    for (const subdiv of div.children) {
                                        const inputElement = subdiv.firstElementChild as HTMLInputElement;

                                        inputElement.value = themeColors[i];
                                        inputElement.addEventListener("input", changeStyle);
                                        i++;
                                    }
                                }

                                const closeButton = themeWindow.firstElementChild!
                                    .firstElementChild as HTMLButtonElement;
                                const createThemeButton = themeWindow.lastElementChild!
                                    .lastElementChild as HTMLButtonElement;
                                createThemeButton.addEventListener("click", createTheme);

                                closeButton.addEventListener("click", () => {
                                    for (const div of themeWindow.children[1]
                                        .children as HTMLCollectionOf<HTMLDivElement>) {
                                        for (const subdiv of div.children) {
                                            const inputElement = subdiv.firstElementChild as HTMLInputElement;
                                            inputElement.removeEventListener("input", changeStyle);
                                        }
                                    }

                                    createThemeButton.removeEventListener("click", createTheme);
                                    themeWindow.classList.add("hidden");
                                });
                            });
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
            case "read-button": {
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
                break;
            }
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
                toolsMenu.toggleMultiple("hidden", "flex");

                requestAnimationFrame(() => {
                    toolsMenu.style.left = `${toolsButton.offsetLeft}px`;
                    toolsMenu.style.top = `${menuBar.clientHeight + topPanel.clientHeight}px`;

                    toolsMenu.addEventListener("click", (event: MouseEvent) => {
                        const target = event.target as HTMLButtonElement;

                        if (!toolsMenu.contains(target)) {
                            return;
                        }

                        function showSelectFilesWindow(rootElement: HTMLElement, action: FilesAction) {
                            const selectFilesWindowChildren = selectFilesWindow.children;

                            const { x, y } = rootElement.getBoundingClientRect();
                            selectFilesWindow.style.left = `${x + rootElement.clientWidth}px`;
                            selectFilesWindow.style.top = `${y}px`;

                            const selectFilesWindowBody = selectFilesWindowChildren[1];
                            const selectFilesWindowFooter = selectFilesWindowChildren[2];

                            if (action === FilesAction.Wrap) {
                                selectFilesWindowFooter.firstElementChild!.classList.remove("hidden");
                            }

                            const controlButtonsDivChildren = selectFilesWindowChildren[3].children;
                            const selectAllButton = controlButtonsDivChildren[0] as HTMLButtonElement;

                            selectAllButton.onclick = () => {
                                for (const element of selectFilesWindowBody.children) {
                                    element.firstElementChild!.textContent = "check";
                                }
                            };

                            const deselectAllButton = controlButtonsDivChildren[1] as HTMLButtonElement;

                            deselectAllButton.onclick = () => {
                                for (const element of selectFilesWindowBody.children) {
                                    element.firstElementChild!.textContent = "";
                                }
                            };

                            const confirmButtonsDivChildren = selectFilesWindowChildren[4].children;
                            const applyButton = confirmButtonsDivChildren[0] as HTMLButtonElement;

                            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

                            applyButton.onclick = async (event) => {
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

                                            while (line.length > width && words.length > 0) {
                                                remainder.unshift(words.pop()!);
                                                line = words.join(" ");
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

                                const filenames: [string, number][] = [];

                                for (const element of selectFilesWindowBody.children) {
                                    if (element.firstElementChild!.textContent) {
                                        filenames.push([
                                            element.lastElementChild!.textContent!,
                                            Number.parseInt(element.id),
                                        ]);
                                    }
                                }

                                for (const [filename, i] of filenames) {
                                    await sleep(1000);

                                    if (filename === state) {
                                        for (const element of contentContainer.children) {
                                            const originalField = element.firstElementChild!
                                                .children[1] as HTMLDivElement;
                                            const translationField = element.firstElementChild!
                                                .children[2] as HTMLTextAreaElement;

                                            const translationExists = Boolean(translationField.value.trim());

                                            switch (action) {
                                                case FilesAction.Trim:
                                                    if (translationExists) {
                                                        translationField.value = translationField.value.trim();
                                                    }
                                                    break;
                                                case FilesAction.Translate:
                                                    if (
                                                        !translationExists &&
                                                        !/^<!--(?! Map)/.exec(originalField.textContent!)
                                                    ) {
                                                        void translateText({
                                                            text: originalField.textContent!,
                                                            from: settings.translation.from,
                                                            to: settings.translation.to,
                                                            replace: false,
                                                        }).then((translated) => {
                                                            translationField.value = translated;
                                                        });
                                                    }
                                                    break;
                                                case FilesAction.Wrap:
                                                    if (
                                                        translationExists &&
                                                        !/^<!--(?! Map)/.exec(originalField.textContent!)
                                                    ) {
                                                        translationField.value = wrapText(
                                                            translationField.value,
                                                            Number.parseInt(
                                                                (
                                                                    selectFilesWindowFooter.firstElementChild!
                                                                        .lastElementChild! as HTMLInputElement
                                                                ).value,
                                                            ),
                                                        );

                                                        calculateHeight(event);
                                                    }
                                                    break;
                                            }
                                        }
                                    } else {
                                        const contentPath = filename.startsWith("maps")
                                            ? join(settings.projectPath, programDataDir, tempMapsDir, filename + ".txt")
                                            : join(
                                                  settings.projectPath,
                                                  programDataDir,
                                                  translationDir,
                                                  filename + ".txt",
                                              );

                                        const newLines = await Promise.all(
                                            (await readTextFile(contentPath)).split("\n").map(async (line) => {
                                                const [original, translation] = line.split(LINES_SEPARATOR);
                                                const translationExists = Boolean(translation.trim());

                                                switch (action) {
                                                    case FilesAction.Trim:
                                                        return translationExists
                                                            ? `${original}${LINES_SEPARATOR}${translation.trim()}`
                                                            : line;
                                                    case FilesAction.Translate: {
                                                        try {
                                                            if (!translationExists && !/^<!--(?! Map)/.exec(original)) {
                                                                return `${original}${LINES_SEPARATOR}${await translateText(
                                                                    {
                                                                        text: original,
                                                                        from: settings.translation.from,
                                                                        to: settings.translation.to,
                                                                        replace: true,
                                                                    },
                                                                )}`;
                                                            } else {
                                                                return line;
                                                            }
                                                        } catch (e) {
                                                            console.error(e);
                                                            return line;
                                                        }
                                                    }
                                                    case FilesAction.Wrap:
                                                        if (translationExists && !/^<!--(?! Map)/.exec(original)) {
                                                            const wrapped = wrapText(
                                                                translation.replaceAll(NEW_LINE, "\n"),
                                                                Number.parseInt(
                                                                    (
                                                                        selectFilesWindowFooter.firstElementChild!
                                                                            .lastElementChild! as HTMLInputElement
                                                                    ).value,
                                                                ),
                                                            );

                                                            return `${original}${LINES_SEPARATOR}${wrapped.replaceAll("\n", NEW_LINE)}`;
                                                        } else {
                                                            return line;
                                                        }
                                                }
                                            }),
                                        );

                                        if (action === FilesAction.Translate) {
                                            const progressBar =
                                                leftPanel.children[i].lastElementChild?.firstElementChild;

                                            if (progressBar) {
                                                updateProgressMeter(
                                                    totalAllLines,
                                                    translatedLinesArray.reduce((a, b) => a + b, 0),
                                                );

                                                (progressBar as HTMLElement).style.width =
                                                    progressBar.textContent = `100%`;
                                            }

                                            translatedLinesArray[i] = newLines.length;
                                        }

                                        await writeTextFile(contentPath, newLines.join("\n"));

                                        selectFilesWindowBody.children[i].firstElementChild!.classList.add(
                                            "text-green-500",
                                        );
                                    }
                                }

                                saved = false;
                                selectFilesWindow.classList.replace("flex", "hidden");
                            };

                            const cancelButton = confirmButtonsDivChildren[1] as HTMLButtonElement;

                            cancelButton.onclick = () => {
                                selectFilesWindow.classList.replace("flex", "hidden");
                            };

                            const toggledBoxes = new Set<HTMLElement>();

                            selectFilesWindow.onmousemove = (event) => {
                                if (event.buttons === 1) {
                                    const target = event.target as HTMLElement;

                                    if (target.classList.contains("checkbox") && !toggledBoxes.has(target)) {
                                        target.textContent = target.textContent ? "" : "check";
                                        toggledBoxes.add(target);
                                    }
                                }
                            };

                            selectFilesWindow.onmouseup = () => {
                                toggledBoxes.clear();
                            };

                            selectFilesWindow.onclick = (event) => {
                                const target = event.target as HTMLElement;

                                if (target.classList.contains("checkbox") && !toggledBoxes.has(target)) {
                                    target.textContent = target.textContent ? "" : "check";
                                    toggledBoxes.add(target);
                                }
                            };

                            selectFilesWindow.classList.replace("hidden", "flex");
                        }

                        switch (target.id) {
                            case "trim-tools-menu-button": {
                                if (selectFilesWindow.classList.contains("flex")) {
                                    selectFilesWindow.classList.replace("flex", "hidden");
                                    return;
                                } else {
                                    showSelectFilesWindow(target, FilesAction.Trim);
                                }
                                break;
                            }
                            case "translate-tools-menu-button": {
                                if (!settings.translation.from || !settings.translation.to) {
                                    alert(windowLocalization.translationLanguagesNotSelected);
                                    return;
                                }

                                if (selectFilesWindow.classList.contains("flex")) {
                                    selectFilesWindow.classList.replace("flex", "hidden");
                                    return;
                                } else {
                                    showSelectFilesWindow(target, FilesAction.Translate);
                                }
                                break;
                            }
                            case "wrap-tools-menu-button": {
                                if (selectFilesWindow.classList.contains("flex")) {
                                    selectFilesWindow.classList.replace("flex", "hidden");
                                    return;
                                } else {
                                    showSelectFilesWindow(target, FilesAction.Wrap);
                                }
                                break;
                            }
                        }
                    });
                });
                break;
        }
    });

    searchPanel.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case "switch-search-content": {
                searchPanelFound.classList.toggle("hidden");
                searchPanelReplaced.classList.toggle("hidden");

                if (target.innerHTML.trim() === "search") {
                    target.innerHTML = "menu_book";
                    observerFound.disconnect();

                    for (const [key, value] of Object.entries(replaced)) {
                        const replacedContainer = document.createElement("div");
                        replacedContainer.className = tw`textSecond backgroundSecond borderPrimary my-1 cursor-pointer border-2 p-1 text-base`;
                        replacedContainer.setAttribute("reverted", "0");

                        replacedContainer.innerHTML = `<div class="textThird">${key}</div><div>${value.old}</div><div class="flex justify-center items-center text-xl textPrimary font-material">arrow_downward</div><div>${value.new}</div>`;

                        searchPanelReplaced.appendChild(replacedContainer);
                    }

                    searchPanelReplaced.addEventListener("mousedown", handleReplacedClick);
                } else {
                    target.innerHTML = "search";
                    searchPanelReplaced.innerHTML = "";
                    searchPanelReplaced.removeEventListener("mousedown", handleReplacedClick);
                }
                break;
            }
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
                    },
                    {
                        once: true,
                    },
                );
                break;
        }
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

        if (target.tagName === "DIV") {
            const rowContainer = target.parentElement?.parentElement;

            if (rowContainer) {
                if (/\d$/.test(rowContainer.id)) {
                    await writeText(target.textContent!);
                }
            }
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

    contentContainer.addEventListener("mousedown", async (event) => {
        const target = event.target as HTMLElement;

        if (target.textContent === "bookmark") {
            const rowContainerId = target.parentElement!.parentElement!.parentElement!.parentElement!.id;
            const bookmarkIndex = bookmarks.findIndex((obj) => obj.title === rowContainerId);

            if (bookmarkIndex !== -1) {
                bookmarks.splice(bookmarkIndex, 1);

                for (const bookmark of bookmarksMenu.children) {
                    if (bookmark.textContent?.startsWith(rowContainerId)) {
                        bookmark.remove();
                    }
                }

                target.classList.remove("backgroundThird");
            } else {
                const input = document.createElement("input");
                input.className = "absolute w-auto h-7 p-1 z-50 text-base input textSecond backgroundSecond";
                input.style.left = `${target.offsetLeft + target.clientWidth}px`;
                input.style.top = `${target.offsetTop}px`;
                document.body.appendChild(input);

                requestAnimationFrame(() => {
                    input.focus();
                });

                input.onkeydown = (event) => {
                    if (event.key === "Enter") {
                        const description = input.value;
                        input.remove();

                        addBookmark({ title: rowContainerId, description });
                        target.classList.add("backgroundThird");
                    } else if (event.key === "Escape") {
                        requestAnimationFrame(() => {
                            input.remove();
                        });
                    }
                };
            }
        } else if (target.textContent === "close") {
            if (typeof settings.rowDeleteMode !== "number" || settings.rowDeleteMode === RowDeleteMode.Disabled) {
                alert(windowLocalization.deletingDisabled);
                return;
            } else if (settings.rowDeleteMode === RowDeleteMode.Confirmation) {
                const confirmation = await ask(windowLocalization.deletingConfirmation);

                if (!confirmation) {
                    return;
                }
            }

            const rowContainer = target.parentElement!.parentElement!.parentElement!.parentElement!;
            const position = Number.parseInt(target.parentElement!.parentElement!.firstElementChild!.textContent!);

            const contentElement = contentContainer;
            const children = contentElement.children as HTMLCollectionOf<HTMLDivElement>;

            for (let i = position; i < children.length; i++) {
                const element = children[i];

                const rowNumberElement = element.firstElementChild!.firstElementChild!.firstElementChild!;
                const newRowNumber = (Number.parseInt(rowNumberElement.textContent!) - 1).toString();

                rowNumberElement.textContent = newRowNumber;
                element.id = element.id.replace(/\d+$/, newRowNumber);
            }

            totalAllLines -= 1;
            rowContainer.remove();
        } else if (event.button === 0) {
            if (shiftPressed) {
                if (
                    contentContainer.contains(document.activeElement) &&
                    document.activeElement?.tagName === "TEXTAREA"
                ) {
                    event.preventDefault();

                    selectedTextareas.clear();
                    multipleTextAreasSelected = true;

                    const clickedRowContainerNumber = Number.parseInt(
                        (event.target as HTMLElement).parentElement!.parentElement!.id.split("-")[1],
                    );
                    const focusedElementRowNumber = Number.parseInt(
                        document.activeElement.parentElement!.parentElement!.id.split("-")[1],
                    );

                    const rowsRange = clickedRowContainerNumber - focusedElementRowNumber;
                    const rowsToSelect = Math.abs(rowsRange);

                    if (rowsRange > 0) {
                        for (let i = 0; i <= rowsToSelect; i++) {
                            const rowNumber = focusedElementRowNumber + i - 1;

                            const nextRowContainer = contentContainer.children[rowNumber] as HTMLDivElement;

                            const nextElement = nextRowContainer.lastElementChild!
                                .lastElementChild! as HTMLTextAreaElement;

                            nextElement.style.outlineColor = theme.outlineFocused;
                            selectedTextareas.set(rowNumber, nextElement.value);
                        }
                    } else {
                        for (let i = rowsToSelect; i >= 0; i--) {
                            const rowNumber = focusedElementRowNumber - i - 1;

                            const nextRowContainer = contentContainer.children[rowNumber] as HTMLDivElement;

                            const nextElement = nextRowContainer.lastElementChild!
                                .lastElementChild! as HTMLTextAreaElement;
                            nextElement.style.outlineColor = theme.outlineFocused;
                            selectedTextareas.set(rowNumber, nextElement.value);
                        }
                    }
                }
            } else {
                multipleTextAreasSelected = false;

                for (const rowNumber of selectedTextareas.keys()) {
                    const rowContainer = contentContainer.children[rowNumber] as HTMLDivElement;
                    (rowContainer.lastElementChild!.lastElementChild! as HTMLTextAreaElement).style.outlineColor = "";
                }
            }
        }
    });

    contentContainer.addEventListener("paste", async (event) => {
        const text = await readText();

        if (document.activeElement?.tagName === "TEXTAREA" && text.includes("\0")) {
            event.preventDefault();
            const clipboardTextSplit = text.split("\0");
            const textRows = clipboardTextSplit.length;

            if (textRows < 1) {
                return;
            } else {
                const rowContainer = document.activeElement.parentElement!.parentElement!;
                const rowContainerNumber = Number.parseInt(rowContainer.id.split("-")[1]);

                for (let i = 0; i < textRows; i++) {
                    const rowNumber = rowContainerNumber + i - 1;
                    const rowContainer = contentContainer.children[rowNumber] as HTMLDivElement;
                    const elementToReplace = rowContainer.lastElementChild!.lastElementChild! as HTMLTextAreaElement;

                    replacedTextareas.set(rowNumber, elementToReplace.value.replaceAll(text, ""));
                    elementToReplace.value = clipboardTextSplit[i];
                    elementToReplace.calculateHeight();
                }

                saved = false;
            }
        }
    });

    contentContainer.addEventListener("copy", async (event) => {
        if (multipleTextAreasSelected && document.activeElement?.tagName === "TEXTAREA") {
            event.preventDefault();

            const textarea = document.activeElement as HTMLTextAreaElement;
            selectedTextareas.set(
                Number.parseInt(textarea.parentElement!.parentElement!.id.split("-")[1]),
                textarea.value,
            );

            await writeText(Array.from(selectedTextareas.values()).join("\0"));
        }
    });

    bookmarksMenu.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        if (target.id === bookmarksMenu.id) {
            return;
        }

        const parts = target.textContent!.split("-");
        const state = parts[0];

        await changeState(state);
        contentContainer.children[Number.parseInt(parts[1])].scrollIntoView({
            inline: "center",
            block: "center",
        });
    });

    contentContainer.addEventListener("cut", async (event) => {
        if (multipleTextAreasSelected && document.activeElement?.tagName === "TEXTAREA") {
            event.preventDefault();
            await writeText(Array.from(selectedTextareas.values()).join("\0"));

            for (const rowNumber of selectedTextareas.keys()) {
                const rowContainer = contentContainer.children[rowNumber] as HTMLDivElement;
                (rowContainer.lastElementChild!.lastElementChild! as HTMLTextAreaElement).value = "";
            }

            saved = false;
        }
    });

    await listen("fetch-settings", async () => {
        await emit("settings", [settings, theme]);
    });

    await appWindow.onCloseRequested(async (event) => {
        await waitForSave();

        if (await exitConfirmation()) {
            if (settings.projectPath) {
                await writeTextFile(join(settings.projectPath, programDataDir, logFile), JSON.stringify(replaced));
                await writeTextFile(
                    join(settings.projectPath, programDataDir, bookmarksFile),
                    JSON.stringify(bookmarks),
                );

                const dataDirEntries = await readDir(join(settings.projectPath, programDataDir));

                for (const entry of dataDirEntries) {
                    const name = entry.name;

                    if (name === tempMapsDir) {
                        await removePath(join(settings.projectPath, programDataDir, tempMapsDir), { recursive: true });
                    } else if (entry.isFile && !["compile-settings.json", logFile, bookmarksFile].includes(name)) {
                        await removePath(join(settings.projectPath, programDataDir, name));
                    }
                }
            }

            await writeTextFile(settingsPath, JSON.stringify(settings), { baseDir: Resource });
            await exit();
        } else {
            event.preventDefault();
        }
    });
});
