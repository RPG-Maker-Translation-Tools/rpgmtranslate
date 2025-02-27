# Purge Menu

Purge menu allows you to purge lines from translation based on criterias.

## Output statistics to stat.txt file

When purging with this option, lines that must be deleted will be output to `.rpgmtranslate/translation/stat.txt`.

Translation won't be affected.

## Leave the fields that have the translation

When purging with this option, lines, that have the translation, won't be purged.

**RECOMMENDED**, so you don't lose your progress.

## Purge only the empty fields

With this option, only the text with empty translation field will be purged.

Without this option, only the text, that cannot be found in game files, will be purged.

## Create .rvpacker-ignore file from purged lines

Creates a `.rpgmtranslate/translation/.rvpacker-ignore` file containing purged lines.

It will be used on read, if ignore checkbox is checked.
