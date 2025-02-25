import { animateProgressText, join, loadWindow } from "./extensions/functions";
import { read, readLastLine } from "./extensions/invokes";
import { ReadWindowLocalization } from "./extensions/localization";
import { EngineType, ProcessingMode } from "./types/enums";

import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { exists } from "@tauri-apps/plugin-fs";
const appWindow = getCurrentWebviewWindow();

document.addEventListener("DOMContentLoaded", async () => {
    const [settings, windowLocalization] = (await loadWindow("read")) as [
        Settings,
        ReadWindowLocalization,
        ProjectSettings,
    ];
    const { projectPath, engineType } = settings;

    const settingsContainer = document.getElementById("settings-container") as HTMLDivElement;
    const readingModeSelect = document.getElementById("reading-mode-select") as HTMLSelectElement;
    const modeDescription = document.getElementById("mode-description") as HTMLDivElement;
    const romanizeCheckbox = document.getElementById("romanize-checkbox") as HTMLSpanElement;
    const customProcessingCheckbox = document.getElementById("custom-processing-checkbox") as HTMLSpanElement;
    const disableProcessingCheckbox = document.getElementById("disable-processing-checkbox") as HTMLSpanElement;
    const disableProcessingSettings = document.getElementById("disable-processing-settings") as HTMLDivElement;
    const disableMapsProcessingCheckbox = document.getElementById(
        "disable-maps-processing-checkbox",
    ) as HTMLSpanElement;
    const disableOtherProcessingCheckbox = document.getElementById(
        "disable-other-processing-checkbox",
    ) as HTMLSpanElement;
    const disableSystemProcessingCheckbox = document.getElementById(
        "disable-system-processing-checkbox",
    ) as HTMLSpanElement;
    const disablePluginsProcessingCheckbox = document.getElementById(
        "disable-plugins-processing-checkbox",
    ) as HTMLSpanElement;
    const readButton = document.getElementById("read-button") as HTMLButtonElement;
    const mapsProcessingModeSelect = document.getElementById("maps-processing-mode-select") as HTMLSelectElement;
    const ignoreContainer = document.getElementById("ignore-container") as HTMLDivElement;
    const ignoreCheckbox = document.getElementById("ignore-checkbox") as HTMLSpanElement;

    readingModeSelect.addEventListener("change", () => {
        if (readingModeSelect.value === "append") {
            modeDescription.innerHTML = windowLocalization.appendModeDescription;
            ignoreContainer.classList.replace("hidden", "flex");
        } else if (readingModeSelect.value === "force") {
            modeDescription.innerHTML = windowLocalization.forceModeDescription;
            ignoreContainer.classList.replace("flex", "hidden");
        } else {
            modeDescription.innerHTML = "";
            ignoreContainer.classList.replace("flex", "hidden");
        }
    });

    settingsContainer.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case romanizeCheckbox.id:
                if (!romanizeCheckbox.textContent) {
                    romanizeCheckbox.innerHTML = "check";
                } else {
                    romanizeCheckbox.innerHTML = "";
                }
                break;
            case customProcessingCheckbox.id:
                if (!customProcessingCheckbox.textContent) {
                    customProcessingCheckbox.innerHTML = "check";
                } else {
                    customProcessingCheckbox.innerHTML = "";
                }
                break;
            case disableProcessingCheckbox.id:
                if (!disableProcessingCheckbox.textContent) {
                    disableProcessingSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() =>
                        disableProcessingSettings.classList.replace("-translate-y-full", "translate-y-0"),
                    );

                    disableProcessingCheckbox.innerHTML = "check";
                } else {
                    disableProcessingSettings.classList.replace("translate-y-0", "-translate-y-full");

                    disableProcessingSettings.addEventListener(
                        "transitionend",
                        () => disableProcessingSettings.classList.replace("flex", "hidden"),
                        {
                            once: true,
                        },
                    );

                    disableProcessingCheckbox.innerHTML = "";
                }
                break;
            case disableMapsProcessingCheckbox.id:
                if (!disableMapsProcessingCheckbox.textContent) {
                    disableMapsProcessingCheckbox.innerHTML = "check";
                } else {
                    disableMapsProcessingCheckbox.innerHTML = "";
                }
                break;
            case disableOtherProcessingCheckbox.id:
                if (!disableOtherProcessingCheckbox.textContent) {
                    disableOtherProcessingCheckbox.innerHTML = "check";
                } else {
                    disableOtherProcessingCheckbox.innerHTML = "";
                }
                break;
            case disableSystemProcessingCheckbox.id:
                if (!disableSystemProcessingCheckbox.textContent) {
                    disableSystemProcessingCheckbox.innerHTML = "check";
                } else {
                    disableSystemProcessingCheckbox.innerHTML = "";
                }
                break;
            case disablePluginsProcessingCheckbox.id:
                if (!disablePluginsProcessingCheckbox.textContent) {
                    disablePluginsProcessingCheckbox.innerHTML = "check";
                } else {
                    disablePluginsProcessingCheckbox.innerHTML = "";
                }
                break;
        }
    });

    let reading = false;

    readButton.addEventListener("click", async () => {
        if (!readingModeSelect.value) {
            alert(windowLocalization.readingModeNotSelected);
            return;
        }

        const disableProcessings: Record<string, boolean> = {
            maps: Boolean(disableMapsProcessingCheckbox.textContent),
            other: Boolean(disableOtherProcessingCheckbox.textContent),
            system: Boolean(disableSystemProcessingCheckbox.textContent),
            plugins: Boolean(disablePluginsProcessingCheckbox.textContent),
        };

        const gameTitleRow = await readLastLine({
            filePath: join(settings.projectPath, ".rpgmtranslate", "translation", "system.txt"),
        });

        const gameTitle = gameTitleRow.split("<#>")[0];

        let originalDir: string;

        if (await exists(join(projectPath, "original"))) {
            originalDir = "original";
        } else if (engineType === EngineType.New) {
            originalDir = "data";
        } else {
            originalDir = "Data";
        }

        const progressText = document.getElementById("progress-text") as HTMLDivElement;

        let processingMode = ProcessingMode.Default;

        if (readingModeSelect.value === "append") {
            progressText.innerHTML = windowLocalization.readingInAppendMode;
            processingMode = ProcessingMode.Append;
        } else if (readingModeSelect.value === "force") {
            progressText.innerHTML = windowLocalization.readingInForceMode;
            processingMode = ProcessingMode.Force;
        }

        const progressWindow = document.getElementById("progress-window") as HTMLDivElement;
        progressWindow.classList.remove("hidden");

        animateProgressText(progressText);

        reading = true;

        await read(
            projectPath,
            originalDir,
            gameTitle,
            Number.parseInt(mapsProcessingModeSelect.value),
            Boolean(romanizeCheckbox.textContent),
            Boolean(customProcessingCheckbox.textContent),
            Object.values(disableProcessings),
            processingMode,
            engineType!,
            processingMode === ProcessingMode.Append ? Boolean(ignoreCheckbox.textContent) : false,
        );

        await emit("restart");
        await appWindow.close();

        await emit("fetch");
    });

    await appWindow.onCloseRequested((event) => {
        if (reading) {
            event.preventDefault();
        }
    });
});
