interface String {
    count(char: string): number;
    countLines(): number;
    lines(): string[];
    stripSuffix(suffix: string): string;
    /**
     * Normalizes default LINE FEED `\n` line breaks to custom NEW_LINE `\#` line breaks.
     */
    nnormalize(): string;
    /**
     * Denormalizes custom NEW_LINE `\#` line breaks back to default LINE FEED `\n`.
     */
    denormalize(): string;
    empty(): boolean;
}

interface HTMLElement {
    /// Why isn't it like that in TypeScript by default?
    toggleMultiple(...classes: string[]): void;
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
    title: string;
    description: string;
}

type LogEntry = Record<string, [string, string]>;
type ReplacementLog = Record<string, LogEntry>;

interface TranslationLanguages {
    from: string;
    to: string;
}

interface ProjectSettingsOptions {
    engineType?: import("./enums").EngineType | null;
    translationLanguages?: TranslationLanguages;
    duplicateMode?: import("./enums").DuplicateMode;
    romanize?: boolean;
    disableCustomProcessing?: boolean;
    trim?: boolean;
    sourceDirectory?: string;
}

type MatchObject = Record<string, string[]>;

interface SearchResults {
    results: Map<string, number[]>;
    matchCount: number;
}

interface SearchFlagsObject {
    flags: import("./enums").SearchFlags;
}

interface CurrentTab {
    name: string;
    index: number;
    content: HTMLDivElement;
}

interface MainWindowUI {
    tabContent: HTMLDivElement;
    searchInput: HTMLTextAreaElement;
    replaceInput: HTMLTextAreaElement;
    leftPanel: HTMLDivElement;
    searchPanel: HTMLDivElement;
    searchPanelContent: HTMLDivElement;
    searchCurrentPage: HTMLSpanElement;
    searchTotalPages: HTMLSpanElement;
    searchSwitch: HTMLDivElement;
    pageSelectContainer: HTMLDivElement;
    logFileSelect: HTMLSelectElement;
    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;
    saveButton: HTMLButtonElement;
    writeButton: HTMLButtonElement;
    themeButton: HTMLButtonElement;
    themeMenu: HTMLDivElement;
    toolsButton: HTMLButtonElement;
    translateToolsMenuButton: HTMLElement;
    toolsMenu: HTMLDivElement;
    readButton: HTMLButtonElement;
    purgeButton: HTMLButtonElement;
    searchCaseButton: HTMLButtonElement;
    searchWholeButton: HTMLButtonElement;
    searchRegexButton: HTMLButtonElement;
    searchModeSelect: HTMLSelectElement;
    searchLocationButton: HTMLButtonElement;
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
    searchMenu: HTMLDivElement;
    searchButton: HTMLButtonElement;
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
}
