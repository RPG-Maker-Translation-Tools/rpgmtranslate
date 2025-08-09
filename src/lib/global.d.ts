type Themes = Record<string, Record<string, string>>;

interface Localization {
    labels: Record<string, string>;
    titles: Record<string, string>;
    placeholders: Record<string, string>;
    buttons: Record<string, string>;
    messages: Record<string, string>;
}

interface Bookmark {
    file: string;
    rowIndex: number;
    description: string;
}

type LogEntry = Record<string, [string, number, string, string]>;
type ReplacementLog = Record<string, LogEntry>;

interface TranslationLanguages {
    from: string;
    to: string;
}

type MatchObject = Record<string, string[]>;

interface SearchFlagsObject {
    flags: import("@enums/SearchFlags").SearchFlags;
}

interface CurrentTab {
    name: string;
    index: number;
    content: HTMLDivElement;
}

interface OptionsBase extends Record<string, unknown> {
    sourcePath: string;
    translationPath: string;
    engineType: import("@enums/EngineType").EngineType;
    duplicateMode: DuplicateMode;
    romanize: boolean;
    disableCustomProcessing: boolean;
    disableProcessing: import("@enums/FileFlags").FileFlags;
    trim: boolean;
}

interface ReadOptions extends OptionsBase {
    readMode: import("@enums/ReadMode").ReadMode;
    projectPath: string;
    ignore: boolean;
}

interface WriteOptions extends OptionsBase {
    outputPath: string;
    gameTitle: string;
}

interface PurgeOptions extends OptionsBase {
    gameTitle: string;
    createIgnore: boolean;
}

interface TabInfo {
    tabs: Record<string, number>;
    tabCount: number;
    total: number[];
    translated: number[];
    currentTab: CurrentTab;
    updateTabProgress: (tabIndex: number) => void;
    changeTab: (filename: string | null, newTabIndex?: number) => Promise<void>;
}

interface SearchResults {
    results: Record<string, number[]>;
    pages: number;
    regexp: RegExp;
}
