# Read Menu

Read menu allows you to re-read the game's files.

## Read Mode

- Force - this mode will forcefully rewrite existing `.txt` files, effectively removing all translation.
- Append - this mode will extend the `.txt` files with new text (in case if source RPG Maker files were updated). Reading in this mode will also sort the translation chronologically. **Note: this mode automatically determines which options should be set from the previous read, and you won't be able to modify them.**
- Force Append - the same as `Append`, but it will try to update the translation, even if source RPG Maker files weren't updated.

## Duplicate Mode

- Allow - each map/event is parsed separately, and only inner duplicates are eliminated. This mode always overrides `Remove` in system, plugins and scripts files. **RECOMMENDED!**
- Remove - eliminates all duplicates across all maps/other files. Use, if `Allow` causes too much bloat.

### Duplicates

You may encounter a problem, when the exact same translation of one line is written to multiple places in-game, because some duplicates are eliminated.

How to work around this: manually post-edit the files. [rvpacker-txt-rs](https://github.com/RPG-Maker-Translation-Tools/rvpacker-txt-rs) provides the feature to generate `.json` representation of older engines' files and write them back with changes, and newer engines are directly editable `.json`. This way your translation will be way cleaner.

## Romanize

Replaces Eastern symbols with their Western equivalents. It might be easier to work with text that way.

## Trim

Removes the leading and trailing whitespace. Use it only if you're sure you need that, it could screw up the text.

## Disable Custom Processing

Currently, custom processing is implemented for LISA: The Painful and derivatives, and Fear & Hunger 2: Termina. In the future, this list might expand.

This will probably produce more readable text with less system things, that you don't actually need for translation.

## Ignore entries from .rvpacker-ignore file

Don't read the lines included in `.rpgmtranslate/translation/.rvpacker-ignore` file. It either can be created when [purging](purge.md), or manually.

## Skip Obsolete

Don't preserve obsolete entries (lines, that are no more in the source RPG Maker files).

## Parse event metadata from maps

When parsing text from an event, always parse event's metadata first.

That inserts `<!-- EVENT ID -->`, `<!-- EVENT NAME -->` and `<!-- EVENT POS -->` comments before the text, which may help with context and it's also useful when you want to find the event to look at it yourself.

## Skip Settings

You can select files, maps and events in the specific files to skip. Those won't be processed. When appending, skipped entries' text will be preserved as-is.
