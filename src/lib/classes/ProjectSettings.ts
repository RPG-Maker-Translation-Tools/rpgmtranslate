import {
    BaseFlags,
    DuplicateMode,
    EngineType,
    TokenizerAlgorithm,
} from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import { expandScope, mkdir } from "@utils/invokes";

import { exists } from "@tauri-apps/plugin-fs";

export interface ProjectSettingsOptions {
    engineType: import("@enums/EngineType").EngineType;
    translationLanguages: {
        sourceLanguage: TokenizerAlgorithm;
        translationLanguage: TokenizerAlgorithm;
    };
    duplicateMode: import("@enums/DuplicateMode").DuplicateMode;
    flags: import("@enums/BaseFlags").BaseFlags;
    hashes: string[];
    lineLengthHint: number;
    completed: string[];

    translationColumns: [string, number][];
    translationColumnCount: number;

    sourceDirectory: string;

    projectContext: string;
    fileContexts: Record<string, string>;
}

export class ProjectSettings implements ProjectSettingsOptions {
    public engineType = EngineType.New;
    public translationLanguages = {
        sourceLanguage: TokenizerAlgorithm.None,
        translationLanguage: TokenizerAlgorithm.None,
    };
    public duplicateMode = DuplicateMode.Allow;
    public flags = BaseFlags.None;
    public hashes: string[] = [];
    public lineLengthHint = 0;
    public completed: string[] = [];

    public rowColumnWidth: number = consts.DEFAULT_ROW_COLUMN_WIDTH;
    public sourceColumnWidth: number = consts.DEFAULT_COLUMN_WIDTH;

    public translationColumns: [string, number][] = [
        ["Translation", consts.DEFAULT_COLUMN_WIDTH],
    ];
    public translationColumnCount = 1;

    public sourceDirectory = "Data";

    public projectContext = "";
    public fileContexts: Record<string, string> = {};

    #programDataPath = "";
    #matchesPath = "";
    #tempMapsPath = "";
    #sourcePath = "";
    #translationPath = "";
    #logPath = "";
    #projectSettingsPath = "";
    #backupPath = "";
    #outputPath = "";
    #glossaryPath = "";

    public constructor(options: Partial<ProjectSettingsOptions> = {}) {
        utils.deepAssign(this as unknown as Record<string, unknown>, options);
    }

    public get programDataPath(): string {
        return this.#programDataPath;
    }

    public get matchesPath(): string {
        return this.#matchesPath;
    }

    public get tempMapsPath(): string {
        return this.#tempMapsPath;
    }

    public get sourcePath(): string {
        return this.#sourcePath;
    }

    public get translationPath(): string {
        return this.#translationPath;
    }

    public get logPath(): string {
        return this.#logPath;
    }

    public get projectSettingsPath(): string {
        return this.#projectSettingsPath;
    }

    public get backupPath(): string {
        return this.#backupPath;
    }

    public get outputPath(): string {
        return this.#outputPath;
    }

    public get glossaryPath(): string {
        return this.#glossaryPath;
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

        for (const directory of ["Data", "data"]) {
            if (await exists(utils.join(projectPath, directory))) {
                this.sourceDirectory = directory;
                sourceDirectoryFound = true;
                break;
            }
        }

        return sourceDirectoryFound;
    }

    public async setProjectPath(projectPath: string): Promise<void> {
        this.#programDataPath = utils.join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
        );
        this.#matchesPath = utils.join(
            this.#programDataPath,
            consts.MATCHES_DIRECTORY,
        );
        this.#tempMapsPath = utils.join(
            this.#programDataPath,
            consts.TEMP_MAPS_DIRECTORY,
        );
        this.#sourcePath = utils.join(projectPath, this.sourceDirectory);
        this.#outputPath = utils.join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
            "output",
        );
        this.#translationPath = utils.join(
            this.#programDataPath,
            consts.TRANSLATION_DIRECTORY,
        );
        this.#projectSettingsPath = utils.join(
            this.#programDataPath,
            consts.PROJECT_SETTINGS_FILE,
        );
        this.#logPath = utils.join(this.#programDataPath, consts.LOG_FILE);
        this.#backupPath = utils.join(
            this.#programDataPath,
            consts.BACKUP_DIRECTORY,
        );
        this.#glossaryPath = utils.join(
            this.#programDataPath,
            consts.GLOSSARY_FILE,
        );

        await expandScope(this.#programDataPath);
        await mkdir(this.#programDataPath, { recursive: true });
        await mkdir(this.#tempMapsPath, { recursive: true });
        await mkdir(this.#backupPath, { recursive: true });
    }

    public addColumn(): void {
        this.translationColumns.push([
            "Translation",
            consts.DEFAULT_COLUMN_WIDTH,
        ]);
        this.translationColumnCount++;
    }
}
