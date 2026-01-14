export const enum TranslationEndpoint {
    Google,
    Yandex,
    DeepL,
    OpenAI,
    Anthropic,
    DeepSeek,
    Gemini,
    COUNT,
}

export const enum TranslationEndpointFlags {
    Google = 1 << TranslationEndpoint.Google,
    Yandex = 1 << TranslationEndpoint.Yandex,
    DeepL = 1 << TranslationEndpoint.DeepL,
    OpenAI = 1 << TranslationEndpoint.OpenAI,
    Anthropic = 1 << TranslationEndpoint.Anthropic,
    DeepSeek = 1 << TranslationEndpoint.DeepSeek,
    Gemini = 1 << TranslationEndpoint.Gemini,
}
