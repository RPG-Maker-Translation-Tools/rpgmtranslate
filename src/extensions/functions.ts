import { emit, once } from "@tauri-apps/api/event";
import { attachConsole } from "@tauri-apps/plugin-log";
import { EngineType } from "../types/enums";
import {
    AboutWindowLocalization,
    CompileWindowLocalization,
    Localization,
    PurgeWindowLocalization,
    ReadWindowLocalization,
    SettingsWindowLocalization,
} from "./localization";

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

export async function loadWindow(
    window: "about" | "read" | "compile" | "settings" | "purge",
): Promise<
    [
        ISettings,
        (
            | AboutWindowLocalization
            | ReadWindowLocalization
            | CompileWindowLocalization
            | SettingsWindowLocalization
            | PurgeWindowLocalization
        ),
        IProjectSettings,
    ]
> {
    await attachConsole();
    let settings!: ISettings, theme!: Theme, projectSettings!: IProjectSettings;

    await once<[ISettings, Theme, IProjectSettings]>("settings", (data) => {
        [settings, theme, projectSettings] = data.payload;
    });

    await emit("fetch-settings");

    await new Promise((resolve) => setTimeout(resolve, 100));

    applyTheme(getThemeStyleSheet()!, theme);

    let windowLocalization;
    switch (window) {
        case "about":
            windowLocalization = new AboutWindowLocalization(settings.language);
            break;
        case "read":
            windowLocalization = new ReadWindowLocalization(settings.language);
            break;
        case "compile":
            windowLocalization = new CompileWindowLocalization(settings.language);
            break;
        case "settings":
            windowLocalization = new SettingsWindowLocalization(settings.language);
            break;
        case "purge":
            windowLocalization = new PurgeWindowLocalization(settings.language);
            break;
    }

    applyLocalization(windowLocalization);

    return [settings, windowLocalization, projectSettings];
}
