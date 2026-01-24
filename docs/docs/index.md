# Overview

RPGMTranslate is an open source and simple translation tool for RPG Maker games. Its main strength lies in maintaining a simple file structure and using plain text translation files, but at the same time it provides powerful tools for translation.

**Help us improve [the docs](https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate/tree/main/docs/docs/en)!**

## Features

- Hugely customizable interface that we're looking to make even more customizable.
- Cross-platform, fast and powerful.
- Fast game files parsing and fast translation writing.
- Easy plain text format that's manually editable.
- XP, VX, VX Ace, MV and MZ engines support.
- Built-in glossary with support for ~40 languages.
- Convenience features like bookmarks, shortcuts and other mindblowing tricks.
- Built-in easy batch processing of files.
- Integrated APIs for Google Translate, Yandex Translate, DeepL, ChatGPT, Claude, DeepSeek and Gemini.

## Installation

Download the latest release from [GitHub](https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate/releases/latest). The program is available as:

- Windows: `.msi` (preferable) or `.exe` installer
- Linux: `.deb` package or `.AppImage`
- Other platforms: [Build from source](build.md)

On first launch, the program creates:

- Settings file: `ROOT_DIR/resources/settings.json`
- Themes file: `ROOT_DIR/resources/themes.json`

Note: If the interface doesn't load, press F12 to open the console for error messages.

## Interface Layout

Interface of the program is designed to be quite predictable. You won't find nested series of the menus or some unexplained options, we're always trying to keep the application clear for all kinds of dumbasses.

At the top of the screen you'll see a menu bar and utils bar, that contains buttons, project language inputs, current tab name, global translation progress meter, editable game title, and current RPG Maker engine. Each button provides "What's This?" information when it's hovered.

Upon opening a tab you'll be greeted with simple translation table, when you can start translating the game.

Important terms:

- "Read" refers to parsing text from the game. Read also can be used in append mode, to extend the current translation with new text.
- "Write" refers to writing translation to the initial game files, and producing translated RPG Maker compatible files.
- "Project" is a directory containing an RPG Maker game, that can be opened in RPGMTranslate.
- "Tab" is an entry from the tab panel that opens a specific file.

## Getting Started

See [Getting Started](./getting-started.md).
