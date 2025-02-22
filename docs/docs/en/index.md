# First Launch

RPGMTranslate is an open and simple translation tool for RPG Maker games. Its main strength lies in maintaining a simple file structure and using plain text translation files.

For advanced usage, refer to:

- [Search Features](search.md)
- [Text Editing](text-editing.md)
- [Settings](settings.md)

**Also, help us improve [the docs](https://github.com/savannstm/rpgmtranslate/tree/main/docs/docs/en)!**

## Installation

Download the latest release from [GitHub](https://github.com/savannstm/rpgmtranslate/releases/latest). The program is available as:

- Windows: `.msi` installer
- Linux: `.deb` package or `.AppImage`
- Other platforms: [Build from source](build.md)

On first launch, the program creates:

- Settings file: `ROOT_DIR/res/settings.json`
- Themes file: `ROOT_DIR/res/themes.json`

Note: If the interface doesn't load, press F12 to open the console for error messages.

## Interface Layout

![Interface layout](../assets/layout.png)

The interface includes:

1.  Menu bar buttons
2.  Menu button (Tab)
3.  Save button (Ctrl + S)
4.  Compile button (Alt + C) [RMB to open compilation settings]
5.  Open directory button
6.  Settings button
7.  Themes button
8.  Bookmarks button
9.  Search button (Ctrl + S)
10. Tools button
11. Read button
12. Project info panel
13. Search panel (R)
14. Main work area

Important terms:

- "Read" refers to re-parsing the translation, either in append mode, to append new text to the translation after game's update, or to force rewrite the translation and start from scratch
- "Compile" refers to writing translations back to initial files
- "Project" is a directory containing an RPG Maker game
- "Tab" is an entry from the left menu that opens a specific file

Hotkeys:

- Ctrl and +: Zoom in
- Ctrl and -: Zoom out

## Opening a Project

1.  Click the Open directory button
2.  Select your RPG Maker game folder (the program handles encrypter `.rgss` archives)
3.  The program creates an `.rpgmtranslate` directory containing:
    - Translation files in plain text format at `.rpgmtranslate/translation`
    - Backup directory at `.rpgmtranslate/backups`
    - Output files when compiling at `.rpgmtranslate/output`

If the game folder already has `translation` folder, its contents will be copied to `.rpgmtranslate/translation`, but not vice-versa. To bring the translation back to `GAME_FOLDER/translation` you'll have to manually copy it.

The game's title, engine, current opened tab and translation progress will be displayed in the top-right corner of the UI.

Title is editable, it will be saved and compiled correctly.

Note: The program, by default, creates backups every 60 seconds and stores up to 99 backups.
