import { loadWindow } from "./extensions/functions";

import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open as openPath } from "@tauri-apps/plugin-dialog";
const appWindow = getCurrentWebviewWindow();

document.addEventListener("DOMContentLoaded", async () => {
    const [settings] = await loadWindow("compile");
    const { projectPath } = settings;

    const settingsContainer = document.getElementById("settings-container") as HTMLDivElement;
    const disableProcessingCheckbox = document.getElementById("disable-processing-checkbox") as HTMLSpanElement;
    const disableProcessingSettings = document.getElementById("disable-processing-settings") as HTMLDivElement;
    const outputPathInput = document.getElementById("output-path") as HTMLInputElement;
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
    const compileButton = document.getElementById("compile-button") as HTMLButtonElement;

    outputPathInput.value = projectPath;

    settingsContainer.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
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
            case "select-output-path": {
                const directory = (await openPath({ directory: true, multiple: false }))!;

                if (directory) {
                    outputPathInput.value = directory;
                }
                break;
            }
        }
    });

    compileButton.addEventListener("click", async () => {
        await emit("compile", [
            outputPathInput.value,
            [
                Boolean(disableMapsProcessingCheckbox.textContent),
                Boolean(disableOtherProcessingCheckbox.textContent),
                Boolean(disableSystemProcessingCheckbox.textContent),
                Boolean(disablePluginsProcessingCheckbox.textContent),
            ],
        ]);
        await appWindow.close();
    });

    await appWindow.onCloseRequested(async () => {
        await appWindow.close();
    });
});
