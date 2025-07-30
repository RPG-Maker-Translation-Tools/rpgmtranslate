import { exists } from "@tauri-apps/plugin-fs";
import { join } from "../utilities/functions";
import { DuplicateMode, EngineType } from "./enums";

export class ProjectSettings {
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
    }

    public async findEngineType(projectPath: string): Promise<boolean> {
        const systemFiles: [EngineType, string][] = [
            [EngineType.XP, "System.rxdata"],
            [EngineType.VX, "System.rvdata"],
            [EngineType.VXAce, "System.rvdata2"],
            [EngineType.New, "System.json"],
        ];

        let engineTypeFound = false;

        for (const [type, file] of systemFiles) {
            if (await exists(join(projectPath, this.sourceDirectory, file))) {
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
            if (await exists(join(projectPath, directory))) {
                this.sourceDirectory = directory;
                sourceDirectoryFound = true;
                break;
            }
        }

        return sourceDirectoryFound;
    }
}
