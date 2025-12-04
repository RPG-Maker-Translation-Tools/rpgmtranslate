# Search Features

## Search Menu Layout

![Search Menu Layout](assets/search-menu-layout.png)

The search menu contains:

1.  Search input (supports multi-line text)
2.  Search, replace, and put buttons
3.  Replace input (supports multi-line text)
4.  Search pattern buttons:
    - Case-sensitive search (Alt + C)
    - Whole word search (Alt + W)
    - Regex search (Alt + R)
    - Current tab only search (Alt + L)
5.  Search mode selector (source or translation text)
6.  Translation column selector

## Search

Search can be used by putting some text in search input, and pressing Enter or search button.

Depending on active search patterns, search will behave differently.

### Implementation Details

The search functionality is optimized with:

- Maximum 1000 search entries in memory
- Results split across multiple files, that you switch in search results panel

### Search Results Panel

![Search results panel](assets/search-results-panel-layout.png)

Panel components:

1.  Search/log mode toggle
2.  Match pages navigation
3.  Matched entries

Interaction:

- R: Open and close the panel
- Left mouse button: Navigate to text location
- Ctrl + Left mouse button: Copy matched text to clipboard
- Right mouse button: Replace matched text with replace input's text
- Middle mouse button: Put text from replace input to the textarea of matched source text

Note: Consider testing search patterns on a small subset before performing large-scale replacements.

### Regular Expression Support

Honestly, you can just fucking open Visual Studio Code and other shit to make sure you can revert all the damage you did with your shitty regexes, if you want to use them.

But if you want to use regex in the program, here's a quick breakdown:

- The program uses JavaScript implementation of regex. It's not as cool as Perl's, but it is, for example, used in VSCode.
- `$` substitutions are allowed.
- The program fully probably supports Unicode in regex.

Example of searching for `\c` pattern:

![Regex demonstration](assets/regex-demonstration.png)

## Replace

Global replace is used to globally replace the text from search input to the text from replace input.

If you're not sure about replacing, first use the search, browse the search results, and if you're sure that everything is okay, use global replace. You can also perform single replace, by clicking one of the search results with right mouse button.

Depending on active search patterns, search will behave differently.

## Put

Global put is used to globally put the text from replace input to the translation textarea, if source text of that textarea matches the text in search input.

Put is an extremely dangerous feature, as it will replace the existing translation in a textarea. So make sure you won't overwrite something important with it. You can also perform single put, by clicking one of the search results with middle mouse button.

Global put behaves slightly different from search, as it will match from the start of the string to the end of the string.

For example, if you want to put text to the textarea, that corresponds to `Hello` source text, you must type `Hello` to the search input, and this won't match any string, that has something else than `Hello` in it.

For powerful puts, you can use regular expressions. They also match from the start of the string to the end of the string, but you can account for that using greedy `*` or `+` modifiers. For example, `Hello .+` will match both `Hello World`, `Hello Rust`, `Hello Whatever` etc.

Depending on active search patterns, search will behave differently.
