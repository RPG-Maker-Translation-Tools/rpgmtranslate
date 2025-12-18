import { Language, RowDeleteMode } from "@enums/index";
import * as consts from "@utils/constants";
import { logErrorIO } from "@utils/functions";
import { expandScope } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { ask } from "@tauri-apps/plugin-dialog";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { error, info } from "@tauri-apps/plugin-log";
import { locale as getLocale } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

interface Backup {
    enabled: boolean;
    period: number;
    max: number;
}

export interface SettingsOptions {
    projectPath?: string;

    firstLaunch?: boolean;
    backup?: Backup;
    rowDeleteMode?: RowDeleteMode;
    zoom?: number;
    font?: string;
    language?: Language;
    displayGhostLines?: boolean;
    updatesEnabled?: boolean;

    theme?: string;
}

export class Settings implements SettingsOptions {
    public projectPath = "";
    public language = Language.English;
    public backup: Backup = {
        enabled: true,
        period: consts.MIN_BACKUP_PERIOD,
        max: consts.MAX_BACKUPS,
    };
    public theme = "cool-zinc";
    public font = "";
    public firstLaunch = true;
    public rowDeleteMode = RowDeleteMode.Disabled;
    public displayGhostLines = false;
    public updatesEnabled = true;
    public zoom = 1;

    public constructor(options: SettingsOptions = {}) {
        this.projectPath = options.projectPath ?? this.projectPath;
        this.language = options.language ?? this.language;
        this.backup = options.backup ?? this.backup;
        this.theme = options.theme ?? this.theme;
        this.font = options.font ?? this.font;
        this.firstLaunch = options.firstLaunch ?? this.firstLaunch;
        this.rowDeleteMode = options.rowDeleteMode ?? this.rowDeleteMode;
        this.displayGhostLines =
            options.displayGhostLines ?? this.displayGhostLines;
        this.updatesEnabled = options.updatesEnabled ?? this.updatesEnabled;
        this.zoom = options.zoom ?? this.zoom;
    }

    public async init(): Promise<void> {
        let settings: Settings;

        if (
            await exists(consts.SETTINGS_PATH, {
                baseDir: consts.RESOURCE_DIRECTORY,
            })
        ) {
            settings = new Settings(
                JSON.parse(
                    await readTextFile(consts.SETTINGS_PATH, {
                        baseDir: consts.RESOURCE_DIRECTORY,
                    }),
                ) as SettingsOptions,
            );
        } else {
            settings = new Settings();
        }

        await expandScope(consts.SETTINGS_PATH);
        await writeTextFile(consts.SETTINGS_PATH, JSON.stringify(settings), {
            baseDir: consts.RESOURCE_DIRECTORY,
        }).catch((err) => {
            logErrorIO(consts.SETTINGS_PATH, err);
        });

        Object.assign(this, settings);
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
                this.language = Language.Russian;
                break;
            default:
                this.language = Language.English;
                break;
        }
    }

    // TODO: Move this out of here?
    public async checkForUpdates(): Promise<void> {
        if (!this.updatesEnabled) {
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
