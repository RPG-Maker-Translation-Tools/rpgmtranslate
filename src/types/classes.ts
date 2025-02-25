import { EngineType, Language, MapsProcessingMode, RowDeleteMode } from "./enums";

export class Settings implements ISettings {
    language: Language;
    backup: {
        enabled: boolean;
        period: number;
        max: number;
    };
    theme: string;
    fontUrl: string;
    firstLaunch: boolean;
    projectPath: string;
    engineType: EngineType | null;
    rowDeleteMode: RowDeleteMode;
    displayGhostLines: boolean;
    checkForUpdates: boolean;

    constructor(language: Language) {
        this.language = language;
        this.backup = { enabled: true, period: 60, max: 99 };
        this.theme = "cool-zinc";
        this.fontUrl = "";
        this.firstLaunch = true;
        this.projectPath = "";
        this.engineType = null;
        this.rowDeleteMode = RowDeleteMode.Disabled;
        this.displayGhostLines = false;
        this.checkForUpdates = true;
    }
}

export class CompileSettings implements ICompileSettings {
    initialized: boolean;
    customOutputPath: {
        enabled: boolean;
        path: string;
    };
    disableProcessing: {
        enabled: boolean;
        of: {
            maps: boolean;
            other: boolean;
            system: boolean;
            plugins: boolean;
        };
    };
    doNotAskAgain: boolean;

    constructor() {
        this.initialized = false;
        this.customOutputPath = { enabled: false, path: "" };
        this.disableProcessing = { enabled: false, of: { maps: false, other: false, system: false, plugins: false } };
        this.doNotAskAgain = true;
    }
}

export class ProjectSettings implements IProjectSettings {
    compileSettings: CompileSettings;
    engineType: EngineType | null;
    romanize: boolean;
    translationLanguages: { from: string; to: string };
    mapsProcessingMode: MapsProcessingMode;
    disableCustomProcessing: boolean;

    constructor() {
        this.compileSettings = new CompileSettings();
        this.engineType = null;
        this.romanize = false;
        this.translationLanguages = {
            from: "",
            to: "",
        };
        this.mapsProcessingMode = MapsProcessingMode.Default;
        this.disableCustomProcessing = false;
    }
}
