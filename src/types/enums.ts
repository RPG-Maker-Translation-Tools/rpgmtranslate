/* eslint-disable no-magic-numbers */
export const enum EngineType {
    New,
    VXAce,
    VX,
    XP,
}

export const enum ProcessingMode {
    Default,
    Append,
    Force,
}

export const enum MapsProcessingMode {
    Default,
    Separate,
    Preserve,
}

export const enum Language {
    English,
    Russian,
}

export const enum SaveMode {
    Backup,
    SingleFile,
    AllFiles,
}

export const enum SearchMode {
    AllText,
    OnlyOriginal,
    OnlyTranslation,
}

export const enum BatchAction {
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

export const enum ReplaceMode {
    Replace,
    Put,
    Search,
}

export const enum SearchFlags {
    None = 0,
    WholeWord = 1,
    CaseSensitive = 2,
    RegExp = 4,
    OnlyLocal = 8,
}

export const enum MouseButton {
    Left = 0,
    Center = 1,
    Right = 2,
    Back = 3,
    Forward = 4,
}
