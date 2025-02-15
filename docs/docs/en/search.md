# Search Features

## Search Window Layout

![Search window layout](../assets/search-window-layout.png)

The search interface contains:

1.  Search input field (supports multi-line text)
2.  Replace button for replacing all matches
3.  Put button for transferring text to translation field
4.  Replace input field (supports multi-line text)
5.  Search pattern buttons:
    - Case-sensitive search (Alt + C)
    - Whole word search (Alt + W)
    - Regex search (Alt + R)
    - Current tab only search (Alt + L)
6.  Search mode selector (original or translation text)

Note: The Put button matches source text as a whole, not line by line.

## Implementation Details

The search functionality is optimized with:

- Maximum 1000 search entries in memory
- Results split across multiple files, that you switch in search results panel

## Regular Expression Support

Honestly, you can just fucking open Visual Studio Code and other shit to make sure you can revert all the damage you did with your shitty regexes, if you want to use them.
But if you want to use regex in the program, here's a quick breakdown:

- The program uses JavaScript implementation of regex. It's not as cool as Perl's, but it is, for example, used in VSCode.
- The program fully probably supports unicode in regex.
- I didn't really think of implementing the substitutions in the program (ones that's annotated with $), so please DON'T use substitutions in replace input, as it will replace LITERALLY.

Example of searching for `\c` pattern:

![Regex demonstration](../assets/regex-demonstration.png)

Note: When using regex in replace operations, substitutions (like $1) are not supported. The replacement is literal.

## Search Results Panel

![Search results panel](../assets/search-results-panel-layout.png)

Panel components:

1.  Search/log mode toggle
2.  Match pages navigation
3.  Matched text and metadata
4.  Corresponding text and metadata

Interaction:

- R: Open and close the panel
- Left-click: Navigate to text location
- Right-click: Replace matched text with replace input

Note: Consider testing search patterns on a small subset before performing large-scale replacements.
