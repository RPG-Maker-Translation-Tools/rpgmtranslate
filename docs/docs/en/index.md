# First Launch

RPGMTranslate is an open and simple translation tool for RPG Maker games. Its main strength lies in maintaining a simple file structure and using plain text translation files.

For advanced usage, refer to:

- [Search Features](search.md)
- [Text Editing](text-editing.md)

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
4.  Compile button (Alt + C)
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

- "Compile" refers to writing translations back to initial files
- "Project" is a directory containing an RPG Maker game
- "Tab" is an entry from the left menu that opens a specific file

## Opening a Project

1.  Click the Open directory button
2.  Select your RPG Maker game folder
3.  The program creates an `.rpgmtranslate` directory containing:
    - Translation files in plain text format
    - Backup directory at `.rpgmtranslate/backups`

Note: The program, by default, creates backups every 60 seconds and stores up to 99 backups.
