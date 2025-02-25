import { join, loadWindow } from "./extensions/functions";

import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open as openPath } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
const appWindow = getCurrentWebviewWindow();

document.addEventListener("DOMContentLoaded", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [settings, _, projectSettings] = await loadWindow("compile");
    const { projectPath } = settings;

    const settingsContainer = document.getElementById("settings-container") as HTMLDivElement;
    const customOutputPathCheckbox = document.getElementById("custom-output-path-checkbox") as HTMLSpanElement;
    const customOutputPathSettings = document.getElementById("custom-output-path-settings") as HTMLDivElement;
    const disableProcessingCheckbox = document.getElementById("disable-processing-checkbox") as HTMLSpanElement;
    const disableProcessingSettings = document.getElementById("disable-processing-settings") as HTMLDivElement;
    const doNotAskAgainCheckbox = document.getElementById("dont-ask-again-checkbox") as HTMLSpanElement;
    const outputPath = document.getElementById("output-path") as HTMLInputElement;
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

    const compileSettings: ICompileSettings = projectSettings.compileSettings;

    if (compileSettings.customOutputPath.enabled) {
        customOutputPathCheckbox.innerHTML = "check";
        customOutputPathSettings.classList.add("flex", "translate-y-0");
    } else {
        customOutputPathCheckbox.innerHTML = "";
        customOutputPathSettings.classList.add("hidden", "-translate-y-full");
    }

    if (compileSettings.disableProcessing.enabled) {
        disableProcessingCheckbox.innerHTML = "check";
        disableProcessingSettings.classList.add("flex", "translate-y-0");
    } else {
        disableProcessingCheckbox.innerHTML = "";
        disableProcessingSettings.classList.add("hidden", "-translate-y-full");
    }

    doNotAskAgainCheckbox.innerHTML = compileSettings.doNotAskAgain ? "check" : "";

    if (compileSettings.customOutputPath.path !== "") {
        outputPath.value = compileSettings.customOutputPath.path;
    } else {
        compileSettings.customOutputPath.path = outputPath.value = projectPath;
    }

    disableMapsProcessingCheckbox.innerHTML = compileSettings.disableProcessing.of.maps ? "check" : "";
    disableOtherProcessingCheckbox.innerHTML = compileSettings.disableProcessing.of.other ? "check" : "";
    disableSystemProcessingCheckbox.innerHTML = compileSettings.disableProcessing.of.system ? "check" : "";
    disablePluginsProcessingCheckbox.innerHTML = compileSettings.disableProcessing.of.plugins ? "check" : "";

    settingsContainer.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case customOutputPathCheckbox.id:
                if (!customOutputPathCheckbox.textContent) {
                    customOutputPathSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() =>
                        customOutputPathSettings.classList.replace("-translate-y-full", "translate-y-0"),
                    );

                    customOutputPathCheckbox.innerHTML = "check";
                    compileSettings.customOutputPath.enabled = true;
                } else {
                    customOutputPathSettings.classList.replace("translate-y-0", "-translate-y-full");

                    customOutputPathSettings.addEventListener(
                        "transitionend",
                        () => customOutputPathSettings.classList.replace("flex", "hidden"),
                        {
                            once: true,
                        },
                    );

                    customOutputPathCheckbox.innerHTML = "";
                    compileSettings.customOutputPath.enabled = false;
                }
                break;
            case disableProcessingCheckbox.id:
                if (!disableProcessingCheckbox.textContent) {
                    disableProcessingSettings.classList.replace("hidden", "flex");

                    requestAnimationFrame(() =>
                        disableProcessingSettings.classList.replace("-translate-y-full", "translate-y-0"),
                    );

                    disableProcessingCheckbox.innerHTML = "check";
                    compileSettings.disableProcessing.enabled = true;
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
                    compileSettings.disableProcessing.enabled = false;
                }
                break;
            case disableMapsProcessingCheckbox.id:
                if (!disableMapsProcessingCheckbox.textContent) {
                    disableMapsProcessingCheckbox.innerHTML = "check";
                    compileSettings.disableProcessing.of.maps = true;
                } else {
                    disableMapsProcessingCheckbox.innerHTML = "";
                    compileSettings.disableProcessing.of.maps = false;
                }
                break;
            case disableOtherProcessingCheckbox.id:
                if (!disableOtherProcessingCheckbox.textContent) {
                    disableOtherProcessingCheckbox.innerHTML = "check";
                    compileSettings.disableProcessing.of.other = true;
                } else {
                    disableOtherProcessingCheckbox.innerHTML = "";
                    compileSettings.disableProcessing.of.other = false;
                }
                break;
            case disableSystemProcessingCheckbox.id:
                if (!disableSystemProcessingCheckbox.textContent) {
                    disableSystemProcessingCheckbox.innerHTML = "check";
                    compileSettings.disableProcessing.of.system = true;
                } else {
                    disableSystemProcessingCheckbox.innerHTML = "";
                    compileSettings.disableProcessing.of.system = false;
                }
                break;
            case disablePluginsProcessingCheckbox.id:
                if (!disablePluginsProcessingCheckbox.textContent) {
                    disablePluginsProcessingCheckbox.innerHTML = "check";
                    compileSettings.disableProcessing.of.plugins = true;
                } else {
                    disablePluginsProcessingCheckbox.innerHTML = "";
                    compileSettings.disableProcessing.of.plugins = false;
                }
                break;
            case doNotAskAgainCheckbox.id:
                if (!doNotAskAgainCheckbox.textContent) {
                    doNotAskAgainCheckbox.innerHTML = "check";
                    compileSettings.doNotAskAgain = true;
                } else {
                    doNotAskAgainCheckbox.innerHTML = "";
                    compileSettings.doNotAskAgain = false;
                }
                break;
            case "select-output-path": {
                const directory = (await openPath({ directory: true, multiple: false }))!;

                if (directory) {
                    outputPath.value = directory;
                }
                break;
            }
        }
    });

    let compile = false;

    async function closeWindow() {
        compileSettings.initialized = true;

        await writeTextFile(
            join(projectPath, ".rpgmtranslate", "compile-settings.json"),
            JSON.stringify(compileSettings),
        );

        if (compile) {
            await emit("compile");
        }

        await appWindow.close();
    }

    compileButton.addEventListener("click", async () => {
        compile = true;
        await closeWindow();
    });

    await appWindow.onCloseRequested(closeWindow);
});
