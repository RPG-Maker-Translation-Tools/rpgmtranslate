# Read Window

Read window allows you to re-read the game's files.

Let's break it down.

## Reading mode

- Default - this mode will read the files that hasn't been already read.

- Append - this mode will append the new text to the existing files, right where it should be by its order. That means reading in that mode won't append text in the middle of the game to the end of the file.

- Force Rewrite - this mode will forcefully rewrite your files along with the translation.

## Romanize

Replaces Eastern symbols with their Western equivalents. It might be easier to work with text that way.

## Maps processing mode

- Default - eliminates all duplicates across all maps files.

- Separate - each map is parsed separately, and only inner duplicates are eliminated.

- Preserve - each duplicate is preserved. **WARNING: May bloat your files! For example, Fear & Hunger 2: Termina produces 70k lines with that mode!**

## Disable processing of

Disables the processing of checked files.
