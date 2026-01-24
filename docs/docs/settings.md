# Settings

Settings are split into sections for convenience.

## Core

Core settings affect main aspects of the program, like backup settings.

### Backup

You can toggle backup, change its interval or max number of backups.

Default values are: 60 secs for interval, 99 backups for max.

### Row Delete Mode

Whether to disallow deleting rows, ask for confirmation or delete right away.

### Check for updates

You can disable checking for updates not to bother you, but believe me, each new update **will** make the program better.

## Appearance

## UI Font

Affects the whole UI, except translation table. Cosmetical.

## Translation Table Font

Affects the translation table. Changing table's font to monospace/game's could help you with wrapping.

## Display line breaks in text areas

When this option in selected, it will display the line breaks in text areas. I don't remember why I implemented this, probably to not be confused when text row is longer than the textarea's width.

## Controls

WIP.

## Translation

Here you can activate multiple translation endpoints and set settings for each one individually.

The program keeps track of all the endpoints' options simultaneously.

### Endpoints

- Non-AI:
    - Google: Always enabled. Doesn't require API key, but isn't customizable.
    - Yandex: Requires API key and Yandex folder ID. Isn't customizable.
    - DeepL: Requires API key. Isn't customizable, but allows to use your glossary in the translation. Sometimes regarded as the best non-AI translator.
- AI: All AI endpoints need API keys and are highly customizable.
    - Model: You can select the desired model. Some providers disallow certain models by default, so you need to tinker with your's account option if the desired one not in the list.
    - Token Limit: Limit for a single request in tokens. If the overall tokens exceed the limit, multiple requests will be sent.
    - Temperature: Higher - more creative. Lower - more deterministic.
    - Use Glossary: Include the glossary in the request.
    - Use Thinking/Reasoning: Thinking go brrr
    - System Prompt: Default one is pretty good, I think.

## Project

Project-specific settings.

### Row Length Hint

Row length hint in characters.

If more than 0, will display a hint when textarea is focused in translation table.

This option exists to help with wrapping the text.

### Project Context

Context for the project, e.g. basics about the translated material - "Dark fantasy, JRPG, Time Travel, plot-armored MC, in a universe called Fucktardia.".

It's better to not put too much text in here.

### File Context

File-specific context. You can set it for each file.

It's better to not put too much text in here.
