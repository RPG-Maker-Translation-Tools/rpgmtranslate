import { emit, once } from "@tauri-apps/api/event";
import { message } from "@tauri-apps/plugin-dialog";
import { attachConsole, error } from "@tauri-apps/plugin-log";
import XRegExp from "xregexp";
import {
    EngineType,
    SearchAction,
    SearchFlags,
    WindowType,
} from "../types/enums";
import { ProjectSettings } from "../types/projectsettings";
import { Settings } from "../types/settings";
import { SECOND_MS } from "./constants";
import { invokeEscapeText } from "./invokes";
import {
    AboutWindowLocalization,
    Localization,
    SettingsWindowLocalization,
} from "./localization";

export function applyTheme(
    sheet: CSSStyleSheet,
    theme: Theme | [string, string],
) {
    const entries: [string, string][] = Array.isArray(theme)
        ? [theme]
        : Object.entries(theme);

    for (const [id, value] of entries) {
        for (const rule of sheet.cssRules) {
            const selectorText = rule.selectorText;

            if (!selectorText) {
                continue;
            }

            if (selectorText.startsWith(`.${id}`)) {
                for (const ruleStyle of rule.style) {
                    rule.style.setProperty(ruleStyle, value);
                }
            }
        }
    }
}

export function applyLocalization(localization: Localization, theme?: Theme) {
    for (const [localizationKey, localizationString] of Object.entries(
        localization,
    ) as string[][]) {
        if (theme) {
            if (localizationKey in theme) {
                continue;
            }
        }

        const elements = document.querySelectorAll(
            `.${localizationKey}`,
        ) as NodeListOf<HTMLElement> | null;
        if (!elements) {
            continue;
        }

        if (localizationKey.endsWith("Title")) {
            for (const element of elements) {
                element.title = localizationString;
            }
        } else {
            for (const element of elements) {
                element.innerHTML = localizationString;
            }
        }
    }
}

export function getThemeStyleSheet(): CSSStyleSheet | undefined {
    for (const styleSheet of document.styleSheets) {
        for (const rule of styleSheet.cssRules) {
            if (rule.selectorText === ".backgroundDark") {
                return styleSheet;
            }
        }
    }
}

export function animateProgressText(
    progressText: HTMLElement,
    interval = SECOND_MS / 2,
) {
    // eslint-disable-next-line sonarjs/slow-regex
    const baseText = progressText.textContent.replace(/\.+$/, "");
    let dots = 0;

    function updateText() {
        progressText.textContent = baseText + ".".repeat(dots);
        dots = (dots + 1) % 4;
    }

    return setInterval(updateText, interval);
}

export const join = (...strings: string[]): string => strings.join("/");

export function determineExtension(engineType: EngineType): string {
    switch (engineType) {
        case EngineType.New:
            return ".json";
        case EngineType.VXAce:
            return ".rvdata2";
        case EngineType.VX:
            return ".rvdata";
        case EngineType.XP:
            return ".rxdata";
        default:
            return "";
    }
}

export async function loadWindow(
    window: "about" | "settings",
): Promise<[Settings, Localization, ProjectSettings]> {
    await attachConsole();
    let settings!: Settings, theme!: Theme, projectSettings!: ProjectSettings;

    await once<[Settings, Theme, ProjectSettings]>("settings", (data) => {
        [settings, theme, projectSettings] = data.payload;
    });

    await emit("fetch-settings");

    // eslint-disable-next-line no-magic-numbers
    await new Promise((resolve) => setTimeout(resolve, SECOND_MS / 10));

    applyTheme(getThemeStyleSheet()!, theme);

    let windowLocalization: Localization;
    switch (window) {
        case "about":
            windowLocalization = new AboutWindowLocalization(settings.language);
            break;
        case "settings":
            windowLocalization = new SettingsWindowLocalization(
                settings.language,
            );
            break;
    }

    applyLocalization(windowLocalization);
    return [settings, windowLocalization, projectSettings];
}

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
export const tw = (
    strings: TemplateStringsArray,
    ...values: string[]
): string => String.raw({ raw: strings }, ...values);

