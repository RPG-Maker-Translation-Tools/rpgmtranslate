import {
    Language,
    RowDeleteMode,
    TranslationEndpoint,
    TranslationEndpointFlags,
} from "@lib/enums";

import * as consts from "@utils/constants";
import { getAPIKeys, isErr, readTextFile } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { ask } from "@tauri-apps/plugin-dialog";
import { error, info } from "@tauri-apps/plugin-log";
import { locale as getLocale } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { deepAssign } from "@utils/functions";

interface Backup {
    enabled: boolean;
    period: number;
    max: number;
}

export interface CoreSettings {
    projectPath: string;
    firstLaunch: boolean;
    backup: Backup;
    rowDeleteMode: RowDeleteMode;
    updatesEnabled: boolean;
    recentProjects: string[];
}

export interface AppearanceSettings {
    displayGhostLines: boolean;
    zoom: number;
    translationTableFont: string;
    uiFont: string;
    theme: string;
    language: Language;
}

interface EndpointSettings {
    endpoint: TranslationEndpoint;
    apiKey: string;
    yandexFolderId: string;
    model: string;
    systemPrompt: string;
    useGlossary: boolean;
    thinking: boolean;
    temperature: number;
    tokenLimit: number;
}

export interface TranslationSettings {
    endpoints: readonly [
        google: EndpointSettings,
        yandex: EndpointSettings,
        deepl: EndpointSettings,
        openai: EndpointSettings,
        anthropic: EndpointSettings,
        deepseek: EndpointSettings,
        gemini: EndpointSettings,
    ];
    enabledTranslations: TranslationEndpointFlags;
}

export interface ControlSettings extends Record<string, string> {
    openResultsPanel: string;
    openTabPanel: string;
    // TODO: More
}

export interface SettingsOptions {
    core?: Partial<CoreSettings>;
    appearance?: Partial<AppearanceSettings>;
    controls?: Partial<ControlSettings>;
    translation?: Partial<TranslationSettings>;
}

export class Settings implements SettingsOptions {
    public core: CoreSettings = {
        projectPath: "",
        firstLaunch: true,
        backup: {
            enabled: true,
            period: consts.MIN_BACKUP_PERIOD,
            max: consts.MAX_BACKUPS,
        },
        rowDeleteMode: RowDeleteMode.Disabled,
        updatesEnabled: true,
        recentProjects: [],
    };

    public appearance: AppearanceSettings = {
        displayGhostLines: false,
        zoom: 1,
        translationTableFont: "",
        uiFont: "",
        theme: "cool-zinc",
        language: Language.English,
    };

    public controls: ControlSettings = {
        openResultsPanel: "KeyR",
        openTabPanel: "Tab",
    };

    public translation: TranslationSettings = {
        endpoints: [
            {
                endpoint: TranslationEndpoint.Google,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: false,
                thinking: false,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.Yandex,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: false,
                thinking: false,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.DeepL,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: false,
                thinking: false,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.OpenAI,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: true,
                thinking: true,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.Anthropic,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: true,
                thinking: true,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.DeepSeek,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: true,
                thinking: true,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
            {
                endpoint: TranslationEndpoint.Gemini,
                apiKey: "",
                model: "",
                systemPrompt: "",
                yandexFolderId: "",
                useGlossary: true,
                thinking: true,
                temperature: consts.DEFAULT_TEMPERATURE,
                tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
            },
        ],
        enabledTranslations: TranslationEndpointFlags.Google,
    };

    public constructor(options: Partial<SettingsOptions> = {}) {
        deepAssign(this as unknown as Record<string, unknown>, options);
    }

    public async new(): Promise<boolean> {
        let settings: Settings;

        const settingsContent = await readTextFile(consts.SETTINGS_PATH, {
            baseDir: consts.RESOURCE_DIRECTORY,
        });

        if (isErr(settingsContent) || !settingsContent[1]!) {
            void error(settingsContent[0]!);
            settings = new Settings();
        } else {
            settings = new Settings(
                JSON.parse(settingsContent[1]) as SettingsOptions,
            );
        }

        deepAssign(
            this as unknown as Record<string, unknown>,
            settings as unknown as Record<string, unknown>,
        );

        const keys = await getAPIKeys();

        if (isErr(keys)) {
            void error(keys[0]!);
        } else {
            const keysArray = keys[1]!;

            for (let i = 0; i < keysArray.length; i++) {
                this.translation.endpoints[i].apiKey = keysArray[i];
            }
        }

        return true;
    }

    public async setLanguageFromLocale(): Promise<void> {
        const locale = await getLocale();

        if (locale === null) {
            return;
        }

        const mainPart: string = locale.split("-", 1)[0];

        switch (mainPart) {
            case "ru":
            case "uk":
            case "be":
                this.appearance.language = Language.Russian;
                break;
            default:
                this.appearance.language = Language.English;
                break;
        }
    }

    public async checkForUpdates(): Promise<void> {
        if (!this.core.updatesEnabled) {
            return;
        }

        await check()
            .then(async (update) => {
                if (!update) {
                    void info(t`Program is up to date.`);
                    return;
                }

                const { version, currentVersion } = update;

                const installUpdate = await ask(
                    t`New version found: ${version}\nCurrent version: ${currentVersion}\nRelease notes: https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate/releases/latest`,
                    {
                        title: t`Update available`,
                        okLabel: t`Install`,
                    },
                );

                if (!installUpdate) {
                    return;
                }

                let downloaded = 0;
                let contentLength: number | undefined = 0;

                await update.downloadAndInstall((event) => {
                    switch (event.event) {
                        case "Started":
                            contentLength = event.data.contentLength;
                            void info(
                                `Started downloading ${event.data.contentLength} bytes`,
                            );
                            break;
                        case "Progress":
                            downloaded += event.data.chunkLength;
                            void info(
                                `Downloaded ${downloaded} from ${contentLength}`,
                            );
                            break;
                        case "Finished":
                            void info("Download finished");
                            break;
                    }
                });

                await relaunch();
            })
            .catch((err) => {
                void error(`${err}`);
            });
    }
}
