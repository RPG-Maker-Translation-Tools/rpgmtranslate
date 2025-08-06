import {
    EngineType,
    SearchAction,
    SearchFlags,
    WindowType,
} from "../types/enums";
import { ProjectSettings } from "../types/projectsettings";
import { Settings } from "../types/settings";
import {
    EVENT_ID_COMMENT,
    MAP_ID_COMMENT,
    PLUGIN_ID_COMMENT,
    SCRIPT_ID_COMMENT,
    SECOND_MS,
    SYSTEM_ENTRY_COMMENT,
} from "./constants";
import { invokeEscapeText } from "./invokes";
import {
    AboutWindowLocalization,
    Localization,
    SettingsWindowLocalization,
} from "./localization";

import XRegExp from "xregexp";

import { emit, once } from "@tauri-apps/api/event";
import { message } from "@tauri-apps/plugin-dialog";
import { attachConsole, error } from "@tauri-apps/plugin-log";

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

        return {
            tabContentHeader: document.getElementById(
                "tab-content-header",
            ) as HTMLDivElement,
            tabContentContainer: document.getElementById(
                "tab-content-container",
            ) as HTMLDivElement,
            tabContent: document.getElementById(
                "tab-content",
            ) as HTMLDivElement,
            bottomScrollContent: document.getElementById(
                "bottom-scroll-content",
            ) as HTMLDivElement,
            bottomScrollBar: document.getElementById(
                "bottom-scroll-bar",
            ) as HTMLDivElement,

            batchButton: document.getElementById(
                "batch-button",
            ) as HTMLDivElement,
            batchWindow: document.getElementById(
                "batch-window",
            ) as HTMLDivElement,

            leftPanel: document.getElementById("left-panel") as HTMLDivElement,
            topPanel,
            topPanelButtonsDiv,
            saveButton: topPanelButtonsDiv.getElementById("save-button")!,
            writeButton: topPanelButtonsDiv.getElementById("write-button")!,
            themeButton: topPanelButtonsDiv.getElementById("theme-button")!,
            themeMenu: document.getElementById("theme-menu") as HTMLDivElement,
            toolsButton: topPanelButtonsDiv.getElementById("tools-button")!,
            readButton: topPanelButtonsDiv.getElementById("read-button")!,
            purgeButton: topPanelButtonsDiv.getElementById("purge-button")!,
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
            createThemeButton: themeWindow.getElementById("create-theme")!,
            closeButton: themeWindow.getElementById("close-button")!,
            fromLanguageInput: topPanel.getElementById("from-language-input")!,
            toLanguageInput: topPanel.getElementById("to-language-input")!,
            writeMenu,
            outputPathButton: writeMenu.getElementById("select-output-path")!,
            outputPathInput: writeMenu.getElementById("output-path-input")!,
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
            readModeSelect: readMenu.getElementById("read-mode-select")!,
            readModeDescription: readMenu.getElementById("mode-description")!,
            duplicateModeSelect: readMenu.querySelector(
                "#duplicate-mode-select",
            )!,
            romanizeCheckbox: readMenu.getElementById("romanize-checkbox")!,
            disableCustomProcessingCheckbox: readMenu.querySelector(
                "#custom-processing-checkbox",
            )!,
            ignoreCheckbox: readMenu.getElementById("ignore-checkbox")!,
            trimCheckbox: readMenu.getElementById("trim-checkbox")!,
            applyReadButton: readMenu.getElementById("apply-read-button")!,
            purgeMenu,
            createIgnoreCheckbox: purgeMenu.querySelector(
                "#create-ignore-checkbox",
            )!,
            applyPurgeButton: purgeMenu.getElementById("apply-purge-button")!,
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

export function getFileComment(filename: string): string {
    let fileComment: string;

    if (filename.startsWith("map")) {
        fileComment = MAP_ID_COMMENT;
    } else if (filename.startsWith("system")) {
        fileComment = SYSTEM_ENTRY_COMMENT;
    } else if (filename.startsWith("scripts")) {
        fileComment = SCRIPT_ID_COMMENT;
    } else if (filename.startsWith("plugins")) {
        fileComment = PLUGIN_ID_COMMENT;
    } else {
        fileComment = EVENT_ID_COMMENT;
    }

    return fileComment;
}

/**
 * Compares two strings with different line break styles, in this case, `\#` and `\n`.
 * @param clbStr - string with custom `\#` line breaks.
 * @param dlbStr - string with default `\n` line breaks.
 */
export function lbcmp(clbStr: string, dlbStr: string): boolean {
    let i = 0,
        j = 0;

    while (i < clbStr.length && j < dlbStr.length) {
        const clbChar = clbStr[i];
        const dlbChar = dlbStr[j];

        if (clbChar === "\\" && clbStr[i + 1] === "#") {
            if (dlbChar !== "\n") {
                return false;
            }

            i += 2;
            j += 1;
        } else {
            if (clbChar !== dlbChar) {
                return false;
            }

            i += 1;
            j += 1;
        }
    }

    return i === clbStr.length && j === dlbStr.length;
}

export async function logSplitError(row: number) {
    await error(`Line can't be split at row ${row}`);
}

export function objectIsEmpty(obj: object) {
    // eslint-disable-next-line sonarjs/no-unused-vars
    for (const _ in obj) {
        return false;
    }

    return true;
}
