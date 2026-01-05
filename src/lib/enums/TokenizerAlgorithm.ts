export const enum TokenizerAlgorithm {
    Arabic,
    Armenian,
    Basque,
    Catalan,
    Danish,
    Dutch,
    DutchPorter,
    English,
    Esperanto,
    Estonian,
    Finnish,
    French,
    German,
    Greek,
    Hindi,
    Hungarian,
    Indonesian,
    Irish,
    Italian,
    Lithuanian,
    Lovins,
    Nepali,
    Norwegian,
    Porter,
    Portuguese,
    Romanian,
    Russian,
    Serbian,
    Spanish,
    Swedish,
    Tamil,
    Turkish,
    Yiddish,

    Japanese,
    Chinese,
    Korean,

    Thai,
    Burmese,
    Lao,
    Khmer,

    None,
}

export const TokenizerAlgorithmNames = [
    "Arabic",
    "Armenian",
    "Basque",
    "Catalan",
    "Danish",
    "Dutch",
    "Dutch (Porter)",
    "English",
    "Esperanto",
    "Estonian",
    "Finnish",
    "French",
    "German",
    "Greek",
    "Hindi",
    "Hungarian",
    "Indonesian",
    "Irish",
    "Italian",
    "Lithuanian",
    "English (Lovins)",
    "Nepali",
    "Norwegian",
    "English (Porter)",
    "Portuguese",
    "Romanian",
    "Russian",
    "Serbian",
    "Spanish",
    "Swedish",
    "Tamil",
    "Turkish",
    "Yiddish",

    "Japanese",
    "Chinese",
    "Korean",

    "Thai",
    "Burmese",
    "Lao",
    "Khmer",

    "None",
] as const;

export const TokenizerAlgorithmBCP47 = [
    "ar", // Arabic
    "hy", // Armenian
    "eu", // Basque
    "ca", // Catalan
    "da", // Danish
    "nl", // Dutch
    "nl", // DutchPorter
    "en", // English
    "eo", // Esperanto
    "et", // Estonian
    "fi", // Finnish
    "fr", // French
    "de", // German
    "el", // Greek
    "hi", // Hindi
    "hu", // Hungarian
    "id", // Indonesian
    "ga", // Irish
    "it", // Italian
    "lt", // Lithuanian
    "en", // Lovins (English)
    "ne", // Nepali
    "no", // Norwegian
    "en", // Porter (English)
    "pt", // Portuguese
    "ro", // Romanian
    "ru", // Russian
    "sr", // Serbian
    "es", // Spanish
    "sv", // Swedish
    "ta", // Tamil
    "tr", // Turkish
    "yi", // Yiddish

    "ja", // Japanese
    "zh", // Chinese
    "ko", // Korean

    "th", // Thai
    "my", // Burmese
    "lo", // Lao
    "km", // Khmer

    "und", // None / undefined
] as const;
