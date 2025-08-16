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
    romanize: boolean;
    disableCustomProcessing: boolean;
    disableProcessing: import("@enums/FileFlags").FileFlags;
    trim: boolean;
}

interface ReadOptions extends InvokeOptions {
    readMode: import("@enums/ReadMode").ReadMode;
    projectPath: string;
    ignore: boolean;
}

interface WriteOptions extends InvokeOptions {
    outputPath: string;
    gameTitle: string;
}

interface PurgeOptions extends InvokeOptions {
    gameTitle: string;
    createIgnore: boolean;
}

interface SearchResults {
    results: Record<string, number[]>;
    pages: number;
    regexp: RegExp;
}

interface RowColumns
    extends HTMLCollectionOf<HTMLDivElement | HTMLTextAreaElement> {
    0: HTMLDivElement;
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
