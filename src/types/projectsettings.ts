import { exists } from "@tauri-apps/plugin-fs";
import { join } from "../utilities/functions";
import { EngineType, MapsProcessingMode } from "./enums";

export class ProjectSettings {
    public engineType = EngineType.New;
    public romanize = false;
    public translationLanguages: { from: string; to: string } = {
        from: "",
        to: "",
    };
    public mapsProcessingMode = MapsProcessingMode.Default;
    public disableCustomProcessing = false;
    public trim = false;
    public originalDirectory = "Data";

    constructor(options: ProjectSettingsOptions = {}) {
        this.engineType = options.engineType ?? this.engineType;
        this.romanize = options.romanize ?? this.romanize;
        this.translationLanguages =
            options.translationLanguages ?? this.translationLanguages;
        this.mapsProcessingMode =
            options.mapsProcessingMode ?? this.mapsProcessingMode;
        this.disableCustomProcessing =
            options.disableCustomProcessing ?? this.disableCustomProcessing;
        this.trim = options.trim ?? this.trim;
        this.originalDirectory =
            options.originalDirectory ?? this.originalDirectory;
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
            if (await exists(join(projectPath, this.originalDirectory, file))) {
                this.engineType = type;
                engineTypeFound = true;
                break;
            }
        }

        return engineTypeFound;
    }

    public async findOriginalDirectory(projectPath: string): Promise<boolean> {
        let originalDirectoryFound = false;

        for (const directory of ["Data", "data", "original"]) {
            if (await exists(join(projectPath, directory))) {
                this.originalDirectory = directory;
                originalDirectoryFound = true;
                break;
            }
        }

        return originalDirectoryFound;
    }
}
