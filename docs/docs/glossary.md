# Glossary

Glossary allows you to specify terms like most modern CAT tools. Inflections are not supported.

## Usage

Create new terms with `+` button, or use `Ctrl + E` shortcut when selecting source text in translation table.

There's 4 crucial options to keep in mind: match mode, case sensitivity, permissiveness and fuzzy threshold.

### Match Mode

Exact, fuzzy, or both. When using Both mode, it first checks for an exact match, then matches fuzzily.

When fuzzy or both mode is selected, you need to input fuzzy threshold value. Threshold should be in range of 0.0 and 1.0. Adjust threshold for your use case. Generally thresholds above 0.7-0.75 are fine, and generally you should use higher thresholds for smaller inputs.

### Case Sensitivity

Match text case-sensively. This is useful if you only want to match proper name, like character's or company name, that's supposed to be in a certain case.

### Permissive

When this is checked, matched text is allowed to be more uppercase than the searched. This is useful, if you want to check stylized text, like when someone's screaming.

### Note

Each glossary entry supports a note, where you can write whatever you want. Most useful for character details or surrounding context.

### QC

QC stands for Quality Check. Use this button to run all terms check on all files (or only the current file, if corresponding checkbox is checked).

### Match Menu

Match menu contains term matches and mismatches. It's put to the glossary to not waste space, because a lot of people probably aren't going to use the glossary.

#### Usage

Match menu is pretty self-descriptive. If you don't have translation languages properly configured, it will notify you.

Otherwise there's three types of matches:

- Normal background: match is okay.
- Orange background: term/translation occurrences are mismatched, or translation is empty.
- Red background: term's translation wasn't found in translation text.
