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
