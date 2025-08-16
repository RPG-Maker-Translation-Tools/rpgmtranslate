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
    translationColumns?: [string, number][];

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
        source: "",
        translation: "",
    };
    public duplicateMode = DuplicateMode.Allow;
    public disableCustomProcessing = false;
    public trim = false;
    public sourceDirectory = "Data";
    public rowColumnWidth = consts.DEFAULT_ROW_COLUMN_WIDTH;
    public sourceColumnWidth = consts.DEFAULT_COLUMN_WIDTH;
    public translationColumns: [string, number][] = [
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
        this.translationColumns =
            options.translationColumns ?? this.translationColumns;
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

    public columnName(index: number): string {
        return this.translationColumns[index][0];
    }

    public columnWidth(index: number): number {
        return this.translationColumns[index][1];
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

    public async setProjectPath(projectPath: string): Promise<void> {
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

    public addColumn(): void {
        this.translationColumns.push([
            "Translation",
            consts.DEFAULT_COLUMN_WIDTH,
        ]);
        this.translationColumnCount++;
    }
}
