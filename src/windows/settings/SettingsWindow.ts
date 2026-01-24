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
import { open } from "@tauri-apps/plugin-shell";

const APP_WINDOW = getCurrentWebviewWindow();

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

    translationTableFontSelect: HTMLSelectElement;
    uiFontSelect: HTMLSelectElement;

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

// TODO: Allow selecting custom location for .rpgmtranslate directory

class SettingsWindow {
    #ui = this.#setupUI();
    #intevalID: number;

    #prevEndpoint = TranslationEndpoint.Google;
    #prevOption = "";

    #settings!: Settings;
    #projectSettings!: ProjectSettings;

    public constructor() {
        this.#intevalID = window.setInterval(() => {
            void emit("awaiting-settings");
        }, consts.SECOND_MS / 2);

        void once<[Settings, Themes, ProjectSettings, Tabs]>(
            "open-settings",
            async (event) => {
                await this.#init(event.payload);
            },
        );

        const settingsSections = document.querySelectorAll("main");

        document.addEventListener("click", async (event) => {
            const target = event.target as HTMLElement;

            if (target.tagName === "A") {
                await open(target.innerHTML);
                return;
            }

            switch (target) {
                case this.#ui.coreSettingsButton: {
                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    this.#ui.coreSettings.classList.replace("hidden", "flex");
                    break;
                }
                case this.#ui.appearanceSettingsButton: {
                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    this.#ui.appearanceSettings.classList.replace(
                        "hidden",
                        "flex",
                    );
                    break;
                }
                case this.#ui.controlsSettingsButton: {
                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    this.#ui.controlsSettings.classList.replace(
                        "hidden",
                        "flex",
                    );
                    break;
                }
                case this.#ui.translationSettingsButton: {
                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    this.#ui.translationSettings.classList.replace(
                        "hidden",
                        "flex",
                    );
                    break;
                }
                case this.#ui.projectSettingsButton: {
                    for (const section of settingsSections) {
                        section.classList.replace("flex", "hidden");
                    }

                    this.#ui.projectSettings.classList.replace(
                        "hidden",
                        "flex",
                    );
                    break;
                }
                case this.#ui.validateKeyButton: {
                    this.#ui.modelSelect.innerHTML = "";

                    if (!this.#ui.APIKeyInput.value) {
                        alert(t`API key is empty.`);
                        return;
                    }

                    const models = await getModels(
                        Number(this.#ui.translationEndpointSelect.value),
                        this.#ui.APIKeyInput.value,
                    );

                    if (isErr(models)) {
                        const err = models[0]!;
                        void error(err);
                        alert(t`Failed to validate key: ${err}`);
                    } else {
                        for (const model of models[1]!) {
                            const option = document.createElement("option");
                            option.innerHTML = model;
                            option.value = model;
                            this.#ui.modelSelect.add(option);
                        }
                    }
                    break;
                }
                case this.#ui.defaultSystemPromptButton:
                    this.#ui.systemPromptTextarea.value = `Role:
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
                case this.#ui.checkForUpdatesCheck:
                    this.#settings.core.updatesEnabled =
                        this.#ui.checkForUpdatesCheck.checked;
                    break;
                case this.#ui.displayGhostLinesCheck:
                    this.#settings.appearance.displayGhostLines =
                        this.#ui.displayGhostLinesCheck.checked;
                    break;
                case this.#ui.backupCheck:
                    if (this.#ui.backupCheck.checked) {
                        this.#ui.backupSettings.classList.replace(
                            "hidden",
                            "flex",
                        );
                    } else {
                        this.#ui.backupSettings.classList.replace(
                            "flex",
                            "hidden",
                        );
                    }
                    break;
                case this.#ui.translationEndpointSelect:
                    this.#saveCurrentEndpointSettings();
                    this.#toggleTranslationElements();

                    this.#prevEndpoint = Number(
                        this.#ui.translationEndpointSelect.value,
                    ) as TranslationEndpoint;
                    break;
                case this.#ui.translationTableFontSelect: {
                    const target = event.target as HTMLOptionElement;

                    if (target.value === "") {
                        this.#settings.appearance.translationTableFont = "";
                        target.style.fontFamily = "initial";
                    } else {
                        const fontPath = target.value.replaceAll("\\", "/");
                        const fontData = await readFile(fontPath);

                        if (isErr(fontData)) {
                            void error(fontData[0]!);
                            return;
                        }

                        const font = await new FontFace(
                            "CustomTranslationTableFont",
                            fontData[1]!,
                        ).load();

                        document.fonts.add(font);
                        target.style.fontFamily = "CustomTranslationTableFont";
                        this.#settings.appearance.translationTableFont =
                            fontPath;
                    }
                    break;
                }
                case this.#ui.uiFontSelect: {
                    const target = event.target as HTMLOptionElement;

                    if (target.value === "") {
                        this.#settings.appearance.uiFont = "";
                        target.style.fontFamily = "initial";
                    } else {
                        const fontPath = target.value.replaceAll("\\", "/");
                        const fontData = await readFile(fontPath);

                        if (isErr(fontData)) {
                            void error(fontData[0]!);
                            return;
                        }

                        const font = await new FontFace(
                            "CustomUIFont",
                            fontData[1]!,
                        ).load();

                        document.fonts.add(font);
                        target.style.fontFamily = "CustomUIFont";
                        this.#settings.appearance.uiFont = fontPath;
                    }
                    break;
                }
                case this.#ui.rowDeleteModeSelect: {
                    const target = event.target as HTMLOptionElement;
                    this.#settings.core.rowDeleteMode = Number(target);
                    break;
                }
                case this.#ui.fileContextSelect: {
                    if (this.#prevOption) {
                        this.#projectSettings.fileContexts[this.#prevOption] =
                            this.#ui.fileContextInput.value;
                    }

                    this.#prevOption = this.#ui.fileContextSelect.value;

                    const context =
                        (this.#projectSettings.fileContexts[
                            this.#prevOption
                        ] as string | undefined) ?? "";

                    this.#ui.fileContextInput.value = context;
                }
            }
        });

        void APP_WINDOW.onCloseRequested(async () => {
            this.#settings.core.backup.enabled = this.#ui.backupCheck.checked;
            this.#settings.core.backup.period =
                this.#ui.backupPeriodInput.valueAsNumber;
            this.#settings.core.backup.max =
                this.#ui.backupMaxInput.valueAsNumber;

            this.#settings.appearance.translationTableFont =
                this.#ui.translationTableFontSelect.value;
            this.#settings.appearance.uiFont = this.#ui.uiFontSelect.value;

            this.#saveCurrentEndpointSettings();

            this.#prevEndpoint = Number(
                this.#ui.translationEndpointSelect.value,
            );

            this.#projectSettings.lineLengthHint =
                this.#ui.lineLengthHintInput.valueAsNumber;
            this.#projectSettings.projectContext =
                this.#ui.projectContextInput.value;

            await emit<[Settings, ProjectSettings]>("close-settings", [
                this.#settings,
                this.#projectSettings,
            ]);
        });
    }

    #setupUI(): SettingsWindowUI {
        return {
            coreSettingsButton: document.getElementById(
                "core-settings-button",
            ) as HTMLButtonElement,
            coreSettings: document.getElementById(
                "core-settings",
            ) as HTMLDivElement,

            backupCheck: document.getElementById(
                "backup-check",
            ) as HTMLInputElement,
            backupSettings: document.getElementById(
                "backup-settings",
            ) as HTMLDivElement,
            backupMaxInput: document.getElementById(
                "backup-max-input",
            ) as HTMLInputElement,
            backupPeriodInput: document.getElementById(
                "backup-period-input",
            ) as HTMLInputElement,

            rowDeleteModeSelect: document.getElementById(
                "row-delete-mode-select",
            ) as HTMLSelectElement,

            displayGhostLinesCheck: document.getElementById(
                "display-ghost-lines-check",
            ) as HTMLInputElement,
            checkForUpdatesCheck: document.getElementById(
                "check-for-updates-check",
            ) as HTMLInputElement,

            appearanceSettingsButton: document.getElementById(
                "appearance-settings-button",
            ) as HTMLButtonElement,
            appearanceSettings: document.getElementById(
                "appearance-settings",
            ) as HTMLDivElement,

            translationTableFontSelect: document.getElementById(
                "translation-table-font-select",
            ) as HTMLSelectElement,
            uiFontSelect: document.getElementById(
                "ui-font-select",
            ) as HTMLSelectElement,

            controlsSettingsButton: document.getElementById(
                "controls-settings-button",
            ) as HTMLButtonElement,
            controlsSettings: document.getElementById(
                "controls-settings",
            ) as HTMLDivElement,

            translationSettingsButton: document.getElementById(
                "translation-settings-button",
            ) as HTMLButtonElement,
            translationSettings: document.getElementById(
                "translation-settings",
            ) as HTMLDivElement,

            endpointKeyContainer: document.getElementById(
                "endpoint-key-container",
            ) as HTMLDivElement,
            translationEndpointSelect: document.getElementById(
                "translation-endpoint-select",
            ) as HTMLSelectElement,
            APIKeyInput: document.getElementById(
                "api-key-input",
            ) as HTMLInputElement,
            APIKeyDesc: document.getElementById(
                "api-key-desc",
            ) as HTMLDivElement,
            validateKeyButton: document.getElementById(
                "validate-key-button",
            ) as HTMLButtonElement,

            aiThings: document.getElementById("ai-things") as HTMLDivElement,
            yandexFolderIDContainer: document.getElementById(
                "yandex-folder-id-container",
            ) as HTMLDivElement,
            yandexFolderInput: document.getElementById(
                "yandex-folder-input",
            ) as HTMLInputElement,
            modelSelect: document.getElementById(
                "model-select",
            ) as HTMLSelectElement,
            temperatureInput: document.getElementById(
                "temperature-input",
            ) as HTMLInputElement,
            tokenLimitInput: document.getElementById(
                "token-limit-input",
            ) as HTMLInputElement,
            thinkingCheckbox: document.getElementById(
                "thinking-checkbox",
            ) as HTMLInputElement,
            useGlossaryCheckbox: document.getElementById(
                "use-glossary-checkbox",
            ) as HTMLInputElement,
            defaultSystemPromptButton: document.getElementById(
                "default-system-prompt-button",
            ) as HTMLButtonElement,
            systemPromptTextarea: document.getElementById(
                "system-prompt-textarea",
            ) as HTMLTextAreaElement,

            projectSettingsButton: document.getElementById(
                "project-settings-button",
            ) as HTMLButtonElement,
            projectSettings: document.getElementById(
                "project-settings",
            ) as HTMLDivElement,

            lineLengthHintInput: document.getElementById(
                "line-length-hint-input",
            ) as HTMLInputElement,
            fileContextSelect: document.getElementById(
                "file-context-select",
            ) as HTMLSelectElement,
            fileContextInput: document.getElementById(
                "file-context-input",
            ) as HTMLTextAreaElement,
            projectContextInput: document.getElementById(
                "project-context-input",
            ) as HTMLTextAreaElement,
        };
    }

    async *#fetchFonts(): AsyncIterableIterator<[string, string]> {
        const fontPath =
            getPlatform() === "windows"
                ? "C:/Windows/Fonts"
                : "/usr/share/fonts";

        await expandScope(fontPath);
        const entries = await walkDir(fontPath);

        for (const path of entries) {
            const extension = path.slice(-3);

            if (["ttf", "otf"].includes(extension)) {
                yield [
                    path.slice(path.replaceAll("\\", "/").lastIndexOf("/") + 1),
                    path,
                ];
            }
        }
    }

    #toggleTranslationElements(): void {
        const endpoint = Number(
            this.#ui.translationEndpointSelect.value,
        ) as TranslationEndpoint;

        this.#ui.modelSelect.innerHTML = "";
        const requiresKey = endpoint > TranslationEndpoint.Google;

        if (requiresKey) {
            this.#ui.endpointKeyContainer.classList.remove("hidden");
            this.#ui.yandexFolderIDContainer.classList.add("hidden");

            const aiEndpoint = endpoint > TranslationEndpoint.DeepL;

            if (aiEndpoint) {
                this.#ui.aiThings.classList.remove("hidden");
            } else {
                this.#ui.aiThings.classList.add("hidden");
            }

            let endpointLink!: string;

            switch (endpoint) {
                case TranslationEndpoint.Yandex:
                    endpointLink =
                        "https://yandex.com/dev/dictionary/keys/get/";
                    this.#ui.yandexFolderIDContainer.classList.remove("hidden");
                    break;
                case TranslationEndpoint.DeepL:
                    endpointLink =
                        "https://support.deepl.com/hc/en-us/articles/360020695820-API-key-for-DeepL-API";
                    break;
                case TranslationEndpoint.OpenAI:
                    endpointLink = "https://platform.openai.com/api-keys";
                    break;
                case TranslationEndpoint.Anthropic:
                    endpointLink =
                        "https://console.anthropic.com/settings/keys";
                    break;
                case TranslationEndpoint.DeepSeek:
                    endpointLink = "https://platform.deepseek.com/api_keys";
                    break;
                case TranslationEndpoint.Gemini:
                    endpointLink =
                        "https://ai.google.dev/gemini-api/docs/api-key";
                    break;
            }

            this.#ui.APIKeyDesc.innerHTML = t`You need an API key. Check out <a class="text-third cursor-pointer hover:underline">${endpointLink}</a> on how to get it.`;
        } else {
            this.#ui.endpointKeyContainer.classList.add("hidden");
            this.#ui.aiThings.classList.add("hidden");
        }

        this.#loadEndpointSettings(endpoint);
    }

    #loadEndpointSettings(endpoint: TranslationEndpoint): void {
        const translationSettings =
            this.#settings.translation.endpoints[endpoint as number];

        this.#ui.APIKeyInput.value = translationSettings.apiKey;
        this.#ui.yandexFolderInput.value = translationSettings.yandexFolderId;
        this.#ui.modelSelect.value = translationSettings.model;
        this.#ui.systemPromptTextarea.value = translationSettings.systemPrompt;
        this.#ui.thinkingCheckbox.checked = translationSettings.thinking;
        this.#ui.useGlossaryCheckbox.checked = translationSettings.useGlossary;
        this.#ui.tokenLimitInput.value =
            translationSettings.tokenLimit.toString();
        this.#ui.temperatureInput.value =
            translationSettings.temperature.toString();
    }

    #saveCurrentEndpointSettings(): void {
        const endpoint = this.#prevEndpoint;
        const translationSettings =
            this.#settings.translation.endpoints[endpoint as number];

        translationSettings.apiKey = this.#ui.APIKeyInput.value;
        translationSettings.yandexFolderId = this.#ui.yandexFolderInput.value;
        translationSettings.model = this.#ui.modelSelect.value;
        translationSettings.systemPrompt = this.#ui.systemPromptTextarea.value;
        translationSettings.thinking = this.#ui.thinkingCheckbox.checked;
        translationSettings.useGlossary = this.#ui.useGlossaryCheckbox.checked;
        translationSettings.tokenLimit = this.#ui.tokenLimitInput.valueAsNumber;
        translationSettings.temperature =
            this.#ui.temperatureInput.valueAsNumber;
    }

    async #init(
        payload: [Settings, Themes, ProjectSettings, Tabs],
    ): Promise<void> {
        clearInterval(this.#intevalID);

        this.#settings = payload[0];
        this.#projectSettings = payload[2];

        const themes = payload[1];
        const tabs = payload[3];

        for (const tabName in tabs) {
            const fileOption = document.createElement("option");
            fileOption.value = tabName;
            fileOption.innerHTML = tabName;
            this.#ui.fileContextSelect.add(fileOption);
        }

        utils.applyTheme(themes, this.#settings.appearance.theme);
        await utils.initializeLocalization(
            "settings",
            this.#settings.appearance.language,
        );
        utils.retranslate();

        this.#ui.backupCheck.checked = this.#settings.core.backup.enabled;

        this.#ui.backupPeriodInput.min = consts.MIN_BACKUP_PERIOD.toString();
        this.#ui.backupPeriodInput.max =
            this.#settings.core.backup.period.toString();

        this.#ui.backupMaxInput.min = "1";
        this.#ui.backupMaxInput.max = consts.MAX_BACKUPS.toString();

        this.#ui.backupMaxInput.value =
            this.#settings.core.backup.max.toString();
        this.#ui.backupPeriodInput.value =
            this.#settings.core.backup.period.toString();

        this.#ui.rowDeleteModeSelect.value =
            this.#settings.core.rowDeleteMode.toString();

        this.#ui.displayGhostLinesCheck.checked =
            this.#settings.appearance.displayGhostLines;
        this.#ui.checkForUpdatesCheck.checked =
            this.#settings.core.updatesEnabled;

        if (this.#settings.core.backup.enabled) {
            this.#ui.backupSettings.classList.add("flex");
        } else {
            this.#ui.backupSettings.classList.add("hidden");
        }

        this.#ui.lineLengthHintInput.value =
            this.#projectSettings.lineLengthHint.toString();
        this.#ui.projectContextInput.value =
            this.#projectSettings.projectContext;

        this.#toggleTranslationElements();

        for await (const [name, path] of this.#fetchFonts()) {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = path;
            this.#ui.translationTableFontSelect.add(
                option.cloneNode(true) as HTMLOptionElement,
            );

            const normalizedPath = path.replaceAll("\\", "/");
            if (
                normalizedPath ===
                this.#settings.appearance.translationTableFont
            ) {
                this.#ui.translationTableFontSelect.value = option.value;
            }

            this.#ui.uiFontSelect.add(option);

            if (normalizedPath === this.#settings.appearance.uiFont) {
                this.#ui.uiFontSelect.value = option.value;
            }
        }

        if (
            this.#settings.appearance.translationTableFont !== "" &&
            this.#ui.translationTableFontSelect.value === ""
        ) {
            alert(
                t`Translation table font was not found. Ensure it's installed on your system.`,
            );
        }

        if (
            this.#settings.appearance.uiFont !== "" &&
            this.#ui.uiFontSelect.value === ""
        ) {
            alert(
                t`UI font was not found. Ensure it's installed on your system.`,
            );
        }
    }
}

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new SettingsWindow();
