import { loadWindow } from "./extensions/functions";
import { addToScope, walkDir } from "./extensions/invokes";
import "./extensions/math-extensions";
import { RowDeleteMode } from "./types/enums";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
const appWindow = getCurrentWebviewWindow();

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

async function fetchFonts(): Promise<FontObject> {
    const fontsObject = {} as FontObject;
    const fontPath = getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

    await addToScope({ path: fontPath });

    const entries = await walkDir(fontPath);

    for (const path of entries) {
        const extension = path.slice(-3);

        if (["ttf", "otf"].includes(extension)) {
            fontsObject[path] = path.slice(path.replaceAll("\\", "/").lastIndexOf("/") + 1);
        }
    }

    return fontsObject;
}

document.addEventListener("DOMContentLoaded", async () => {
    const [settings] = await loadWindow("settings");

    const backupCheck = document.getElementById("backup-check") as HTMLSpanElement;
    const backupSettings = document.getElementById("backup-settings") as HTMLDivElement;
    const backupMaxInput = document.getElementById("backup-max-input") as HTMLInputElement;
    const backupPeriodInput = document.getElementById("backup-period-input") as HTMLInputElement;
    const fontSelect = document.getElementById("font-select") as HTMLSelectElement;
    const rowDeleteModeSelect = document.getElementById("row-delete-mode-select") as HTMLSelectElement;
    const displayGhostLinesCheck = document.getElementById("display-ghost-lines-check") as HTMLSpanElement;
    const checkForUpdatesCheck = document.getElementById("check-for-updates-check") as HTMLSpanElement;

    backupMaxInput.value = settings.backup.max.toString();
    backupPeriodInput.value = settings.backup.period.toString();
    backupCheck.innerHTML = settings.backup.enabled ? "check" : "";

    if (typeof settings.rowDeleteMode !== "number") {
        settings.rowDeleteMode = RowDeleteMode.Disabled;
    }

    if (typeof settings.displayGhostLines !== "boolean") {
        settings.displayGhostLines = false;
    }

    if (typeof settings.checkForUpdates !== "boolean") {
        settings.checkForUpdates = true;
    }

    rowDeleteModeSelect.value = settings.rowDeleteMode.toString();
    displayGhostLinesCheck.innerHTML = settings.displayGhostLines ? "check" : "";
    checkForUpdatesCheck.innerHTML = settings.checkForUpdates ? "check" : "";

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

    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case checkForUpdatesCheck.id:
                if (!checkForUpdatesCheck.textContent) {
                    checkForUpdatesCheck.innerHTML = "check";
                    settings.checkForUpdates = true;
                } else {
                    checkForUpdatesCheck.innerHTML = "";
                    settings.checkForUpdates = false;
                }
                break;
            case displayGhostLinesCheck.id:
                if (!displayGhostLinesCheck.textContent) {
                    displayGhostLinesCheck.innerHTML = "check";
                    settings.displayGhostLines = true;
                } else {
                    displayGhostLinesCheck.innerHTML = "";
                    settings.displayGhostLines = false;
                }
                break;
            case backupCheck.id:
                if (!backupCheck.textContent) {
                    backupSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() => backupSettings.classList.replace("-translate-y-full", "translate-y-0"));

                    backupCheck.innerHTML = "check";
                    settings.backup.enabled = true;
                } else {
                    backupSettings.classList.replace("translate-y-0", "-translate-y-full");

                    backupSettings.addEventListener(
                        "transitionend",
                        () => backupSettings.classList.replace("flex", "hidden"),
                        {
                            once: true,
                        },
                    );

                    backupCheck.innerHTML = "";
                    settings.backup.enabled = false;
                }
                break;
        }
    });

    document.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case backupMaxInput.id: {
                backupMaxInput.value = backupMaxInput.value.replaceAll(/[^0-9]/g, "");

                const newBackupMax = Math.clamp(Number.parseInt(backupMaxInput.value), 1, 99);
                backupMaxInput.value = newBackupMax.toString();
                settings.backup.max = newBackupMax;
                break;
            }
            case backupPeriodInput.id: {
                backupPeriodInput.value = backupPeriodInput.value.replaceAll(/[^0-9]/g, "");

                const newBackupPeriod = Math.clamp(Number.parseInt(backupPeriodInput.value), 60, 3600);
                backupPeriodInput.value = newBackupPeriod.toString();
                settings.backup.period = newBackupPeriod;
                break;
            }
        }
    });

    document.addEventListener("change", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case fontSelect.id:
                for (const element of fontSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
                    if (element.value === fontSelect.value) {
                        settings.fontUrl = element.id.replaceAll("\\", "/");

                        const font = await new FontFace("font", `url(${convertFileSrc(settings.fontUrl)})`).load();
                        document.fonts.add(font);
                        document.body.style.fontFamily = "font";
                    }
                }
                break;
            case rowDeleteModeSelect.id:
                for (const element of rowDeleteModeSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
                    if (element.value === rowDeleteModeSelect.value) {
                        settings.rowDeleteMode = Number.parseInt(element.value);
                    }
                }
                break;
        }
    });

    if (settings.fontUrl) {
        for (const element of fontSelect.children as HTMLCollectionOf<HTMLOptionElement>) {
            if (element.value.includes(settings.fontUrl.slice(settings.fontUrl.lastIndexOf("/") + 1))) {
                fontSelect.value = element.value;
            }
        }
    }

    await appWindow.onCloseRequested(async () => {
        await emit("get-settings", settings);
    });
});
