export const enum BaseFlags {
    None = 0,
    Romanize = 1 << 0,
    Trim = 1 << 1,
    Ignore = 1 << 2,
    CreateIgnore = 1 << 3,
    DisableCustomProcessing = 1 << 4,
}
