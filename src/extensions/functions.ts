import { readDir } from "@tauri-apps/plugin-fs";
import { EngineType, Language, RowDeleteMode } from "../types/enums";
import { Localization } from "./localization";

export async function walkDir(path: string): Promise<string[]> {
    const entries: string[] = [];

    for (const entry of await readDir(path)) {
        const name = entry.name;

        if (entry.isDirectory) {
            for (const entry of await walkDir(join(path, name))) {
                entries.push(entry);
            }
        } else {
            entries.push(join(path, entry.name));
        }
    }

    return entries.sort();
}

export function applyTheme(sheet: CSSStyleSheet, theme: Theme | [string, string]) {
    if (Array.isArray(theme)) {
        const [id, value] = theme;

        for (const rule of sheet.cssRules) {
            if (id.endsWith("Focused") && rule.selectorText === `.${id}:focus`) {
                rule.style.setProperty(rule.style[0], value);
            } else if (id.endsWith("Hovered") && rule.selectorText === `.${id}:hover`) {
                rule.style.setProperty(rule.style[0], value);
            } else if (rule.selectorText === `.${id}`) {
                const styleLength = rule.style.length;
                if (styleLength > 1) {
                    for (let i = 0; i < styleLength; i++) {
                        rule.style.setProperty(rule.style[i], value);
                    }
                    continue;
                }

                rule.style.setProperty(rule.style[0], value);
            }
        }
    } else {
        for (const [key, value] of Object.entries(theme)) {
            for (const rule of sheet.cssRules) {
                if (key.endsWith("Focused") && rule.selectorText === `.${key}:focus`) {
                    const styleLength = rule.style.length;
                    if (styleLength > 1) {
                        for (let i = 0; i < styleLength; i++) {
                            rule.style.setProperty(rule.style[i], value);
                        }
                        continue;
                    }

                    rule.style.setProperty(rule.style[0], value);
                } else if (key.endsWith("Hovered") && rule.selectorText === `.${key}:hover`) {
                    const styleLength = rule.style.length;
                    if (styleLength > 1) {
                        for (let i = 0; i < styleLength; i++) {
                            rule.style.setProperty(rule.style[i], value);
                        }
                        continue;
                    }

                    rule.style.setProperty(rule.style[0], value);
                } else if (rule.selectorText === `.${key}`) {
                    const styleLength = rule.style.length;
                    if (styleLength > 1) {
                        for (let i = 0; i < styleLength; i++) {
                            rule.style.setProperty(rule.style[i], value);
                        }
                        continue;
                    }

                    rule.style.setProperty(rule.style[0], value);
                }
            }
        }
    }
}

export function applyLocalization(localization: Localization, theme?: Theme) {
    for (const [localizationKey, localizationString] of Object.entries(localization) as string[][]) {
        if (theme) {
            if (localizationKey in theme) {
                continue;
            }
        }

        const elements = document.querySelectorAll(`.${localizationKey}`) as NodeListOf<HTMLElement> | null;
        if (!elements) {
            continue;
        }

        if (localizationKey.endsWith("Title")) {
            for (const e of elements) {
                e.title = localizationString;
            }
        } else {
            for (const e of elements) {
                e.innerHTML = localizationString;
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

export function animateProgressText(progressText: HTMLElement, interval = 500) {
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
    }
}

export class CompileSettings {
    initialized: boolean;
    romanize: boolean;
    mapsProcessingMode: number;
    disableCustomProcessing: boolean;
    customOutputPath: {
        enabled: boolean;
        path: string;
    };
    disableProcessing: {
        enabled: boolean;
        of: {
            maps: boolean;
            other: boolean;
            system: boolean;
            plugins: boolean;
        };
    };
    doNotAskAgain: boolean;
    logging: boolean;

    constructor() {
        this.initialized = false;
        this.romanize = false;
        this.mapsProcessingMode = 0;
        this.disableCustomProcessing = false;
        this.customOutputPath = { enabled: false, path: "" };
        this.disableProcessing = { enabled: false, of: { maps: false, other: false, system: false, plugins: false } };
        this.doNotAskAgain = true;
        this.logging = false;
    }
}

export class Settings {
    language: Language;
    backup: {
        enabled: boolean;
        period: number;
        max: number;
    };
    theme: string;
    fontUrl: string;
    firstLaunch: boolean;
    projectPath: string;
    translation: { from: Intl.UnicodeBCP47LocaleIdentifier; to: Intl.UnicodeBCP47LocaleIdentifier };
    engineType: EngineType | null;
    rowDeleteMode: RowDeleteMode;
    displayGhostLines: boolean;
    checkForUpdates: boolean;

    constructor(language: Language) {
        this.language = language;
        this.backup = { enabled: true, period: 60, max: 99 };
        this.theme = "cool-zinc";
        this.fontUrl = "";
        this.firstLaunch = true;
        this.projectPath = "";
        this.translation = { from: "", to: "" };
        this.engineType = null;
        this.rowDeleteMode = RowDeleteMode.Disabled;
        this.displayGhostLines = false;
        this.checkForUpdates = true;
    }
}
