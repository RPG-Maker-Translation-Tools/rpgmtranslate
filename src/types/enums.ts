/* eslint-disable no-magic-numbers */
export const enum EngineType {
    New,
    VXAce,
    VX,
    XP,
}

export const enum ReadMode {
    Default,
    Append,
    Force,
}

export const enum DuplicateMode {
    Allow,
    Remove,
}

export const enum Language {
    English,
    Russian,
}

export const enum SearchMode {
    All,
    Source,
    Translation,
}

export const enum BatchAction {
    None,
    Trim,
    Translate,
    Wrap,
}

export const enum JumpDirection {
    Next,
    Previous,
}

export const enum RowDeleteMode {
    Disabled,
    Confirmation,
    Allowed,
}

export const enum SearchAction {
    None,
    Search,
    Replace,
    Put,
}

export const enum SearchFlags {
    None = 0,
    WholeWord = 1,
    CaseSensitive = 2,
    RegExp = 4,
    OnlyCurrentTab = 8,
}

export const enum MouseButton {
    Left = 0,
    Center = 1,
    Right = 2,
    Back = 3,
    Forward = 4,
}

export const enum WindowType {
    Main,
    Settings,
}

export const enum FileFlags {
    None = 0,
    Map = 1,
    Other = 2,
    System = 4,
    Scripts = 8,
    All = 15,
}
