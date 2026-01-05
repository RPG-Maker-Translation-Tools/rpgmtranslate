type Ok<T> = [err: undefined, result: T];
type Err = [err: string, result: undefined] | [err: string];
type Result<T> = Ok<T> | Err;

type Either<A, B> = [a: undefined | A, b: undefined | B];

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

interface RowColumns extends HTMLCollectionOf<HTMLTextAreaElement> {
    0: HTMLDivElement;
    1: HTMLDivElement;
}

interface RowContainer extends HTMLDivElement {
    children: RowColumns;
}

type Bookmarks = Record<string, Record<number, string>>;

type LogEntry = Record<string, [string, number, string, string]>;
type ReplacementLog = Record<string, LogEntry>;

type MatchObject = [[string, string], [string, string]][];

interface SearchResults {
    results: Record<string, number[]>;
    pages: number;
    regexp: RegExp;
}

interface SearchMatch {
    text: string;
    type: import("@enums/MatchType").MatchType;
    columnName: string;
    columnNumber: number;
}

type MatchModeData = [
    [import("@enums/MatchMode").MatchMode, number],
    boolean,
    boolean,
];

interface Term extends Record<string, unknown> {
    source: string;
    sourceMatchMode: MatchModeData;
    translation: string;
    translationMatchMode: MatchModeData;
    note: string;
}

type Glossary = Term[];

interface TranslationLanguages {
    sourceLanguage: import("@enums/TokenizerAlgorithm").TokenizerAlgorithm;
    translationLanguage: import("@enums/TokenizerAlgorithm").TokenizerAlgorithm;
}

type MatchResult = [number, number, number | undefined];

interface SourceBlock {
    name: string;

    // For textarea translation
    beforeStrings?: string;
    afterStrings?: string;

    strings: string[];
}

type TranslatedBlocks = Record<string, string[]>;
type TranslatedFiles = Record<string, TranslatedBlocks>;

type SourceBlocks = Record<string, SourceBlock>;
type SourceFiles = Record<string, SourceBlocks>;

interface Metadata {
    duplicateMode: import("@enums/DuplicateMode").DuplicateMode;
    romanize: boolean;
    disableCustomProcessing: boolean;
    trim: boolean;
    hashes: string[];
}
