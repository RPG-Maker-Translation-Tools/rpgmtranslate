import {
    expandScope,
    getModels,
    isErr,
    readFile,
    walkDir,
} from "@utils/invokes";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

import { ProjectSettings, Settings } from "@lib/classes";
import { TranslationEndpoint } from "@lib/enums";

import { t } from "@lingui/core/macro";

import { emit, once } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { error } from "@tauri-apps/plugin-log";
import { platform as getPlatform } from "@tauri-apps/plugin-os";
const APP_WINDOW = getCurrentWebviewWindow();

// TODO: Implement controls
// TODO: Implement file context input
// TODO: Validate inputs

interface SettingsWindowUI {
    coreSettingsButton: HTMLButtonElement;
    coreSettings: HTMLDivElement;

    backupCheck: HTMLInputElement;
    backupSettings: HTMLDivElement;
    backupMaxInput: HTMLInputElement;
    backupPeriodInput: HTMLInputElement;

    rowDeleteModeSelect: HTMLSelectElement;

    displayGhostLinesCheck: HTMLInputElement;
    checkForUpdatesCheck: HTMLInputElement;

    appearanceSettingsButton: HTMLButtonElement;
    appearanceSettings: HTMLDivElement;

    fontSelect: HTMLSelectElement;

    controlsSettingsButton: HTMLButtonElement;
    controlsSettings: HTMLDivElement;

    translationSettingsButton: HTMLButtonElement;
    translationSettings: HTMLDivElement;

    endpointKeyContainer: HTMLDivElement;
    translationEndpointSelect: HTMLSelectElement;

    APIKeyInput: HTMLInputElement;
    APIKeyDesc: HTMLDivElement;
    validateKeyButton: HTMLButtonElement;

    yandexFolderIDContainer: HTMLDivElement;
    yandexFolderInput: HTMLInputElement;

    aiThings: HTMLDivElement;

    modelSelect: HTMLSelectElement;
    temperatureInput: HTMLInputElement;
    tokenLimitInput: HTMLInputElement;
    useGlossaryCheckbox: HTMLInputElement;
    thinkingCheckbox: HTMLInputElement;
    defaultSystemPromptButton: HTMLButtonElement;
    systemPromptTextarea: HTMLTextAreaElement;

    projectSettingsButton: HTMLButtonElement;
    projectSettings: HTMLDivElement;

    lineLengthHintInput: HTMLInputElement;
    fileContextSelect: HTMLSelectElement;
    fileContextInput: HTMLTextAreaElement;
    projectContextInput: HTMLTextAreaElement;
}

interface FontObject extends Record<string, string> {
    font: string;
    name: string;
}

