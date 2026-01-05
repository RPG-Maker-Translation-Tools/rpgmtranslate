import { Language, RowDeleteMode, TranslationEndpoint } from "@lib/enums";

import * as consts from "@utils/constants";
import { isErr, readTextFile, writeTextFile } from "@utils/invokes";

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
    font: string;
    uiFont: string;
    theme: string;
    language: Language;
}

export interface TranslationSettings {
    translationEndpoint: TranslationEndpoint;
    model: string;
    apiKey: string;
    yandexFolderId: string;
    systemPrompt: string;
    useGlossary: boolean;
    thinking: boolean;
    temperature: number;
    tokenLimit: number;
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
        font: "",
        uiFont: "",
        theme: "cool-zinc",
        language: Language.English,
    };

    public controls: ControlSettings = {
        openResultsPanel: "KeyR",
        openTabPanel: "Tab",
    };

    public translation: TranslationSettings = {
        translationEndpoint: TranslationEndpoint.Google,
        model: "",
        apiKey: "",
        yandexFolderId: "",
        systemPrompt: "",
        useGlossary: true,
        thinking: true,
        temperature: consts.DEFAULT_TEMPERATURE,
        tokenLimit: consts.DEFAULT_TOKEN_LIMIT,
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

        const written = await writeTextFile(
            consts.SETTINGS_PATH,
            JSON.stringify(settings),
            {
                baseDir: consts.RESOURCE_DIRECTORY,
            },
        );

        if (isErr(written)) {
            void error(written[0]!);
            return false;
        }

        deepAssign(
            this as unknown as Record<string, unknown>,
            settings as unknown as Record<string, unknown>,
        );
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
