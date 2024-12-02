import { applyLocalization, applyTheme, getThemeStyleSheet, walkDir } from "./extensions/functions";
import { SettingsWindowLocalization } from "./extensions/localization";
import "./extensions/math-extensions";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, once } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
import { addToScope } from "./extensions/invokes";
import { RowDeleteMode } from "./types/enums";
const appWindow = getCurrentWebviewWindow();

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

async function fetchFonts(): Promise<FontObject> {
    const fontsObject = {} as FontObject;
    const fontPath = getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

    await addToScope({ path: fontPath });

    const entries: string[] = await walkDir(fontPath);

    for (const path of entries) {
        const extension = path.slice(-3);

        if (["ttf", "otf"].includes(extension)) {
            fontsObject[path] = path.slice(path.replaceAll("\\", "/").lastIndexOf("/"));
        }
    }

    return fontsObject;
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
    const rowDeleteModeSelect = document.getElementById("row-delete-mode-select") as HTMLSelectElement;

    backupMaxInput.value = settings.backup.max.toString();
    backupPeriodInput.value = settings.backup.period.toString();
    backupCheck.innerHTML = settings.backup.enabled ? "check" : "";

    if (typeof settings.translation !== "object") {
        settings.translation = { from: "", to: "" };
    }

    if (typeof settings.rowDeleteMode !== "number") {
        settings.rowDeleteMode = RowDeleteMode.Disabled;
    }

    rowDeleteModeSelect.value = settings.rowDeleteMode.toString();
    fromLanguageInput.value = settings.translation.from;
    toLanguageInput.value = settings.translation.to;

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

    fontSelect.addEventListener("change", async () => {
        for (const element of fontSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
            if (element.value === fontSelect.value) {
                settings.fontUrl = element.id;

                const font = await new FontFace("font", `url(${convertFileSrc(settings.fontUrl)})`).load();
                document.fonts.add(font);
                document.body.style.fontFamily = "font";
            }
        }
    });

    backupCheck.addEventListener("click", () => {
        if (!backupCheck.textContent) {
            backupSettings.classList.replace("hidden", "flex");

            requestAnimationFrame(() => backupSettings.classList.replace("-translate-y-full", "translate-y-0"));

            backupCheck.innerHTML = "check";
            settings.backup.enabled = true;
        } else {
            backupSettings.classList.replace("translate-y-0", "-translate-y-full");

            backupSettings.addEventListener("transitionend", () => backupSettings.classList.replace("flex", "hidden"), {
                once: true,
            });

            backupCheck.innerHTML = "";
            settings.backup.enabled = false;
        }
    });

    backupMaxInput.addEventListener("input", () => {
        backupMaxInput.value = backupMaxInput.value.replaceAll(/[^0-9]/g, "");

        const newBackupMax = Math.clamp(Number.parseInt(backupMaxInput.value), 1, 99);
        backupMaxInput.value = newBackupMax.toString();
        settings.backup.max = newBackupMax;
    });

    backupPeriodInput.addEventListener("input", () => {
        backupPeriodInput.value = backupPeriodInput.value.replaceAll(/[^0-9]/g, "");

        const newBackupPeriod = Math.clamp(Number.parseInt(backupPeriodInput.value), 60, 3600);
        backupPeriodInput.value = newBackupPeriod.toString();
        settings.backup.period = newBackupPeriod;
    });

    fromLanguageInput.addEventListener("blur", () => {
        try {
            new Intl.Locale(fromLanguageInput.value);
            settings.translation.from = fromLanguageInput.value;
        } catch {
            alert(windowLocalization.incorrectLanguageTag);
            fromLanguageInput.value = settings.translation.from;
        }
    });

    toLanguageInput.addEventListener("blur", () => {
        try {
            new Intl.Locale(toLanguageInput.value);
            settings.translation.to = toLanguageInput.value;
        } catch {
            alert(windowLocalization.incorrectLanguageTag);
            toLanguageInput.value = settings.translation.to;
        }
    });

    fromLanguageInput.addEventListener("input", () => {
        fromLanguageInput.value = fromLanguageInput.value.replaceAll(/[^a-z]/g, "");
    });

    toLanguageInput.addEventListener("input", () => {
        toLanguageInput.value = toLanguageInput.value.replaceAll(/[^a-z]/g, "");
    });

    rowDeleteModeSelect.addEventListener("change", () => {
        for (const element of rowDeleteModeSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
            if (element.value === rowDeleteModeSelect.value) {
                settings.rowDeleteMode = Number.parseInt(element.value);
            }
        }
    });

    await appWindow.onCloseRequested(async () => {
        await emit("get-settings", settings);
    });
});
