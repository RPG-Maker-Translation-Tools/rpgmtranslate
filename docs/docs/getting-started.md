# Getting Started

Upon the first launch, you'll be greeted with an empty project.

## Opening a Folder

Locate and click the "Open Folder" button, you should know it when you see it. After that, select a directory that contains RPG Maker `data` (XP/VX/VXAce) or `Data` (MV/MZ), or an encrypted `.rgss` archive. The program will automatically unpack the archive.

There's an exception: if there's a directory named `translation` alongside the `data` directory when opening a folder, you'll be prompted to use its contents instead. This is a compatibility layer for our CLI tool `rvpacker-txt-rs`. If you agree to use it, it's contents will remain unchanged, and will be copied to the program's working directory, more about that down.

## Reading Files

Once archive is parsed, if any, and data directory is located, a read menu will open and prompt you to select the desired options.

You can learn more about read options at [Read Documentation](./read.md).

Select what you want and press "Read".

## Setup

RPGMTranslate will create its own directory alongside the data directory, called `.rpgmtranslate`. This directory will contain all the working files of the program:

- Translation files at `.rpgmtranslate/translation`.
- Backups at `.rpgmtranslate/backups`.
- Output files at `.rpgmtranslate/output`.

Also, a few directories can be created at runtime:

- `.rpgmtranslate/temp-maps`: When initializing a project, RPGMTranslate splits `maps.txt` file into temporary smaller maps files for optimization and speed. Those will be merged back into `maps.txt` when saving or exiting.
- `.rpgmtranslate/matches`: This directory will contain search matches. Search is optimized to not load all the matches into memory right away to avoid memory leaks. Learn more at [Search Documentation](./search.md).
- `.rpgmtranslate/project-settings.json`: Project settings.
- `.rpgmtranslate/glossary.json`: Project glossary.

It's recommended that you set up a git repository and periodically commit changes, as you translate the game. We're eventually planning on adding our own git client into the program, but right now you must do it manually.

From here, you'd probably want to know a couple of handy hotkeys:

- Tab: Open tab panel
- R: Open search panel
- Ctrl and +: Zoom in
- Ctrl and -: Zoom out

Program is set to actively backup data by default, creating backups every 60 seconds. Up to 99 backups can be stored simultaneously, and backup-related options can be altered in settings, see more in [Settings Documentation](./settings.md).

Now you can open the tab panel, select the tab, and start translating the game.

## Advanced Feature Documentation

Each of the features is described at its own page:

- [Translation Table](translation-table.md)
- [Text Search, Replace, Put](search.md)
- [Batch Processing](batch-processing.md)
- [Glossary](glossary.md)
- [Translations Menu](translations-menu.md)
- [Settings](settings.md)
- [Read](read.md)
- [Purge](purge.md)
- [Write](write.md)
