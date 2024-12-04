interface String {
    replaceAllMultiple(replacementObj: Record<string, string>): string;
    count(char: string): number;
}

interface HTMLElement {
    toggleMultiple(...classes: string[]): void;
    secondHighestParent(childElement: HTMLElement): HTMLElement;
}

interface HTMLTextAreaElement {
    calculateHeight(): void;
}

interface Math {
    clamp(value: number, min: number, max: number): number;
}

interface Settings {
    language: import("./enums").Language;
    backup: {
        enabled: boolean;
        period: number;
        max: number;
    };
    theme: string;
    fontUrl: string;
    firstLaunch: boolean;
    projectPath: string;
    translation: {
        from: Intl.UnicodeBCP47LocaleIdentifier;
        to: Intl.UnicodeBCP47LocaleIdentifier;
    };
    engineType: import("./enums").EngineType | null;
    rowDeleteMode: import("./enums").RowDeleteMode;
}

interface CompileSettings {
    initialized: boolean;
    romanize: boolean;
    mapsProcessingMode: number;
    disableCustomProcessing: boolean;
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
    logging: boolean;
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

interface ReadArgs extends Record<string, unknown> {
    projectPath: string;
    originalDir: string;
    gameTitle: string;
    mapsProcessingMode: number;
    romanize: boolean;
    disableCustomProcessing: boolean;
    disableProcessing: boolean[];
    processingMode: import("./enums").ProcessingMode;
    engineType: import("./enums").EngineType;
    logging: boolean;
    language: import("./enums").Language;
    generateJson: boolean;
}

interface CompileArgs extends Record<string, unknown> {
    projectPath: string;
    originalDir: string;
    outputPath: string;
    gameTitle: string;
    mapsProcessingMode: number;
    romanize: boolean;
    disableCustomProcessing: boolean;
    disableProcessing: boolean[];
    engineType: import("./enums").EngineType;
    logging: boolean;
    language: import("./enums").Language;
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