function setupUI(): SettingsWindowUI {
    const ui = {} as SettingsWindowUI;
    ui.coreSettingsButton = document.getElementById(
        "core-settings-button",
    ) as HTMLButtonElement;
    ui.coreSettings = document.getElementById(
        "core-settings",
    ) as HTMLDivElement;

    ui.backupCheck = document.getElementById(
        "backup-check",
    ) as HTMLInputElement;
    ui.backupSettings = document.getElementById(
        "backup-settings",
    ) as HTMLDivElement;
    ui.backupMaxInput = document.getElementById(
        "backup-max-input",
    ) as HTMLInputElement;
    ui.backupPeriodInput = document.getElementById(
        "backup-period-input",
    ) as HTMLInputElement;

    ui.rowDeleteModeSelect = document.getElementById(
        "row-delete-mode-select",
    ) as HTMLSelectElement;

    ui.displayGhostLinesCheck = document.getElementById(
        "display-ghost-lines-check",
    ) as HTMLInputElement;
    ui.checkForUpdatesCheck = document.getElementById(
        "check-for-updates-check",
    ) as HTMLInputElement;

    ui.appearanceSettingsButton = document.getElementById(
        "appearance-settings-button",
    ) as HTMLButtonElement;
    ui.appearanceSettings = document.getElementById(
        "appearance-settings",
    ) as HTMLDivElement;

    ui.fontSelect = document.getElementById("font-select") as HTMLSelectElement;

    ui.controlsSettingsButton = document.getElementById(
        "controls-settings-button",
    ) as HTMLButtonElement;
    ui.controlsSettings = document.getElementById(
        "controls-settings",
    ) as HTMLDivElement;

    ui.translationSettingsButton = document.getElementById(
        "translation-settings-button",
    ) as HTMLButtonElement;
    ui.translationSettings = document.getElementById(
        "translation-settings",
    ) as HTMLDivElement;

    ui.endpointKeyContainer = document.getElementById(
        "endpoint-key-container",
    ) as HTMLDivElement;
    ui.translationEndpointSelect = document.getElementById(
        "translation-endpoint-select",
    ) as HTMLSelectElement;
    ui.APIKeyInput = document.getElementById(
        "api-key-input",
    ) as HTMLInputElement;
    ui.APIKeyDesc = document.getElementById("api-key-desc") as HTMLDivElement;
    ui.validateKeyButton = document.getElementById(
        "validate-key-button",
    ) as HTMLButtonElement;

    ui.aiThings = document.getElementById("ai-things") as HTMLDivElement;
    ui.yandexFolderIDContainer = document.getElementById(
        "yandex-folder-id-container",
    ) as HTMLDivElement;
    ui.yandexFolderInput = document.getElementById(
        "yandex-folder-input",
    ) as HTMLInputElement;
    ui.modelSelect = document.getElementById(
        "model-select",
    ) as HTMLSelectElement;
    ui.temperatureInput = document.getElementById(
        "temperature-input",
    ) as HTMLInputElement;
    ui.tokenLimitInput = document.getElementById(
        "token-limit-input",
    ) as HTMLInputElement;
    ui.thinkingCheckbox = document.getElementById(
        "thinking-checkbox",
    ) as HTMLInputElement;
    ui.useGlossaryCheckbox = document.getElementById(
        "use-glossary-checkbox",
    ) as HTMLInputElement;
    ui.defaultSystemPromptButton = document.getElementById(
        "default-system-prompt-button",
    ) as HTMLButtonElement;
    ui.systemPromptTextarea = document.getElementById(
        "system-prompt-textarea",
    ) as HTMLTextAreaElement;

    ui.projectSettingsButton = document.getElementById(
        "project-settings-button",
    ) as HTMLButtonElement;
    ui.projectSettings = document.getElementById(
        "project-settings",
    ) as HTMLDivElement;

    ui.lineLengthHintInput = document.getElementById(
        "line-length-hint-input",
    ) as HTMLInputElement;
    ui.fileContextSelect = document.getElementById(
        "file-context-select",
    ) as HTMLSelectElement;
    ui.fileContextInput = document.getElementById(
        "file-context-input",
    ) as HTMLTextAreaElement;
    ui.projectContextInput = document.getElementById(
        "project-context-input",
    ) as HTMLTextAreaElement;

    return ui;
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

const id = setInterval(() => {
    void emit("send-settings");
}, consts.SECOND_MS / 2);

await once<[Settings, Themes, ProjectSettings, Tabs]>(
    "settings",
    async (event) => {
        function toggleTranslationElements(): void {
            const endpoint = Number(
                UI.translationEndpointSelect.value,
            ) as TranslationEndpoint;

            const requiresKey = endpoint > TranslationEndpoint.Google;

            if (requiresKey) {
                UI.endpointKeyContainer.classList.remove("hidden");
                UI.yandexFolderIDContainer.classList.add("hidden");

                const aiEndpoint = endpoint > TranslationEndpoint.DeepL;

                if (aiEndpoint) {
                    UI.aiThings.classList.remove("hidden");
                } else {
                    UI.aiThings.classList.add("hidden");
                }

                switch (endpoint) {
                    case TranslationEndpoint.Yandex:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from Yandex. Check out <a class="text-third cursor-pointer hover:underline">https://yandex.com/dev/dictionary/keys/get/</a> on how to get it.`;
                        UI.yandexFolderIDContainer.classList.remove("hidden");
                        break;
                    case TranslationEndpoint.DeepL:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from DeepL. Check out <a class="text-third cursor-pointer hover:underline">https://support.deepl.com/hc/en-us/articles/360020695820-API-key-for-DeepL-API</a> on how to get it.`;
                        break;
                    case TranslationEndpoint.OpenAI:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from OpenAI. Check out <a class="text-third cursor-pointer hover:underline">https://platform.openai.com/api-keys</a> on how to get it.`;
                        break;
                    case TranslationEndpoint.Anthropic:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from Anthropic. Check out <a class="text-third cursor-pointer hover:underline">https://platform.claude.com/settings/keys</a> on how to get it.`;
                        break;
                    case TranslationEndpoint.DeepSeek:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from DeepSeek. Check out <a class="text-third cursor-pointer hover:underline">https://platform.deepseek.com/api_keys</a> on how to get it.`;
                        break;
                    case TranslationEndpoint.Gemini:
                        UI.APIKeyDesc.innerHTML = t`You need an API key from Google. Check out <a class="text-third cursor-pointer hover:underline">https://ai.google.dev/gemini-api/docs/api-key</a> on how to get it.`;
                        break;
                }
            } else {
                UI.endpointKeyContainer.classList.add("hidden");
                UI.aiThings.classList.add("hidden");
            }
        }

        const UI = setupUI();
        const [settings, themes, projectSettings, tabs] = event.payload;

        clearInterval(id);

        for (const tabName in tabs) {
            const fileOption = document.createElement("option");
            fileOption.value = tabName;
            fileOption.innerHTML = tabName;
            UI.fileContextSelect.add(fileOption);
        }

        utils.applyTheme(themes, settings.appearance.theme);
        await utils.initializeLocalization(
            "settings",
            settings.appearance.language,
        );
        utils.retranslate();

        UI.backupCheck.checked = settings.core.backup.enabled;

        UI.backupPeriodInput.min = consts.MIN_BACKUP_PERIOD.toString();
        UI.backupPeriodInput.max = settings.core.backup.period.toString();

        UI.backupMaxInput.min = "1";
        UI.backupMaxInput.max = consts.MAX_BACKUPS.toString();

        UI.backupMaxInput.value = settings.core.backup.max.toString();
        UI.backupPeriodInput.value = settings.core.backup.period.toString();

        UI.rowDeleteModeSelect.value = settings.core.rowDeleteMode.toString();

        UI.displayGhostLinesCheck.checked =
            settings.appearance.displayGhostLines;
        UI.checkForUpdatesCheck.checked = settings.core.updatesEnabled;

        if (settings.core.backup.enabled) {
            UI.backupSettings.classList.add("flex");
        } else {
            UI.backupSettings.classList.add("hidden");
        }

        UI.translationEndpointSelect.value =
            settings.translation.translationEndpoint.toString();
        UI.modelSelect.value = settings.translation.model;
        UI.yandexFolderInput.value = settings.translation.yandexFolderId;
        UI.APIKeyInput.value = settings.translation.apiKey;
        UI.systemPromptTextarea.value = settings.translation.systemPrompt;
        UI.thinkingCheckbox.checked = settings.translation.thinking;
        UI.useGlossaryCheckbox.checked = settings.translation.useGlossary;
        UI.tokenLimitInput.value = settings.translation.tokenLimit.toString();
        UI.temperatureInput.value = settings.translation.temperature.toString();

        UI.lineLengthHintInput.value =
            projectSettings.lineLengthHint.toString();
        UI.projectContextInput.value = projectSettings.projectContext;

        toggleTranslationElements();

        for (const [path, name] of Object.entries(
            (await fetchFonts()) as Record<string, string>,
        )) {
            const optionElement = document.createElement("option");

            optionElement.id = path;
            optionElement.innerHTML = optionElement.value = name;

            UI.fontSelect.add(optionElement);
        }

        document.addEventListener("click", async (event) => {
            const target = event.target as HTMLElement;

            switch (target) {
                case UI.coreSettingsButton: {
                    const settingsSections = document.querySelectorAll("main");

                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    UI.coreSettings.classList.replace("hidden", "flex");

                    break;
                }
                case UI.appearanceSettingsButton: {
                    const settingsSections = document.querySelectorAll("main");

                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    UI.appearanceSettings.classList.replace("hidden", "flex");
                    break;
                }
                case UI.controlsSettingsButton: {
                    const settingsSections = document.querySelectorAll("main");

                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    UI.controlsSettings.classList.replace("hidden", "flex");
                    break;
                }
                case UI.translationSettingsButton: {
                    const settingsSections = document.querySelectorAll("main");

                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    UI.translationSettings.classList.replace("hidden", "flex");
                    break;
                }
                case UI.projectSettingsButton: {
                    const settingsSections = document.querySelectorAll("main");

                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    UI.projectSettings.classList.replace("hidden", "flex");
                    break;
                }
                case UI.validateKeyButton: {
                    UI.modelSelect.innerHTML = "";

                    const models = await getModels(
                        Number(UI.translationEndpointSelect.value),
                        UI.APIKeyInput.value,
                    );

                    if (isErr(models)) {
                        void error(models[0]!);
                        alert(t`Failed to validate key.`);
                    } else {
                        for (const model of models[1]!) {
                            const option = document.createElement("option");
                            option.innerHTML = model;
                            option.value = model;
                            UI.modelSelect.add(option);
                        }
                    }
                    break;
                }
                case UI.defaultSystemPromptButton:
                    UI.systemPromptTextarea.value = t`Role:
You are a professional videogame localization expert and linguist. You translate game text with high fidelity, cultural awareness, consistency, and attention to gameplay context, UI constraints, and narrative tone.

Action:
Translate all provided strings from sourceLanguage to translationLanguage. Use all available context to produce natural, player-facing translations suitable for a shipped videogame.

Context:
You will receive a JSON object containing files, blocks, and strings.
Each Block represents a logical unit of text.
Text belongs to a JRPG/RPG/Visual Novel game, made with RPG Maker.
Use these context signals aggressively:

* name: Treat this as critical semantic context. It often describes what the block or filename refers to (location/setting).
* filename: Indicates file purpose (map, system, items, etc.).
* before_strings / after_strings: Provide neighboring context; use them to resolve ambiguity but do not translate them.
* glossary: Mandatory terminology. Always prefer glossary translations and respect notes.
* project_context and local_context: High-level and situational guidance; use them to maintain tone, register, and lore consistency.
  Special case - map files:
* Strings may contain a line like <!-- EVENT NAME -->.
* This line marks the start of a new event and possibly a new context.
* Do not translate the marker itself.
* Use the event name and the block name to re-evaluate context for the following strings.

General rules:

* Preserve meaning, intent, emotional tone, and gameplay function.
* Prefer concise, idiomatic translations suitable for UI and dialog.
* Keep placeholders, variables, tags, markup, and control codes unchanged.
* Maintain consistency across files and blocks.
* Do not add explanations, comments, or extra text.

Execute:
Process each file, then each block inside it, and translate only the strings array.
Return ONLY a JSON object in the following exact structure:

\`\`\`json
{
    "filename": {
        "id": {
            "strings": [...]
        }
    }
}
\`\`\`

No additional keys, no reordered structure, no commentary.`;
                    break;
            }
        });

        document.addEventListener("change", async (event) => {
            const target = event.target as HTMLElement;

            switch (target) {
                case UI.checkForUpdatesCheck:
                    settings.core.updatesEnabled =
                        UI.checkForUpdatesCheck.checked;
                    break;
                case UI.displayGhostLinesCheck:
                    settings.appearance.displayGhostLines =
                        UI.displayGhostLinesCheck.checked;
                    break;
                case UI.backupCheck:
                    if (UI.backupCheck.checked) {
                        UI.backupSettings.classList.replace("hidden", "flex");
                    } else {
                        UI.backupSettings.classList.replace("flex", "hidden");
                    }
                    break;
                case UI.translationEndpointSelect:
                    toggleTranslationElements();
                    break;
                case UI.fontSelect: {
                    const target = event.target as HTMLOptionElement;

                    if (target.value === "default") {
                        settings.appearance.font = "";
                        document.body.style.fontFamily = "inherit";
                    } else {
                        const fontPath = target.id.replaceAll("\\", "/");
                        const fontData = await readFile(fontPath);

                        if (isErr(fontData)) {
                            void error(fontData[0]!);
                            return;
                        }

                        const font = await new FontFace(
                            "CustomFont",
                            fontData[1]!,
                        ).load();

                        document.fonts.add(font);
                        document.body.style.fontFamily = "CustomFont";
                        settings.appearance.font = fontPath;
                    }
                    break;
                }
                case UI.rowDeleteModeSelect: {
                    const target = event.target as HTMLOptionElement;
                    settings.core.rowDeleteMode = Number(target);
                    break;
                }
            }
        });

        if (settings.appearance.font) {
            for (const element of UI.fontSelect
                .children as HTMLCollectionOf<HTMLOptionElement>) {
                if (
                    element.value.includes(
                        settings.appearance.font.slice(
                            settings.appearance.font.lastIndexOf("/") + 1,
                        ),
                    )
                ) {
                    UI.fontSelect.value = element.value;
                }
            }

            if (UI.fontSelect.value === "default") {
                alert(
                    t`Custom font was not found. Ensure it's installed on your system.`,
                );
            }
        }

        await APP_WINDOW.onCloseRequested(async () => {
            settings.core.backup.enabled = UI.backupCheck.checked;
            settings.core.backup.period = UI.backupPeriodInput.valueAsNumber;
            settings.core.backup.max = UI.backupMaxInput.valueAsNumber;

            settings.translation.translationEndpoint = Number(
                UI.translationEndpointSelect.value,
            );
            settings.translation.model = UI.modelSelect.value;
            settings.translation.thinking = UI.thinkingCheckbox.checked;
            settings.translation.useGlossary = UI.useGlossaryCheckbox.checked;
            settings.translation.yandexFolderId = UI.yandexFolderInput.value;
            settings.translation.systemPrompt = UI.systemPromptTextarea.value;
            settings.translation.temperature =
                UI.temperatureInput.valueAsNumber;
            settings.translation.tokenLimit = UI.tokenLimitInput.valueAsNumber;

            projectSettings.lineLengthHint =
                UI.lineLengthHintInput.valueAsNumber;
            projectSettings.projectContext = UI.projectContextInput.value;

            await emit<[Settings, ProjectSettings]>("get-settings", [
                settings,
                projectSettings,
            ]);
        });
    },
);
