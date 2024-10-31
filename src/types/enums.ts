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

export const enum State {
    Actors = "actors",
    Armors = "armors",
    Classes = "classes",
    CommonEvents = "commonevents",
    Enemies = "enemies",
    Items = "items",
    Skills = "skills",
    States = "states",
    System = "system",
    Troops = "troops",
    Weapons = "weapons",
    Plugins = "plugins",
    Scripts = "scripts",
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

export const enum FilesAction {
    Trim,
    Translate,
    Wrap,
}

export const enum JumpDirection {
    Next,
    Previous,
}
