import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { locale as getLocale } from "@tauri-apps/plugin-os";
import {
    BACKUP_DIRECTORY,
    LOG_FILE,
    MAX_BACKUPS,
    MIN_BACKUP_PERIOD,
    PROGRAM_DATA_DIRECTORY,
    PROJECT_SETTINGS_FILE,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
} from "../utilities/constants";
import { join } from "../utilities/functions";
import { expandScope } from "../utilities/invokes";
import { EngineType, Language, RowDeleteMode } from "./enums";

interface SettingsOptions {
    language?: Language;
    backup?: { enabled: boolean; period: number; max: number };
    theme?: string;
    fontUrl?: string;
    firstLaunch?: boolean;
    projectPath?: string;
    programDataPath?: string;
    tempMapsPath?: string;
    sourcePath?: string;
    translationPath?: string;
    logPath?: string;
    projectSettingsPath?: string;
    backupPath?: string;
    engineType?: EngineType;
    rowDeleteMode?: RowDeleteMode;
    displayGhostLines?: boolean;
    checkForUpdates?: boolean;
    zoom?: number;
}

export class Settings {
    public language = Language.English;
    public backup = {
        enabled: true,
        period: MIN_BACKUP_PERIOD,
        max: MAX_BACKUPS,
    };
    public theme = "cool-zinc";
    public fontUrl = "";
    public firstLaunch = true;
    public projectPath = "";
    public programDataPath = "";
    public tempMapsPath = "";
    public sourcePath = "";
    public translationPath = "";
    public logPath = "";
    public projectSettingsPath = "";
    public backupPath = "";
    public engineType = EngineType.New;
    public rowDeleteMode = RowDeleteMode.Disabled;
    public displayGhostLines = false;
    public checkForUpdates = true;
    public nextBackupNumber = 0;
    public zoom = 1;
    public outputPath = "";

    public constructor(options: SettingsOptions = {}) {
        this.language = options.language ?? this.language;
        this.backup = options.backup ?? this.backup;
        this.theme = options.theme ?? this.theme;
        this.fontUrl = options.fontUrl ?? this.fontUrl;
        this.firstLaunch = options.firstLaunch ?? this.firstLaunch;
        this.projectPath = options.projectPath ?? this.projectPath;
        this.programDataPath = options.programDataPath ?? this.programDataPath;
        this.tempMapsPath = options.tempMapsPath ?? this.tempMapsPath;
        this.sourcePath = options.sourcePath ?? this.sourcePath;
        this.translationPath = options.translationPath ?? this.translationPath;
        this.logPath = options.logPath ?? this.logPath;
        this.projectSettingsPath =
            options.projectSettingsPath ?? this.projectSettingsPath;
        this.backupPath = options.backupPath ?? this.backupPath;
        this.engineType = options.engineType ?? this.engineType;
        this.rowDeleteMode = options.rowDeleteMode ?? this.rowDeleteMode;
        this.displayGhostLines =
            options.displayGhostLines ?? this.displayGhostLines;
        this.checkForUpdates = options.checkForUpdates ?? this.checkForUpdates;
        this.zoom = options.zoom ?? this.zoom;
    }

    public async setLanguageFromLocale() {
        const locale = await getLocale();

        if (!locale) {
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

    public reset() {
        this.projectPath = "";
        this.programDataPath = "";
        this.tempMapsPath = "";
        this.sourcePath = "";
        this.outputPath = "";
        this.translationPath = "";
        this.projectSettingsPath = "";
        this.logPath = "";
        this.backupPath = "";
    }

    public async setProjectPath(projectPath: string, sourceDirectory: string) {
        this.projectPath = projectPath;
        this.programDataPath = join(this.projectPath, PROGRAM_DATA_DIRECTORY);
        this.tempMapsPath = join(this.programDataPath, TEMP_MAPS_DIRECTORY);
        this.sourcePath = join(this.projectPath, sourceDirectory);
        this.outputPath = join(
            this.projectPath,
            PROGRAM_DATA_DIRECTORY,
            "output",
        );
        this.translationPath = join(
            this.programDataPath,
            TRANSLATION_DIRECTORY,
        );
        this.projectSettingsPath = join(
            this.programDataPath,
            PROJECT_SETTINGS_FILE,
        );
        this.logPath = join(this.programDataPath, LOG_FILE);
        this.backupPath = join(this.programDataPath, BACKUP_DIRECTORY);

        await expandScope(this.programDataPath);
        await mkdir(this.programDataPath, { recursive: true });
        await mkdir(this.tempMapsPath, { recursive: true });
        await mkdir(this.backupPath, { recursive: true });

        if (!(await exists(this.logPath))) {
            await writeTextFile(this.logPath, "{}");
        }
    }
}
