import { Language, RowDeleteMode } from "@enums/index";

import * as consts from "@utils/constants";

import { locale as getLocale } from "@tauri-apps/plugin-os";

interface Backup {
    enabled: boolean;
    period: number;
    max: number;
}

export interface SettingsOptions {
    project?: string;

    firstLaunch?: boolean;
    backup?: Backup;
    rowDeleteMode?: RowDeleteMode;
    zoom?: number;
    font?: string;
    language?: Language;
    displayGhostLines?: boolean;
    checkForUpdates?: boolean;

    theme?: string;
}

export class Settings implements SettingsOptions {
    public project = "";
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
    public checkForUpdates = true;
    public zoom = 1;

    public constructor(options: SettingsOptions = {}) {
        this.project = options.project ?? this.project;
        this.language = options.language ?? this.language;
        this.backup = options.backup ?? this.backup;
        this.theme = options.theme ?? this.theme;
        this.font = options.font ?? this.font;
        this.firstLaunch = options.firstLaunch ?? this.firstLaunch;
        this.rowDeleteMode = options.rowDeleteMode ?? this.rowDeleteMode;
        this.displayGhostLines =
            options.displayGhostLines ?? this.displayGhostLines;
        this.checkForUpdates = options.checkForUpdates ?? this.checkForUpdates;
        this.zoom = options.zoom ?? this.zoom;
    }

    public async setLanguageFromLocale() {
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
}
