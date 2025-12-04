export const enum SearchFlags {
    None = 0,
    WholeWord = 1 << 0,
    CaseSensitive = 1 << 1,
    RegExp = 1 << 2,
    OnlyCurrentTab = 1 << 3,
}
