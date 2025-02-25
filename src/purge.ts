import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { exists } from "@tauri-apps/plugin-fs";
import { join, loadWindow } from "./extensions/functions";
import { purge, readLastLine } from "./extensions/invokes";
import { EngineType } from "./types/enums";

document.addEventListener("DOMContentLoaded", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [settings, _, projectSettings] = await loadWindow("purge");
    const { projectPath, engineType } = settings;

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

    const statCheck = document.getElementById("stat-check") as HTMLSpanElement;
    const leaveFilledCheck = document.getElementById("leave-filled-check") as HTMLSpanElement;
    const purgeEmptyCheck = document.getElementById("purge-empty-check") as HTMLSpanElement;
    const createIgnoreCheck = document.getElementById("create-ignore-check") as HTMLSpanElement;
    const purgeButton = document.getElementById("purge-button") as HTMLButtonElement;

    document.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        switch (target.id) {
            case statCheck.id:
                if (!statCheck.textContent) {
                    statCheck.innerHTML = "check";
                } else {
                    statCheck.innerHTML = "";
                }
                break;
            case leaveFilledCheck.id:
                if (!leaveFilledCheck.textContent) {
                    leaveFilledCheck.innerHTML = "check";
                } else {
                    leaveFilledCheck.innerHTML = "";
                }
                break;
            case purgeEmptyCheck.id:
                if (!purgeEmptyCheck.textContent) {
                    purgeEmptyCheck.innerHTML = "check";
                } else {
                    purgeEmptyCheck.innerHTML = "";
                }
                break;
            case createIgnoreCheck.id:
                if (!createIgnoreCheck.textContent) {
                    createIgnoreCheck.innerHTML = "check";
                } else {
                    createIgnoreCheck.innerHTML = "";
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
            case purgeButton.id: {
                let originalDir: string;

                if (await exists(join(projectPath, "original"))) {
                    originalDir = "original";
                } else if (engineType === EngineType.New) {
                    originalDir = "data";
                } else {
                    originalDir = "Data";
                }

                const gameTitleRow = await readLastLine({
                    filePath: join(settings.projectPath, ".rpgmtranslate", "translation", "system.txt"),
                });

                const gameTitle = gameTitleRow.split("<#>")[0];

                const disableProcessings: Record<string, boolean> = {
                    maps: Boolean(disableMapsProcessingCheckbox.textContent),
                    other: Boolean(disableOtherProcessingCheckbox.textContent),
                    system: Boolean(disableSystemProcessingCheckbox.textContent),
                    plugins: Boolean(disablePluginsProcessingCheckbox.textContent),
                };

                await purge(
                    projectPath,
                    originalDir,
                    gameTitle,
                    projectSettings.mapsProcessingMode,
                    projectSettings.romanize,
                    projectSettings.disableCustomProcessing,
                    Object.values(disableProcessings),
                    engineType!,
                    Boolean(statCheck.textContent),
                    Boolean(leaveFilledCheck.textContent),
                    Boolean(purgeEmptyCheck.textContent),
                    Boolean(createIgnoreCheck.textContent),
                );
                await getCurrentWebviewWindow().close();
                break;
            }
        }
    });
});
