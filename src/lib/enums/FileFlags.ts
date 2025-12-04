export const enum FileFlags {
    None = 0,
    Map = 1 << 0,
    Other = 1 << 1,
    System = 1 << 2,
    Scripts = 1 << 3,
    All = FileFlags.Map |
        FileFlags.Other |
        FileFlags.System |
        FileFlags.Scripts,
}
