import { applyLocalization, applyTheme, getThemeStyleSheet, join } from "./extensions/functions";
import { SettingsWindowLocalization } from "./extensions/localization";
import "./extensions/math-extensions";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, once } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readDir } from "@tauri-apps/plugin-fs";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
const appWindow = getCurrentWebviewWindow();

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

document.addEventListener("DOMContentLoaded", async () => {
    let settings!: Settings;
    let theme!: Theme;

    await once<[Settings, Theme]>("settings", (data) => {
        [settings, theme] = data.payload;
    });

    await emit("fetch-settings");

    await new Promise((resolve) => setTimeout(resolve, 100));

    applyTheme(getThemeStyleSheet()!, theme);

    const windowLocalization = new SettingsWindowLocalization(settings.language);
    applyLocalization(windowLocalization);

    const backupCheck = document.getElementById("backup-check") as HTMLSpanElement;
    const backupSettings = document.getElementById("backup-settings") as HTMLDivElement;
    const backupMaxInput = document.getElementById("backup-max-input") as HTMLInputElement;
    const backupPeriodInput = document.getElementById("backup-period-input") as HTMLInputElement;
    const fromLanguageInput = document.getElementById("from-language-input") as HTMLInputElement;
    const toLanguageInput = document.getElementById("to-language-input") as HTMLInputElement;
    const fontSelect = document.getElementById("font-select") as HTMLSelectElement;

    let fontUrl = "";

    async function fetchFonts(): Promise<FontObject> {
        const fontsObject = {} as FontObject;
        const fontPath = getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

        for (const entry of await readDir(fontPath)) {
            const name = entry.name;
            const extension = name.slice(-3);

            if (["ttf", "otf"].includes(extension)) {
                fontsObject[join(fontPath, name)] = name;
            }
        }

        return fontsObject;
    }

    backupMaxInput.value = settings.backup.max.toString();
    backupPeriodInput.value = settings.backup.period.toString();
    backupCheck.innerHTML = settings.backup.enabled ? "check" : "";

    if (typeof settings.from !== "string") {
        settings.from = "";
    }

    if (typeof settings.to !== "string") {
        settings.to = "";
    }

    fromLanguageInput.value = settings.from;
    toLanguageInput.value = settings.to;

    if (!backupCheck.textContent) {
        backupSettings.classList.add("hidden");
        backupSettings.classList.add("-translate-y-full");
    } else {
        backupSettings.classList.add("flex");
        backupSettings.classList.add("translate-y-0");
    }

    for (const [path, name] of Object.entries((await fetchFonts()) as Record<string, string>)) {
        const optionElement = document.createElement("option");

        optionElement.id = path;
        optionElement.innerHTML = optionElement.value = name;

        fontSelect.appendChild(optionElement);
    }

    fontSelect.addEventListener("change", () => {
        for (const element of fontSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
            if (element.value === fontSelect.value) {
                fontUrl = convertFileSrc(element.id);
            }
        }
    });

    backupCheck.addEventListener("click", () => {
        if (!backupCheck.textContent) {
            backupSettings.classList.replace("hidden", "flex");

            requestAnimationFrame(() => backupSettings.classList.replace("-translate-y-full", "translate-y-0"));

            backupCheck.innerHTML = "check";
        } else {
            backupSettings.classList.replace("translate-y-0", "-translate-y-full");

            backupSettings.addEventListener("transitionend", () => backupSettings.classList.replace("flex", "hidden"), {
                once: true,
            });

            backupCheck.innerHTML = "";
        }
    });

    backupMaxInput.addEventListener("input", () => {
        backupMaxInput.value = backupMaxInput.value.replaceAll(/[^0-9]/g, "");
        backupMaxInput.value = Math.clamp(Number.parseInt(backupMaxInput.value), 1, 99).toString();
    });

    backupPeriodInput.addEventListener("input", () => {
        backupPeriodInput.value = backupPeriodInput.value.replaceAll(/[^0-9]/g, "");
        backupPeriodInput.value = Math.clamp(Number.parseInt(backupPeriodInput.value), 60, 3600).toString();
    });

    fromLanguageInput.addEventListener("blur", () => {
        try {
            new Intl.Locale(fromLanguageInput.value);
        } catch {
            alert(windowLocalization.incorrectLanguageTag);
            fromLanguageInput.value = settings.from;
        }
    });

    toLanguageInput.addEventListener("blur", () => {
        try {
            new Intl.Locale(toLanguageInput.value);
        } catch {
            alert(windowLocalization.incorrectLanguageTag);
            toLanguageInput.value = settings.to;
        }
    });

    toLanguageInput.addEventListener("input", () => {
        toLanguageInput.value = toLanguageInput.value.replaceAll(/[^a-z]/g, "");
    });

    await appWindow.onCloseRequested(async () => {
        await emit("get-settings", [
            Boolean(backupCheck.textContent),
            Number.parseInt(backupMaxInput.value),
            Number.parseInt(backupPeriodInput.value),
            fromLanguageInput.value,
            toLanguageInput.value,
            fontUrl,
        ]);
    });
});
