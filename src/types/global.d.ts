interface String {
    count(char: string): number;
}

interface HTMLElement {
    toggleMultiple(...classes: string[]): void;
}

interface HTMLTextAreaElement {
    calculateHeight(): void;
}

interface Math {
    clamp(value: number, min: number, max: number): number;
}

type ThemeObject = Record<string, Theme>;

interface Theme extends Record<string, string> {
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

interface TextAreaPropertiesMemo extends Record<string, string | number> {
    lineHeight?: number;
    padding?: number;
    lineBreaks?: number;
    fontSize?: string;
    fontFamily?: string;
}

interface Bookmark {
    title: string;
    description: string;
}

type ReplacementLog = Record<string, { old: string; new: string }>;

interface ProjectSettingsOptions {
    engineType?: import("./enums").EngineType | null;
    translationLanguages?: {
        from: string;
        to: string;
    };
    mapsProcessingMode?: MapsProcessingMode;
    romanize?: boolean;
    disableCustomProcessing?: boolean;
    trim?: boolean;
    originalDirectory?: string;
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
    name: string | null;
    index: number | null;
    content: HTMLDivElement;
}

interface MainWindowUI {
    tabContent: HTMLDivElement;
    searchInput: HTMLTextAreaElement;
    replaceInput: HTMLTextAreaElement;
    leftPanel: HTMLDivElement;
    searchPanel: HTMLDivElement;
    searchPanelFound: HTMLDivElement;
    searchPanelReplaced: HTMLDivElement;
    searchCurrentPage: HTMLSpanElement;
    searchTotalPages: HTMLSpanElement;
    topPanel: HTMLDivElement;
    topPanelButtonsDiv: HTMLDivElement;
    saveButton: HTMLButtonElement;
    compileButton: HTMLButtonElement;
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
    searchSwitch: HTMLDivElement;
    fromLanguageInput: HTMLInputElement;
    toLanguageInput: HTMLInputElement;
    compileMenu: HTMLDivElement;
    outputPathButton: HTMLButtonElement;
    outputPathInput: HTMLInputElement;
    cDisableMapsProcessingCheckbox: HTMLSpanElement;
    cDisableOtherProcessingCheckbox: HTMLSpanElement;
    cDisableSystemProcessingCheckbox: HTMLSpanElement;
    cDisablePluginsProcessingCheckbox: HTMLSpanElement;
    readMenu: HTMLDivElement;
    readingModeSelect: HTMLSelectElement;
    readingModeDescription: HTMLDivElement;
    mapsProcessingModeSelect: HTMLSelectElement;
    romanizeCheckbox: HTMLSpanElement;
    disableCustomProcessingCheckbox: HTMLSpanElement;
    rDisableMapsProcessingCheckbox: HTMLSpanElement;
    rDisableOtherProcessingCheckbox: HTMLSpanElement;
    rDisableSystemProcessingCheckbox: HTMLSpanElement;
    rDisablePluginsProcessingCheckbox: HTMLSpanElement;
    ignoreCheckbox: HTMLSpanElement;
    trimCheckbox: HTMLSpanElement;
    sortCheckbox: HTMLSpanElement;
    applyReadButton: HTMLDivElement;
    purgeMenu: HTMLDivElement;
    statCheckbox: HTMLSpanElement;
    leaveFilledCheckbox: HTMLSpanElement;
    purgeEmptyCheckbox: HTMLSpanElement;
    createIgnoreCheckbox: HTMLSpanElement;
    pDisableMapsProcessingCheckbox: HTMLSpanElement;
    pDisableOtherProcessingCheckbox: HTMLSpanElement;
    pDisableSystemProcessingCheckbox: HTMLSpanElement;
    pDisablePluginsProcessingCheckbox: HTMLSpanElement;
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
