# Read Menu

Read menu allows you to re-read the game's files.

## Reading mode

- Append - this mode will append the new text to the existing files, right where it should be by its order. That means reading in that mode won't append text in the middle of the game to the end of the file.
- Force Rewrite - this mode will forcefully rewrite your files along with the translation.

## Romanize

Replaces Eastern symbols with their Western equivalents. It might be easier to work with text that way.

**Don't use with append mode, if you haven't read game files with it.**

## Disable custom processing

Currently, custom processing is implemented for LisaRPG games (LISA: The Painful and different fan-mods), and Fear & Hunger 2: Termina. In the future, this list might expand.

This will probably produce less-readable text with less system things, that you don't actually need for translation.

**Don't use with append mode, if you haven't read game files with it.**

## Maps processing mode

- Default - eliminates all duplicates across all maps files.

- Separate - each map is parsed separately, and only inner duplicates are eliminated. **RECOMMENDED!**

- Preserve - each duplicate is preserved. **WARNING: May bloat your files! For example, Fear & Hunger 2: Termina produces 70k lines with that mode!**

### Duplicates

You may encounter a problem, when using default or separate mode would eliminate duplicates, but the exact same line is used in multiple contexts. In that case, **DO NOT** resort to preserve processing mode.

How to work around this: manually post-edit the files. [rvpacker-txt-rs](https://github.com/savannstm/rvpacker-txt-rs) provides the feature to generate `.json` representation of older engines' files and write it back with changes, and newer engines are directly editable `.json`. This way your translation will be way cleaner.

## Ignore entries from .rvpacker-ignore file

Doesn't read the lines included in `.rpgmtranslate/translation/.rvpacker-ignore` file. It either can be created when [purging](purge.md), or by hand.
