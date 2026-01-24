# Translation Table

Translation table is where you input your translation of the source text, and its opened when a tab is opened.

## Layout

Translation table has 2 fixed rows, them being row number column and source text column. Since these are self-explanatory, we'll just jump over to the translation ones.

There can be unlimited number of translation columns with their own titles. RPGMTranslate parses the initial number of translation columns from text files, but you can add another one any time you want. Deleting them is not possible at the moment, however.

## Features

First of all, each column is resizable and its size is saved. Translation columns can be renamed at any moment.

Text from the source rows can be selected and copied, and for convenience there's a shortcut to copy the whole text - `Ctrl + LMB`.

When selecting a translation cell, automated glossary term check will be initiated. You can open [Match Menu](./glossary.md#match-menu) to see the results.

Also, if cell's translation is empty, source text will be sent to the translation endpoints, and results will appear in [Translations Menu](./translations-menu.md). You can open it to see the translations.

## Hotkeys

You can edit the translation textarea like any other website input field. Available hotkeys:

- Ctrl + ArrowDown - Move to next row (down)
- Ctrl + ArrowUp - Move to previous row (up)
- Ctrl + ArrowLeft - Move to the left translation column
- Ctrl + ArrowRight - Move to the right translation column
- Ctrl + E on selected source text - Add selection to the glossary.

## Batch Select

Selecting multiple translation cells is supported, you can do this by selecting a single cell, then pressing any other one with `Shift` pressed.

Then you can multi-copy/cut/paste those translations to the other places.
