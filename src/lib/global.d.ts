type Ok<T> = readonly [err: undefined, result: T];
type Err = readonly [err: string];
type Result<T> = Ok<T> | Err;

type Either<A, B> = readonly [a?: A, b?: B];

type Themes = Record<string, Record<string, string>>;

interface TabEntry {
    readonly index: number;
    sourceLineCount: number;
    translatedLineCount: number;
}

type Tabs = Record<string, TabEntry>;
interface TabInfo {
    tabName: string;
    tabs: Tabs;
}

interface TabRow extends HTMLTableRowElement {
    readonly children: HTMLCollectionOf<HTMLTableCellElement>;
}

type TabRows = HTMLCollectionOf<TabRow>;

type Bookmarks = Record<string, Record<number, string>>;

type LogEntryData = readonly [
    entry: string,
    columnIndex: number,
    old: string,
    new: string,
];
type LogEntry = Record<string, LogEntryData>;
type ReplacementLog = Record<string, LogEntry>;

type SearchMatchArray = [
    match: readonly [metadata: string, match: string],
    matchCounterpart: readonly [metadata: string, match: string],
][];

interface SearchResults {
    results: Record<string, number[]>;
    pages: number;
    regexp: RegExp;
}

interface SearchMatch {
    readonly text: string;
    readonly type: import("@enums/MatchType").MatchType;
    readonly columnName: string;
    readonly columnNumber: number;
}

type MatchModeData = readonly [
    readonly [
        mode: import("@enums/MatchMode").MatchMode,
        fuzzyThreshold: number,
    ],
    caseSensitive: boolean,
    permissive: boolean,
];

interface Term {
    readonly source: string;
    readonly sourceMatchMode: MatchModeData;
    readonly translation: string;
    readonly translationMatchMode: MatchModeData;
    readonly note: string;
}

type Glossary = Term[];

interface TranslationLanguages {
    sourceLanguage: import("@enums/TokenizerAlgorithm").TokenizerAlgorithm;
    translationLanguage: import("@enums/TokenizerAlgorithm").TokenizerAlgorithm;
}

type TermMatchResult = readonly [start: number, len: number, score?: number];

interface SourceBlock {
    readonly name: string;

    // For textarea translation
    readonly beforeStrings?: string;
    readonly afterStrings?: string;

    strings: string[];
}

type TranslatedBlocks = Readonly<
    Record<string, readonly { strings: string[] }>
>;
type TranslatedFiles = Readonly<Record<string, TranslatedBlocks>>;

type SourceBlocks = Record<string, SourceBlock>;
type SourceFiles = Record<string, SourceBlocks>;

interface Metadata {
    readonly duplicateMode: import("@enums/DuplicateMode").DuplicateMode;
    readonly romanize: boolean;
    readonly disableCustomProcessing: boolean;
    readonly trim: boolean;
    readonly hashes: string[];
}

type SkipEvents = [
    fileType: import("@enums/RPGMFileType").RPGMFileType,
    eventIndices: number[],
][];
