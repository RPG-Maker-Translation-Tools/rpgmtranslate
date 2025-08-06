interface String {
    count(pattern: string): number;
    countLines(): number;
    lines(): string[];
    stripSuffix(this: string, suffix: string): string;
    /**
     * Converts default LINE FEED `\n` line breaks to custom NEW_LINE `\#` line breaks.
     */
    dlbtoclb(): string;
    /**
     * Converts custom NEW_LINE `\#` line breaks back to default LINE FEED `\n`.
     */
    clbtodlb(): string;
    isEmpty(): boolean;
    basename(): string;
    /**
     * Extracts parts, delimited by SEPARATOR `<#>`.
     */
    parts(): string[] | null;
}

interface Array<T> {
    source(this: string[]): string;
    translation(this: string[]): string;
    translations(this: string[]): string[];
    filterMap<U>(this: T[], fn: (value: T) => U | null): U[];
}

interface Element {
    getElementById<T extends Element>(id: string): T | null;
}

interface HTMLElement {
    toggleMultiple(...classes: string[]): void;
}

interface HTMLDivElement {
    rowNumberElement(): HTMLSpanElement;
    rowNumber(): number;

    sourceElement(): HTMLDivElement;
    source(): string;

    translationElement(): HTMLTextAreaElement;
    translation(): string;
    translations(): string[];
}

interface HTMLTextAreaElement {
    calculateHeight(): void;
}

interface Math {
    clamp(value: number, min: number, max: number): number;
}

type ThemeObject = Record<string, Theme>;

interface Theme {
    name: string;
    backgroundDark: string;
    backgroundPrimary: string;
    backgroundSecond: string;
    backgroundThird: string;
    outlinePrimary: string;
    outlineSecond: string;
    outlineThird: string;
    outlineFocused: string;
    borderPrimary: string;
    borderSecond: string;
    borderFocused: string;
    backgroundPrimaryHovered: string;
    backgroundSecondHovered: string;
    textPrimary: string;
    textSecond: string;
    textThird: string;
}

interface CSSRule {
    style: CSSStyleDeclaration;
    selectorText: string;
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

interface ProjectSettingsOptions {
    engineType?: import("./enums").EngineType;
    translationLanguages?: TranslationLanguages;
    duplicateMode?: import("./enums").DuplicateMode;
    romanize?: boolean;
    disableCustomProcessing?: boolean;
    trim?: boolean;
    sourceDirectory?: string;
    columns?: [string, number][];
    translationColumnCount?: number;
}

type MatchObject = Record<string, string[]>;

interface SearchFlagsObject {
    flags: import("./enums").SearchFlags;
}

interface CurrentTab {
    name: string;
    index: number;
    content: HTMLDivElement;
}

interface MainWindowUI {
    tabContentHeader: HTMLDivElement;
    tabContentContainer: HTMLDivElement;
    tabContent: HTMLDivElement;
    bottomScrollBar: HTMLDivElement;
    bottomScrollContent: HTMLDivElement;

    batchButton: HTMLDivElement;
    batchWindow: HTMLDivElement;

    leftPanel: HTMLDivElement;

    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;

    saveButton: HTMLButtonElement;
    writeButton: HTMLButtonElement;
    themeButton: HTMLButtonElement;
    themeMenu: HTMLDivElement;
    toolsButton: HTMLButtonElement;
    readButton: HTMLButtonElement;
    purgeButton: HTMLButtonElement;

    goToRowInput: HTMLInputElement;
    menuBar: HTMLDivElement;
    fileMenuButton: HTMLButtonElement;
    helpMenuButton: HTMLButtonElement;
    languageMenuButton: HTMLButtonElement;
    fileMenu: HTMLDivElement;
    helpMenu: HTMLDivElement;
    languageMenu: HTMLDivElement;
    currentTabDiv: HTMLDivElement;
    createThemeMenuButton: HTMLButtonElement;
    bookmarksButton: HTMLButtonElement;
    bookmarksMenu: HTMLDivElement;
    projectStatus: HTMLDivElement;
    progressMeterContainer: HTMLDivElement;
    globalProgressMeter: HTMLDivElement;
    gameInfo: HTMLDivElement;
    currentGameEngine: HTMLDivElement;
    currentGameTitle: HTMLInputElement;
    themeWindow: HTMLDivElement;
    themeWindowBody: Element;
    createThemeButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;

    fromLanguageInput: HTMLInputElement;
    toLanguageInput: HTMLInputElement;

    writeMenu: HTMLDivElement;
    outputPathButton: HTMLButtonElement;
    outputPathInput: HTMLInputElement;
    disableMapProcessingCheckbox: HTMLSpanElement;
    disableOtherProcessingCheckbox: HTMLSpanElement;
    disableSystemProcessingCheckbox: HTMLSpanElement;
    disablePluginProcessingCheckbox: HTMLSpanElement;
    readMenu: HTMLDivElement;
    readModeSelect: HTMLSelectElement;
    readModeDescription: HTMLDivElement;
    duplicateModeSelect: HTMLSelectElement;
    romanizeCheckbox: HTMLSpanElement;
    disableCustomProcessingCheckbox: HTMLSpanElement;
    ignoreCheckbox: HTMLSpanElement;
    trimCheckbox: HTMLSpanElement;
    applyReadButton: HTMLDivElement;
    purgeMenu: HTMLDivElement;
    createIgnoreCheckbox: HTMLSpanElement;
    applyPurgeButton: HTMLDivElement;
}

interface SettingsWindowUI {
    backupCheck: HTMLSpanElement;
    backupSettings: HTMLDivElement;
    backupMaxInput: HTMLInputElement;
    backupPeriodInput: HTMLInputElement;
    fontSelect: HTMLSelectElement;
    rowDeleteModeSelect: HTMLSelectElement;
    displayGhostLinesCheck: HTMLSpanElement;
    checkForUpdatesCheck: HTMLSpanElement;
}

interface OptionsBase extends Record<string, unknown> {
    sourcePath: string;
    translationPath: string;
    engineType: import("./enums").EngineType;
    duplicateMode: import("./enums").DuplicateMode;
    romanize: boolean;
    disableCustomProcessing: boolean;
    disableProcessing: import("./enums").FileFlags;
    trim: boolean;
}

interface ReadOptions extends OptionsBase {
    readMode: import("./enums").ReadMode;
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
