import {
    BaseFlags,
    DuplicateMode,
    EngineType,
    TokenizerAlgorithm,
} from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

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

export type ColumnData = [label: string, width: number];

export class ProjectSettings implements ProjectSettingsOptions {
    public projectPath = "";

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

    public translationColumns: ColumnData[] = [
        ["Translation", consts.DEFAULT_COLUMN_WIDTH],
    ];
    public translationColumnCount = 1;

    public sourceDirectory = "Data";

    public projectContext = "";
    public fileContexts: Record<string, string> = {};

    public constructor(options: Partial<ProjectSettingsOptions> = {}) {
        utils.deepAssign(this as unknown as Record<string, unknown>, options);
    }

    public get programDataPath(): string {
        return utils.join(this.projectPath, consts.PROGRAM_DATA_DIRECTORY);
    }

    public get matchesPath(): string {
        return utils.join(this.projectPath, consts.MATCHES_DIRECTORY);
    }

    public get tempMapsPath(): string {
        return utils.join(this.projectPath, consts.TEMP_MAPS_DIRECTORY);
    }

    public get sourcePath(): string {
        return utils.join(this.projectPath, consts.PROGRAM_DATA_DIRECTORY);
    }

    public get translationPath(): string {
        return utils.join(this.projectPath, consts.TRANSLATION_DIRECTORY);
    }

    public get projectSettingsPath(): string {
        return utils.join(this.projectPath, consts.PROJECT_SETTINGS_FILE);
    }

    public get backupPath(): string {
        return utils.join(this.projectPath, consts.BACKUP_DIRECTORY);
    }

    public get outputPath(): string {
        return utils.join(this.projectPath, consts.OUTPUT_DIRECTORY);
    }

    public get glossaryPath(): string {
        return utils.join(this.projectPath, consts.GLOSSARY_FILE);
    }

    public columnName(index: number): string {
        return this.translationColumns[index][0];
    }

    public columnWidth(index: number): number {
        return this.translationColumns[index][1];
    }

    public addColumn(): void {
        this.translationColumns.push([
            "Translation",
            consts.DEFAULT_COLUMN_WIDTH,
        ]);
        this.translationColumnCount++;
    }
}