export async function createRegExp(
    text: string,
    searchFlagsObject: SearchFlagsObject,
    searchAction: SearchAction,
): Promise<RegExp | null> {
    text = text.trim();
    if (!text) {
        return null;
    }

    const searchFlags = searchFlagsObject.flags;

    let expression =
        searchFlags & SearchFlags.RegExp ? text : await invokeEscapeText(text);

    if (searchFlags & SearchFlags.WholeWord) {
        expression = `(?<!\\p{L})${expression}(?!\\p{L})`;
    }

    if (searchAction === SearchAction.Put) {
        expression = `^${expression}$`;
    }

    const flags = searchFlags & SearchFlags.CaseSensitive ? "g" : "gi";

    try {
        return XRegExp(expression, flags);
    } catch (err) {
        await message(`Invalid regular expression. (${text}), ${err})`);
        return null;
    }
}

export function escapeHTML(string: string) {
    return string.replace(/[&<>"']/g, function (match) {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[match];
    });
}

export interface MainWindowUI {
    tabContent: HTMLDivElement;
    searchInput: HTMLTextAreaElement;
    replaceInput: HTMLTextAreaElement;
    leftPanel: HTMLDivElement;
    searchPanel: HTMLDivElement;
    searchPanelContent: HTMLDivElement;
    searchCurrentPage: HTMLSpanElement;
    searchTotalPages: HTMLSpanElement;
    pageSelectContainer: HTMLDivElement;
    logFileSelect: HTMLSelectElement;
    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;
    saveButton: HTMLButtonElement;
    writeButton: HTMLButtonElement;
    themeButton: HTMLButtonElement;
    themeMenu: HTMLDivElement;
    toolsButton: HTMLButtonElement;
    translateToolsMenuButton: HTMLElement;
    toolsMenu: HTMLDivElement;
    readButton: HTMLButtonElement;
    purgeButton: HTMLButtonElement;
    searchCaseButton: HTMLButtonElement;
    searchWholeButton: HTMLButtonElement;
    searchRegexButton: HTMLButtonElement;
    searchModeSelect: HTMLSelectElement;
    searchLocationButton: HTMLButtonElement;
    goToRowInput: HTMLInputElement;
    menuBar: HTMLDivElement;
    fileMenuButton: HTMLButtonElement;
    helpMenuButton: HTMLButtonElement;
    languageMenuButton: HTMLButtonElement;
    fileMenu: HTMLDivElement;
    helpMenu: HTMLDivElement;
    languageMenu: HTMLDivElement;
    currentTabDiv: HTMLDivElement;
    createThemeMenuButton: HTMLButtonElement;
    searchMenu: HTMLDivElement;
    searchButton: HTMLButtonElement;
    bookmarksButton: HTMLButtonElement;
    bookmarksMenu: HTMLDivElement;
    projectStatus: HTMLDivElement;
    progressMeterContainer: HTMLDivElement;
    globalProgressMeter: HTMLDivElement;
    gameInfo: HTMLDivElement;
    currentGameEngine: HTMLDivElement;
    currentGameTitle: HTMLInputElement;
    themeWindow: HTMLDivElement;
    themeWindowBody: Element;
    createThemeButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    searchSwitch: HTMLDivElement;
    fromLanguageInput: HTMLInputElement;
    toLanguageInput: HTMLInputElement;
    writeMenu: HTMLDivElement;
    outputPathButton: HTMLButtonElement;
    outputPathInput: HTMLInputElement;
    disableMapProcessingCheckbox: HTMLSpanElement;
    disableOtherProcessingCheckbox: HTMLSpanElement;
    disableSystemProcessingCheckbox: HTMLSpanElement;
    disablePluginProcessingCheckbox: HTMLSpanElement;
    readMenu: HTMLDivElement;
    readModeSelect: HTMLSelectElement;
    readModeDescription: HTMLDivElement;
    duplicateModeSelect: HTMLSelectElement;
    romanizeCheckbox: HTMLSpanElement;
    disableCustomProcessingCheckbox: HTMLSpanElement;
    ignoreCheckbox: HTMLSpanElement;
    trimCheckbox: HTMLSpanElement;
    applyReadButton: HTMLDivElement;
    purgeMenu: HTMLDivElement;
    createIgnoreCheckbox: HTMLSpanElement;
    applyPurgeButton: HTMLDivElement;
}

