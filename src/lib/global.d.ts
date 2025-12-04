type Themes = Record<string, Record<string, string>>;

interface TabEntry {
    index: number;
    sourceLineCount: number;
    translatedLineCount: number;
}

type Tabs = Record<string, TabEntry>;
interface TabInfo {
    tabName: string;
    tabs: Tabs;
}

type Rows = HTMLCollectionOf<RowContainer>;
type Bookmarks = Record<string, Record<number, string>>;
type LogEntry = Record<string, [string, number, string, string]>;
type ReplacementLog = Record<string, LogEntry>;

interface TranslationLanguages {
    source: string;
    translation: string;
}

type MatchObject = [[string, string], [string, string]][];

interface InvokeOptions extends Record<string, unknown> {
    sourcePath: string;
    translationPath: string;
    engineType: import("@enums/EngineType").EngineType;
    duplicateMode: import("@enums/DuplicateMode").DuplicateMode;
    fileFlags: import("@enums/FileFlags").FileFlags;
    flags: import("@enums/BaseFlags").BaseFlags;
}

interface ReadOptions extends InvokeOptions {
    readMode: import("@enums/ReadMode").ReadMode;
    projectPath: string;
}

interface WriteOptions extends InvokeOptions {
    outputPath: string;
    gameTitle: string;
}

interface PurgeOptions extends InvokeOptions {
    gameTitle: string;
}

interface SearchResults {
    results: Record<string, number[]>;
    pages: number;
    regexp: RegExp;
}

interface RowColumns extends HTMLCollectionOf<HTMLTextAreaElement> {
    0: HTMLDivElement;
    1: HTMLDivElement;
}

interface RowContainer extends HTMLDivElement {
    children: RowColumns;
}

interface Match {
    text: string;
    type: MatchType;
    columnName: string;
    columnNumber: number;
}
