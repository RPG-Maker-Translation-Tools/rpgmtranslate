# Batch Processing

RPGMTranslate provides the features to run some actions in batch.

## Batch Menu

Batch menu allows you to select certain files, and then batch translate/trim/wrap them. Let's breakdown how each action works.

### Trim

Trim action is the easiest one. The only thing it does - removes leading and trailing whitespace from translation.

### Wrap

Wrap action wraps the translation up to the number of characters specified by user. For more predictable results, it's better to use [monospace](https://en.wikipedia.org/wiki/Monospaced_font) or the one that's used in-game font to estimate the number of required characters.

Wrapped parts of the translation will be placed on a new line.

### Translation

That's probably the option you're looking for.

When selecting this option, you need to select the [translation endpoint](settings.md/#translation) you want to use.

When you're using AI endpoints, you can also input the context surrounding the files you want to process. You can conveniently add certain file's context if it's specified in [settings](settings.md/#file-context).

RPGMTranslate will never automize context generation or whatever, because that can never be expected to produce good results. We could add feature to generate a context for all files and automatically use it depending on the circumstances, but that's a waste of tokens for unpredictable and unmanagable results. Define and manage contexts by yourself.

By default RPGMTranslate will also send the [project context](settings.md/#project-context) to the AI each time.

Important option before proceeding is also setting up [token limit](settings.md/#token-limit) for the request. LLMs are often choking when there's too lot tokens sent to them, and by default RPGMTranslate uses a "middle-ground" value of 4000 tokens per request. You can lower or raise it, but keep in mind your tokens are not infinite neither your AI's capability of handling a lot of tokens. RPGMTranslate uses OpenAI's tiktoken tokenizer for even non-OpenAI endpoints and that's not a subject to change.

## Tab Panel

You can run a batch action for the desired file from the tab panel.

Right click the required tab and select the batch action in the menu.
