/* eslint-disable no-magic-numbers */
export const enum FileFlags {
    None = 0,

    Map = 1 << 0,

    Actors = 1 << 1,

    Armors = 1 << 2,

    Classes = 1 << 3,

    CommonEvents = 1 << 4,

    Enemies = 1 << 5,

    Items = 1 << 6,

    Skills = 1 << 7,

    States = 1 << 8,

    Troops = 1 << 9,

    Weapons = 1 << 10,

    System = 1 << 11,

    Scripts = 1 << 12,

    Other = FileFlags.Actors |
        FileFlags.Armors |
        FileFlags.Classes |
        FileFlags.CommonEvents |
        FileFlags.Enemies |
        FileFlags.Items |
        FileFlags.Skills |
        FileFlags.States |
        FileFlags.Troops |
        FileFlags.Weapons,

    All = FileFlags.Map |
        FileFlags.Other |
        FileFlags.System |
        FileFlags.Scripts,
}