export function setupUi(window: WindowType): MainWindowUI | SettingsWindowUI {
    if (window === WindowType.Main) {
        const topPanel = document.getElementById("top-panel") as HTMLDivElement;
        const topPanelButtonsDiv =
            topPanel.firstElementChild! as HTMLDivElement;
        const themeWindow = document.getElementById(
            "theme-window",
        ) as HTMLDivElement;
        const themeWindowBody = themeWindow.children[1];

        const writeMenu = document.getElementById(
            "write-menu",
        ) as HTMLDivElement;
        const readMenu = document.getElementById("read-menu") as HTMLDivElement;
        const purgeMenu = document.getElementById(
            "purge-menu",
        ) as HTMLDivElement;

        const searchPanel = document.getElementById(
            "search-panel",
        ) as HTMLDivElement;

        return {
            tabContent: document.getElementById(
                "tab-content",
            ) as HTMLDivElement,
            searchInput: document.getElementById(
                "search-input",
            ) as HTMLTextAreaElement,
            replaceInput: document.getElementById(
                "replace-input",
            ) as HTMLTextAreaElement,
            leftPanel: document.getElementById("left-panel") as HTMLDivElement,
            searchPanel,
            searchPanelContent: searchPanel.querySelector(
                "#search-panel-content",
            )!,
            searchCurrentPage: searchPanel.querySelector(
                "#search-current-page",
            )!,
            searchTotalPages: searchPanel.querySelector("#search-total-pages")!,
            searchSwitch: searchPanel.querySelector("#switch-content")!,
            pageSelectContainer: searchPanel.querySelector(
                "#page-select-container",
            )!,
            logFileSelect: searchPanel.querySelector("#log-file-select")!,
            topPanel,
            topPanelButtonsDiv,
            saveButton: topPanelButtonsDiv.querySelector("#save-button")!,
            writeButton: topPanelButtonsDiv.querySelector("#write-button")!,
            themeButton: topPanelButtonsDiv.querySelector("#theme-button")!,
            themeMenu: document.getElementById("theme-menu") as HTMLDivElement,
            toolsButton: topPanelButtonsDiv.querySelector("#tools-button")!,
            translateToolsMenuButton: document.getElementById(
                "translate-tools-menu-button",
            )!,
            toolsMenu: document.getElementById("tools-menu") as HTMLDivElement,
            readButton: topPanelButtonsDiv.querySelector("#read-button")!,
            purgeButton: topPanelButtonsDiv.querySelector("#purge-button")!,
            searchCaseButton: document.getElementById(
                "case-button",
            ) as HTMLButtonElement,
            searchWholeButton: document.getElementById(
                "whole-button",
            ) as HTMLButtonElement,
            searchRegexButton: document.getElementById(
                "regex-button",
            ) as HTMLButtonElement,
            searchModeSelect: document.getElementById(
                "search-mode",
            ) as HTMLSelectElement,
            searchLocationButton: document.getElementById(
                "location-button",
            ) as HTMLButtonElement,
            goToRowInput: document.getElementById(
                "goto-row-input",
            ) as HTMLInputElement,
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
            currentTabDiv: document.getElementById(
                "current-tab",
            ) as HTMLDivElement,
            createThemeMenuButton: document.getElementById(
                "create-theme-menu-button",
            ) as HTMLButtonElement,
            searchMenu: document.getElementById(
                "search-menu",
            ) as HTMLDivElement,
            searchButton: document.getElementById(
                "search-button",
            ) as HTMLButtonElement,
            bookmarksButton: document.getElementById(
                "bookmarks-button",
            ) as HTMLButtonElement,
            bookmarksMenu: document.getElementById(
                "bookmarks-menu",
            ) as HTMLDivElement,
            projectStatus: document.getElementById(
                "project-status",
            ) as HTMLDivElement,
            progressMeterContainer: document.getElementById(
                "progress-meter-container",
            ) as HTMLDivElement,
            globalProgressMeter: document.getElementById(
                "progress-meter",
            ) as HTMLDivElement,
            gameInfo: document.getElementById("game-info") as HTMLDivElement,
            currentGameEngine: document.getElementById(
                "game-engine",
            ) as HTMLDivElement,
            currentGameTitle: document.getElementById(
                "game-title",
            ) as HTMLInputElement,
            themeWindow,
            themeWindowBody,
            createThemeButton: themeWindow.querySelector("#create-theme")!,
            closeButton: themeWindow.querySelector("#close-button")!,
            fromLanguageInput: topPanel.querySelector("#from-language-input")!,
            toLanguageInput: topPanel.querySelector("#to-language-input")!,
            writeMenu,
            outputPathButton: writeMenu.querySelector("#select-output-path")!,
            outputPathInput: writeMenu.querySelector("#output-path-input")!,
            disableMapProcessingCheckbox: writeMenu.querySelector(
                "#disable-maps-processing-checkbox",
            )!,
            disableOtherProcessingCheckbox: writeMenu.querySelector(
                "#disable-other-processing-checkbox",
            )!,
            disableSystemProcessingCheckbox: writeMenu.querySelector(
                "#disable-system-processing-checkbox",
            )!,
            disablePluginProcessingCheckbox: writeMenu.querySelector(
                "#disable-plugins-processing-checkbox",
            )!,
            readMenu,
            readModeSelect: readMenu.querySelector("#read-mode-select")!,
            readModeDescription: readMenu.querySelector("#mode-description")!,
            duplicateModeSelect: readMenu.querySelector(
                "#duplicate-mode-select",
            )!,
            romanizeCheckbox: readMenu.querySelector("#romanize-checkbox")!,
            disableCustomProcessingCheckbox: readMenu.querySelector(
                "#custom-processing-checkbox",
            )!,
            ignoreCheckbox: readMenu.querySelector("#ignore-checkbox")!,
            trimCheckbox: readMenu.querySelector("#trim-checkbox")!,
            applyReadButton: readMenu.querySelector("#apply-read-button")!,
            purgeMenu,
            createIgnoreCheckbox: purgeMenu.querySelector(
                "#create-ignore-checkbox",
            )!,
            applyPurgeButton: purgeMenu.querySelector("#apply-purge-button")!,
        };
    } else {
        const backupCheck = document.getElementById(
            "backup-check",
        ) as HTMLSpanElement;
        const backupSettings = document.getElementById(
            "backup-settings",
        ) as HTMLDivElement;
        const backupMaxInput = document.getElementById(
            "backup-max-input",
        ) as HTMLInputElement;
        const backupPeriodInput = document.getElementById(
            "backup-period-input",
        ) as HTMLInputElement;
        const fontSelect = document.getElementById(
            "font-select",
        ) as HTMLSelectElement;
        const rowDeleteModeSelect = document.getElementById(
            "row-delete-mode-select",
        ) as HTMLSelectElement;
        const displayGhostLinesCheck = document.getElementById(
            "display-ghost-lines-check",
        ) as HTMLSpanElement;
        const checkForUpdatesCheck = document.getElementById(
            "check-for-updates-check",
        ) as HTMLSpanElement;

        return {
            backupCheck,
            backupSettings,
            backupMaxInput,
            backupPeriodInput,
            fontSelect,
            rowDeleteModeSelect,
            displayGhostLinesCheck,
            checkForUpdatesCheck,
        };
    }
}

export function logErrorIO(path: string, err: unknown) {
    void error(`${path}: IO error occured: ${err}`);
}
