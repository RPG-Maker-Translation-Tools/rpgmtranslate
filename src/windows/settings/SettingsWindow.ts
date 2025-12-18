import { expandScope, walkDir } from "@utils/invokes";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

import { ProjectSettings, Settings } from "@lib/classes";
import { convertFileSrc } from "@tauri-apps/api/core";
import { emit, once } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
const APP_WINDOW = getCurrentWebviewWindow();

interface SettingsWindowUI {
    backupCheck: HTMLInputElement;
    backupSettings: HTMLDivElement;
    backupMaxInput: HTMLInputElement;
    backupPeriodInput: HTMLInputElement;
    fontSelect: HTMLSelectElement;
    rowDeleteModeSelect: HTMLSelectElement;
    displayGhostLinesCheck: HTMLInputElement;
    checkForUpdatesCheck: HTMLInputElement;
}

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

function setupUI(): SettingsWindowUI {
    const backupCheck = document.getElementById(
        "backup-check",
    ) as HTMLInputElement;
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
    ) as HTMLInputElement;
    const checkForUpdatesCheck = document.getElementById(
        "check-for-updates-check",
    ) as HTMLInputElement;

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

async function fetchFonts(): Promise<FontObject> {
    const fontsObject = {} as FontObject;
    const fontPath =
        getPlatform() === "windows" ? "C:/Windows/Fonts" : "/usr/share/fonts";

    await expandScope(fontPath);
    const entries = await walkDir(fontPath);

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

await once<[Settings, Themes, ProjectSettings]>("settings", async (event) => {
    const UI = setupUI();
    const [settings, themes] = event.payload;

    utils.applyTheme(themes, settings.theme);
    await utils.initializeLocalization("Settings", settings.language);
    utils.retranslate();

    UI.backupPeriodInput.min = consts.MIN_BACKUP_PERIOD.toString();
    UI.backupPeriodInput.max = settings.backup.period.toString();

    UI.backupMaxInput.min = "1";
    UI.backupMaxInput.max = consts.MAX_BACKUPS.toString();

    UI.backupMaxInput.value = settings.backup.max.toString();
    UI.backupPeriodInput.value = settings.backup.period.toString();
    UI.backupCheck.checked = settings.backup.enabled;
    UI.rowDeleteModeSelect.value = settings.rowDeleteMode.toString();
    UI.displayGhostLinesCheck.checked = settings.displayGhostLines;

    UI.checkForUpdatesCheck.checked = settings.updatesEnabled;

    if (!UI.backupCheck.checked) {
        UI.backupSettings.classList.add("hidden");
    } else {
        UI.backupSettings.classList.add("flex");
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

        switch (target) {
            case UI.checkForUpdatesCheck:
                if (UI.checkForUpdatesCheck.checked) {
                    settings.updatesEnabled = true;
                } else {
                    settings.updatesEnabled = false;
                }
                break;
            case UI.displayGhostLinesCheck:
                if (UI.displayGhostLinesCheck.checked) {
                    settings.displayGhostLines = true;
                } else {
                    settings.displayGhostLines = false;
                }
                break;
            case UI.backupCheck:
                if (UI.backupCheck.checked) {
                    UI.backupSettings.classList.replace("hidden", "flex");

                    settings.backup.enabled = true;
                } else {
                    UI.backupSettings.classList.replace("flex", "hidden");

                    settings.backup.enabled = false;
                }
                break;
        }
    });

    document.addEventListener("change", async (event) => {
        const target = event.target as HTMLElement;

        switch (target) {
            case UI.fontSelect:
                if (UI.fontSelect.value === "default") {
                    settings.font = "";
                    document.body.style.fontFamily = "";
                } else {
                    for (const element of UI.fontSelect
                        .children as HTMLCollectionOf<HTMLOptionElement>) {
                        if (element.value === UI.fontSelect.value) {
                            settings.font = element.id.replaceAll("\\", "/");

                            const font = await new FontFace(
                                "font",
                                `url(${convertFileSrc(settings.font)})`,
                            ).load();
                            document.fonts.add(font);
                            document.body.style.fontFamily = "font";
                        }
                    }
                }
                break;
            case UI.rowDeleteModeSelect:
                for (const element of UI.rowDeleteModeSelect
                    .children as HTMLCollectionOf<HTMLOptionElement>) {
                    if (element.value === UI.rowDeleteModeSelect.value) {
                        settings.rowDeleteMode = Number.parseInt(element.value);
                    }
                }
                break;
        }
    });

    if (settings.font) {
        for (const element of UI.fontSelect
            .children as HTMLCollectionOf<HTMLOptionElement>) {
            if (
                element.value.includes(
                    settings.font.slice(settings.font.lastIndexOf("/") + 1),
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
