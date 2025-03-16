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

interface ISettings {
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
    engineType: import("./enums").EngineType | null;
    rowDeleteMode: import("./enums").RowDeleteMode;
    displayGhostLines: boolean;
    checkForUpdates: boolean;
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

interface IProjectSettings {
    engineType: import("./enums").EngineType | null;
    translationLanguages: {
        from: string;
        to: string;
    };
    mapsProcessingMode: import("./enums").MapsProcessingMode;
    romanize: boolean;
    disableCustomProcessing: boolean;
    trim: boolean;
}

type ReplacementLog = Record<string, { old: string; new: string }>;
