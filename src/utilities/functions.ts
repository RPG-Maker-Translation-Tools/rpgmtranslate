import { emit, once } from "@tauri-apps/api/event";
import { message } from "@tauri-apps/plugin-dialog";
import { attachConsole } from "@tauri-apps/plugin-log";
import XRegExp from "xregexp";
import { EngineType, SearchFlags } from "../types/enums";
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
    const entries = Array.isArray(theme) ? [theme] : Object.entries(theme);

    for (const [id, value] of entries) {
        for (const rule of sheet.cssRules) {
            const selectorText = rule.selectorText;

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
    const baseText = progressText.textContent!.replace(/\.+$/, "");
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
    searchFlags: SearchFlagsObject,
): Promise<RegExp | null> {
    text = text.trim();
    if (!text) {
        return null;
    }

    const flags = searchFlags.flags;

    let regexpString =
        flags & SearchFlags.RegExp ? text : await invokeEscapeText({ text });

    if (flags & SearchFlags.WholeWord) {
        regexpString = `(?<!\\p{L})${regexpString}(?!\\p{L})`;
    }

    const regexpAttribute = flags & SearchFlags.CaseSensitive ? "g" : "gi";

    try {
        return XRegExp(regexpString, regexpAttribute);
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
    searchPanelFound: HTMLDivElement;
    searchPanelReplaced: HTMLDivElement;
    searchCurrentPage: HTMLSpanElement;
    searchTotalPages: HTMLSpanElement;
    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;
    saveButton: HTMLButtonElement;
    compileButton: HTMLButtonElement;
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
    compileMenu: HTMLDivElement;
    outputPathButton: HTMLButtonElement;
    outputPathInput: HTMLInputElement;
    cDisableMapsProcessingCheckbox: HTMLSpanElement;
    cDisableOtherProcessingCheckbox: HTMLSpanElement;
    cDisableSystemProcessingCheckbox: HTMLSpanElement;
    cDisablePluginsProcessingCheckbox: HTMLSpanElement;
    readMenu: HTMLDivElement;
    readingModeSelect: HTMLSelectElement;
    readingModeDescription: HTMLDivElement;
    mapsProcessingModeSelect: HTMLSelectElement;
    romanizeCheckbox: HTMLSpanElement;
    disableCustomProcessingCheckbox: HTMLSpanElement;
    rDisableMapsProcessingCheckbox: HTMLSpanElement;
    rDisableOtherProcessingCheckbox: HTMLSpanElement;
    rDisableSystemProcessingCheckbox: HTMLSpanElement;
    rDisablePluginsProcessingCheckbox: HTMLSpanElement;
    ignoreCheckbox: HTMLSpanElement;
    trimCheckbox: HTMLSpanElement;
    sortCheckbox: HTMLSpanElement;
    applyReadButton: HTMLDivElement;
    purgeMenu: HTMLDivElement;
    statCheckbox: HTMLSpanElement;
    leaveFilledCheckbox: HTMLSpanElement;
    purgeEmptyCheckbox: HTMLSpanElement;
    createIgnoreCheckbox: HTMLSpanElement;
    pDisableMapsProcessingCheckbox: HTMLSpanElement;
    pDisableOtherProcessingCheckbox: HTMLSpanElement;
    pDisableSystemProcessingCheckbox: HTMLSpanElement;
    pDisablePluginsProcessingCheckbox: HTMLSpanElement;
    applyPurgeButton: HTMLDivElement;
}

export function setupUi(
    window: "mainwindow" | "settingswindow",
): MainWindowUI | SettingsWindowUI {
    if (window === "mainwindow") {
        const topPanel = document.getElementById("top-panel") as HTMLDivElement;
        const topPanelButtonsDiv =
            topPanel.firstElementChild! as HTMLDivElement;
        const themeWindow = document.getElementById(
            "theme-window",
        ) as HTMLDivElement;
        const themeWindowBody = themeWindow.children[1];

        const compileMenu = document.getElementById(
            "compile-menu",
        ) as HTMLDivElement;
        const readMenu = document.getElementById("read-menu") as HTMLDivElement;
        const purgeMenu = document.getElementById(
            "purge-menu",
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
            searchPanel: document.getElementById(
                "search-results",
            ) as HTMLDivElement,
            searchPanelFound: document.getElementById(
                "search-content",
            ) as HTMLDivElement,
            searchPanelReplaced: document.getElementById(
                "replace-content",
            ) as HTMLDivElement,
            searchCurrentPage: document.getElementById(
                "search-current-page",
            ) as HTMLSpanElement,
            searchTotalPages: document.getElementById(
                "search-total-pages",
            ) as HTMLSpanElement,
            topPanel,
            topPanelButtonsDiv,
            saveButton: topPanelButtonsDiv.querySelector("#save-button")!,
            compileButton: topPanelButtonsDiv.querySelector("#compile-button")!,
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
            searchSwitch: document.getElementById(
                "switch-search-content",
            ) as HTMLDivElement,
            fromLanguageInput: topPanel.querySelector("#from-language-input")!,
            toLanguageInput: topPanel.querySelector("#to-language-input")!,
            compileMenu,
            outputPathButton: compileMenu.querySelector("#select-output-path")!,
            outputPathInput: compileMenu.querySelector("#output-path-input")!,
            cDisableMapsProcessingCheckbox: compileMenu.querySelector(
                "#disable-maps-processing-checkbox",
            )!,
            cDisableOtherProcessingCheckbox: compileMenu.querySelector(
                "#disable-other-processing-checkbox",
            )!,
            cDisableSystemProcessingCheckbox: compileMenu.querySelector(
                "#disable-system-processing-checkbox",
            )!,
            cDisablePluginsProcessingCheckbox: compileMenu.querySelector(
                "#disable-plugins-processing-checkbox",
            )!,
            readMenu,
            readingModeSelect: readMenu.querySelector("#reading-mode-select")!,
            readingModeDescription:
                readMenu.querySelector("#mode-description")!,
            mapsProcessingModeSelect: readMenu.querySelector(
                "#maps-processing-mode-select",
            )!,
            romanizeCheckbox: readMenu.querySelector("#romanize-checkbox")!,
            disableCustomProcessingCheckbox: readMenu.querySelector(
                "#custom-processing-checkbox",
            )!,
            rDisableMapsProcessingCheckbox: readMenu.querySelector(
                "#disable-maps-processing-checkbox",
            )!,
            rDisableOtherProcessingCheckbox: readMenu.querySelector(
                "#disable-other-processing-checkbox",
            )!,
            rDisableSystemProcessingCheckbox: readMenu.querySelector(
                "#disable-system-processing-checkbox",
            )!,
            rDisablePluginsProcessingCheckbox: readMenu.querySelector(
                "#disable-plugins-processing-checkbox",
            )!,
            ignoreCheckbox: readMenu.querySelector("#ignore-checkbox")!,
            trimCheckbox: readMenu.querySelector("#trim-checkbox")!,
            sortCheckbox: readMenu.querySelector("#sort-checkbox")!,
            applyReadButton: readMenu.querySelector("#apply-read-button")!,
            purgeMenu,
            statCheckbox: purgeMenu.querySelector("#stat-checkbox")!,
            leaveFilledCheckbox: purgeMenu.querySelector(
                "#leave-filled-checkbox",
            )!,
            purgeEmptyCheckbox: purgeMenu.querySelector(
                "#purge-empty-checkbox",
            )!,
            createIgnoreCheckbox: purgeMenu.querySelector(
                "#create-ignore-checkbox",
            )!,
            pDisableMapsProcessingCheckbox: purgeMenu.querySelector(
                "#disable-maps-processing-checkbox",
            )!,
            pDisableOtherProcessingCheckbox: purgeMenu.querySelector(
                "#disable-other-processing-checkbox",
            )!,
            pDisableSystemProcessingCheckbox: purgeMenu.querySelector(
                "#disable-system-processing-checkbox",
            )!,
            pDisablePluginsProcessingCheckbox: purgeMenu.querySelector(
                "#disable-plugins-processing-checkbox",
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
