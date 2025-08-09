import { DuplicateMode, EngineType } from "@enums/index";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { expandScope } from "@utils/invokes";

export interface ProjectSettingsOptions {
    engineType?: import("@enums/EngineType").EngineType;
    translationLanguages?: TranslationLanguages;
    duplicateMode?: import("@enums/DuplicateMode").DuplicateMode;
    romanize?: boolean;
    disableCustomProcessing?: boolean;
    trim?: boolean;
    columns?: [string, number][];

    sourceDirectory?: string;
    programDataPath?: string;
    tempMapsPath?: string;
    sourcePath?: string;
    translationPath?: string;
    logPath?: string;
    projectSettingsPath?: string;
    backupPath?: string;
    translationColumnCount?: number;
    outputPath?: string;
}

export class ProjectSettings implements ProjectSettingsOptions {
    public engineType = EngineType.New;
    public romanize = false;
    public translationLanguages: TranslationLanguages = {
        from: "",
        to: "",
    };
    public duplicateMode = DuplicateMode.Allow;
    public disableCustomProcessing = false;
    public trim = false;
    public sourceDirectory = "Data";
    public columns: [string, number][] = [
        ["Row", consts.DEFAULT_ROW_COLUMN_WIDTH],
        ["Source", consts.DEFAULT_COLUMN_WIDTH],
        ["Translation", consts.DEFAULT_COLUMN_WIDTH],
    ];
    public translationColumnCount = 1;

    public programDataPath = "";
    public tempMapsPath = "";
    public sourcePath = "";
    public translationPath = "";
    public logPath = "";
    public projectSettingsPath = "";
    public backupPath = "";
    public outputPath = "";

    public constructor(options: ProjectSettingsOptions = {}) {
        this.engineType = options.engineType ?? this.engineType;
        this.romanize = options.romanize ?? this.romanize;
        this.translationLanguages =
            options.translationLanguages ?? this.translationLanguages;
        this.duplicateMode = options.duplicateMode ?? this.duplicateMode;
        this.disableCustomProcessing =
            options.disableCustomProcessing ?? this.disableCustomProcessing;
        this.trim = options.trim ?? this.trim;
        this.sourceDirectory = options.sourceDirectory ?? this.sourceDirectory;
        this.columns = options.columns ?? this.columns;
        this.translationColumnCount =
            options.translationColumnCount ?? this.translationColumnCount;

        this.programDataPath = options.programDataPath ?? this.programDataPath;
        this.tempMapsPath = options.tempMapsPath ?? this.tempMapsPath;
        this.sourcePath = options.sourcePath ?? this.sourcePath;
        this.translationPath = options.translationPath ?? this.translationPath;
        this.logPath = options.logPath ?? this.logPath;
        this.projectSettingsPath =
            options.projectSettingsPath ?? this.projectSettingsPath;
        this.backupPath = options.backupPath ?? this.backupPath;
        this.outputPath = options.outputPath ?? this.outputPath;
    }

    public async setEngineType(projectPath: string): Promise<boolean> {
        const systemFiles: [EngineType, string][] = [
            [EngineType.XP, "System.rxdata"],
            [EngineType.VX, "System.rvdata"],
            [EngineType.VXAce, "System.rvdata2"],
            [EngineType.New, "System.json"],
        ];

        let engineTypeFound = false;

        for (const [type, file] of systemFiles) {
            if (
                await exists(
                    utils.join(projectPath, this.sourceDirectory, file),
                )
            ) {
                this.engineType = type;
                engineTypeFound = true;
                break;
            }
        }

        return engineTypeFound;
    }

    public async findSourceDirectory(projectPath: string): Promise<boolean> {
        let sourceDirectoryFound = false;

        for (const directory of ["Data", "data", "original"]) {
            if (await exists(utils.join(projectPath, directory))) {
                this.sourceDirectory = directory;
                sourceDirectoryFound = true;
                break;
            }
        }

        return sourceDirectoryFound;
    }

    public async setProjectPath(projectPath: string) {
        this.programDataPath = utils.join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
        );
        this.tempMapsPath = utils.join(
            this.programDataPath,
            consts.TEMP_MAPS_DIRECTORY,
        );
        this.sourcePath = utils.join(projectPath, this.sourceDirectory);
        this.outputPath = utils.join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
            "output",
        );
        this.translationPath = utils.join(
            this.programDataPath,
            consts.TRANSLATION_DIRECTORY,
        );
        this.projectSettingsPath = utils.join(
            this.programDataPath,
            consts.PROJECT_SETTINGS_FILE,
        );
        this.logPath = utils.join(this.programDataPath, consts.LOG_FILE);
        this.backupPath = utils.join(
            this.programDataPath,
            consts.BACKUP_DIRECTORY,
        );

        await expandScope(this.programDataPath);
        await mkdir(this.programDataPath, { recursive: true });
        await mkdir(this.tempMapsPath, { recursive: true });
        await mkdir(this.backupPath, { recursive: true });

        if (!(await exists(this.logPath))) {
            await writeTextFile(this.logPath, "{}");
        }
    }
}
