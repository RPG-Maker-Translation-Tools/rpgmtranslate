import { loadWindow, setupUi as setupUI } from "./utilities/functions";
import { invokeAddToScope, invokeWalkDir } from "./utilities/invokes";
import "./utilities/math-extensions";

import { convertFileSrc } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
import {
    MAX_BACKUP_PERIOD,
    MAX_BACKUPS,
    MIN_BACKUP_PERIOD,
} from "./utilities/constants";
const appWindow = getCurrentWebviewWindow();

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

async function fetchFonts(): Promise<FontObject> {
    const fontsObject = {} as FontObject;
    const fontPath =
        getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

    await invokeAddToScope({ path: fontPath });

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
    const ui = setupUI("settingswindow") as SettingsWindowUI;

    ui.backupMaxInput.value = settings.backup.max.toString();
    ui.backupPeriodInput.value = settings.backup.period.toString();
    ui.backupCheck.innerHTML = settings.backup.enabled ? "check" : "";
    ui.rowDeleteModeSelect.value = settings.rowDeleteMode.toString();
    ui.displayGhostLinesCheck.innerHTML = settings.displayGhostLines
        ? "check"
        : "";
    ui.checkForUpdatesCheck.innerHTML = settings.checkForUpdates ? "check" : "";

    if (!ui.backupCheck.textContent) {
        ui.backupSettings.classList.add("hidden");
        ui.backupSettings.classList.add("-translate-y-full");
    } else {
        ui.backupSettings.classList.add("flex");
        ui.backupSettings.classList.add("translate-y-0");
    }

    for (const [path, name] of Object.entries(
        (await fetchFonts()) as Record<string, string>,
    )) {
        const optionElement = document.createElement("option");

        optionElement.id = path;
        optionElement.innerHTML = optionElement.value = name;

        ui.fontSelect.appendChild(optionElement);
    }

    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case ui.checkForUpdatesCheck.id:
                if (!ui.checkForUpdatesCheck.textContent) {
                    ui.checkForUpdatesCheck.innerHTML = "check";
                    settings.checkForUpdates = true;
                } else {
                    ui.checkForUpdatesCheck.innerHTML = "";
                    settings.checkForUpdates = false;
                }
                break;
            case ui.displayGhostLinesCheck.id:
                if (!ui.displayGhostLinesCheck.textContent) {
                    ui.displayGhostLinesCheck.innerHTML = "check";
                    settings.displayGhostLines = true;
                } else {
                    ui.displayGhostLinesCheck.innerHTML = "";
                    settings.displayGhostLines = false;
                }
                break;
            case ui.backupCheck.id:
                if (!ui.backupCheck.textContent) {
                    ui.backupSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() =>
                        ui.backupSettings.classList.replace(
                            "-translate-y-full",
                            "translate-y-0",
                        ),
                    );

                    ui.backupCheck.innerHTML = "check";
                    settings.backup.enabled = true;
                } else {
                    ui.backupSettings.classList.replace(
                        "translate-y-0",
                        "-translate-y-full",
                    );

                    ui.backupSettings.addEventListener(
                        "transitionend",
                        () =>
                            ui.backupSettings.classList.replace(
                                "flex",
                                "hidden",
                            ),
                        {
                            once: true,
                        },
                    );

                    ui.backupCheck.innerHTML = "";
                    settings.backup.enabled = false;
                }
                break;
        }
    });

    document.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case ui.backupMaxInput.id: {
                ui.backupMaxInput.value = ui.backupMaxInput.value.replaceAll(
                    /\D/g,
                    "",
                );

                const newBackupMax = Math.clamp(
                    Number.parseInt(ui.backupMaxInput.value),
                    1,
                    MAX_BACKUPS,
                );
                ui.backupMaxInput.value = newBackupMax.toString();
                settings.backup.max = newBackupMax;
                break;
            }
            case ui.backupPeriodInput.id: {
                ui.backupPeriodInput.value =
                    ui.backupPeriodInput.value.replaceAll(/\D/g, "");

                const newBackupPeriod = Math.clamp(
                    Number.parseInt(ui.backupPeriodInput.value),
                    MIN_BACKUP_PERIOD,
                    MAX_BACKUP_PERIOD,
                );
                ui.backupPeriodInput.value = newBackupPeriod.toString();
                settings.backup.period = newBackupPeriod;
                break;
            }
        }
    });

    document.addEventListener("change", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case ui.fontSelect.id:
                if (ui.fontSelect.value === "default") {
                    settings.fontUrl = "";
                    document.body.style.fontFamily = "";
                } else {
                    for (const element of ui.fontSelect
                        .children as HTMLCollectionOf<HTMLOptionElement>) {
                        if (element.value === ui.fontSelect.value) {
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
            case ui.rowDeleteModeSelect.id:
                for (const element of ui.rowDeleteModeSelect
                    .children as HTMLCollectionOf<HTMLOptionElement>) {
                    if (element.value === ui.rowDeleteModeSelect.value) {
                        settings.rowDeleteMode = Number.parseInt(element.value);
                    }
                }
                break;
        }
    });

    if (settings.fontUrl) {
        for (const element of ui.fontSelect
            .children as HTMLCollectionOf<HTMLOptionElement>) {
            if (
                element.value.includes(
                    settings.fontUrl.slice(
                        settings.fontUrl.lastIndexOf("/") + 1,
                    ),
                )
            ) {
                ui.fontSelect.value = element.value;
            }
        }
    }

    await appWindow.onCloseRequested(async () => {
        await emit("get-settings", settings);
    });
});
