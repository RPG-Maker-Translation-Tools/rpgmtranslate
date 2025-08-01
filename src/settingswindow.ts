import { WindowType } from "./types/enums";
import {
    MAX_BACKUP_PERIOD,
    MAX_BACKUPS,
    MIN_BACKUP_PERIOD,
} from "./utilities/constants";
import "./utilities/extensions";
import { loadWindow, setupUi as setupUI } from "./utilities/functions";
import { expandScope, invokeWalkDir } from "./utilities/invokes";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
const APP_WINDOW = getCurrentWebviewWindow();

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

async function fetchFonts(): Promise<FontObject> {
    const fontsObject = {} as FontObject;
    const fontPath =
        getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

    await expandScope(fontPath);
    const entries = await invokeWalkDir(fontPath);

    for (const path of entries) {
        const extension = path.slice(-3);

        if (["ttf", "otf"].includes(extension)) {
            fontsObject[path] = path.slice(
                path.replaceAll("\\", "/").lastIndexOf("/") + 1,
            );
        }
    }

    return fontsObject;
}

document.addEventListener("DOMContentLoaded", async () => {
    const [settings] = await loadWindow("settings");
    const UI = setupUI(WindowType.Settings) as SettingsWindowUI;

    UI.backupMaxInput.value = settings.backup.max.toString();
    UI.backupPeriodInput.value = settings.backup.period.toString();
    UI.backupCheck.innerHTML = settings.backup.enabled ? "check" : "";
    UI.rowDeleteModeSelect.value = settings.rowDeleteMode.toString();
    UI.displayGhostLinesCheck.innerHTML = settings.displayGhostLines
        ? "check"
        : "";
    UI.checkForUpdatesCheck.innerHTML = settings.checkForUpdates ? "check" : "";

    if (UI.backupCheck.innerText.empty()) {
        UI.backupSettings.classList.add("flex");
        UI.backupSettings.classList.add("translate-y-0");
    } else {
        UI.backupSettings.classList.add("hidden");
        UI.backupSettings.classList.add("-translate-y-full");
    }

    for (const [path, name] of Object.entries(
        (await fetchFonts()) as Record<string, string>,
    )) {
        const optionElement = document.createElement("option");

        optionElement.id = path;
        optionElement.innerHTML = optionElement.value = name;

        UI.fontSelect.appendChild(optionElement);
    }

    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case UI.checkForUpdatesCheck.id:
                if (UI.checkForUpdatesCheck.innerText.empty()) {
                    UI.checkForUpdatesCheck.innerHTML = "";
                    settings.checkForUpdates = false;
                } else {
                    UI.checkForUpdatesCheck.innerHTML = "check";
                    settings.checkForUpdates = true;
                }
                break;
            case UI.displayGhostLinesCheck.id:
                if (UI.displayGhostLinesCheck.innerText.empty()) {
                    UI.displayGhostLinesCheck.innerHTML = "";
                    settings.displayGhostLines = false;
                } else {
                    UI.displayGhostLinesCheck.innerHTML = "check";
                    settings.displayGhostLines = true;
                }
                break;
            case UI.backupCheck.id:
                if (UI.backupCheck.innerText.empty()) {
                    UI.backupSettings.classList.replace(
                        "translate-y-0",
                        "-translate-y-full",
                    );

                    UI.backupSettings.addEventListener(
                        "transitionend",
                        () =>
                            UI.backupSettings.classList.replace(
                                "flex",
                                "hidden",
                            ),
                        {
                            once: true,
                        },
                    );

                    UI.backupCheck.innerHTML = "";
                    settings.backup.enabled = false;
                } else {
                    UI.backupSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() =>
                        UI.backupSettings.classList.replace(
                            "-translate-y-full",
                            "translate-y-0",
                        ),
                    );

                    UI.backupCheck.innerHTML = "check";
                    settings.backup.enabled = true;
                }
                break;
        }
    });

    document.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case UI.backupMaxInput.id: {
                UI.backupMaxInput.value = UI.backupMaxInput.value.replaceAll(
                    /\D/g,
                    "",
                );

                const newBackupMax = Math.clamp(
                    Number.parseInt(UI.backupMaxInput.value),
                    1,
                    MAX_BACKUPS,
                );
                UI.backupMaxInput.value = newBackupMax.toString();
                settings.backup.max = newBackupMax;
                break;
            }
            case UI.backupPeriodInput.id: {
                UI.backupPeriodInput.value =
                    UI.backupPeriodInput.value.replaceAll(/\D/g, "");

                const newBackupPeriod = Math.clamp(
                    Number.parseInt(UI.backupPeriodInput.value),
                    MIN_BACKUP_PERIOD,
                    MAX_BACKUP_PERIOD,
                );
                UI.backupPeriodInput.value = newBackupPeriod.toString();
                settings.backup.period = newBackupPeriod;
                break;
            }
        }
    });

    document.addEventListener("change", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case UI.fontSelect.id:
                if (UI.fontSelect.value === "default") {
                    settings.fontUrl = "";
                    document.body.style.fontFamily = "";
                } else {
                    for (const element of UI.fontSelect
                        .children as HTMLCollectionOf<HTMLOptionElement>) {
                        if (element.value === UI.fontSelect.value) {
                            settings.fontUrl = element.id.replaceAll("\\", "/");

                            const font = await new FontFace(
                                "font",
                                `url(${convertFileSrc(settings.fontUrl)})`,
                            ).load();
                            document.fonts.add(font);
                            document.body.style.fontFamily = "font";
                        }
                    }
                }
                break;
            case UI.rowDeleteModeSelect.id:
                for (const element of UI.rowDeleteModeSelect
                    .children as HTMLCollectionOf<HTMLOptionElement>) {
                    if (element.value === UI.rowDeleteModeSelect.value) {
                        settings.rowDeleteMode = Number.parseInt(element.value);
                    }
                }
                break;
        }
    });

    if (settings.fontUrl) {
        for (const element of UI.fontSelect
            .children as HTMLCollectionOf<HTMLOptionElement>) {
            if (
                element.value.includes(
                    settings.fontUrl.slice(
                        settings.fontUrl.lastIndexOf("/") + 1,
                    ),
                )
            ) {
                UI.fontSelect.value = element.value;
            }
        }
    }

    await APP_WINDOW.onCloseRequested(async () => {
        await emit("get-settings", settings);
    });
});
