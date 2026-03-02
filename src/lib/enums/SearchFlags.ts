export const enum SearchFlags {
    None = 0,
    WholeWord = 1 << 0,
    CaseSensitive = 1 << 1,
    RegExp = 1 << 2,
    Comment = 1 << 3,
}
