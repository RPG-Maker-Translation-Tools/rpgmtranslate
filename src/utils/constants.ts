export const RESOURCE_DIRECTORY = 11;
export const SETTINGS_PATH = "resources/settings.json";
export const THEME_FILE_PATH = "resources/themes.json";

export const NEW_LINE = "\\#";
export const SEPARATOR = "<#>";

export const PROGRAM_DATA_DIRECTORY = ".rpgmtranslate";
export const MATCHES_DIRECTORY = "matches";
export const TRANSLATION_DIRECTORY = "translation";
export const TEMP_MAPS_DIRECTORY = "temp-maps";
export const LOG_FILE = "replacement-log.json";
export const PROJECT_SETTINGS_FILE = "project-settings.json";
export const BACKUP_DIRECTORY = "backups";
export const GLOSSARY_FILE = "glossary.json";
export const OUTPUT_DIRECTORY = "output";

export const CHARACTER_SUBSTITUTIONS = {
    "<<": "«",
    ">>": "»",
    "--": "—",
    ",,": "„",
    "''": "“",
} as const;

export const INTERRUPTING_KEYS = [
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Enter",
    "Escape",
] as const;

export const ENGINE_NAMES = ["MV / MZ", "VX Ace", "VX", "XP"] as const;
export const MAX_FILE_MATCHES = 1000;
export const SECOND_MS = 1000;

export const MAX_ZOOM = 7;
export const MIN_ZOOM = 0.1;
export const ZOOM_STEP = 0.1;

export const PERCENT_MULTIPLIER = 100;

export const MIN_BACKUP_PERIOD = 60;
export const MAX_BACKUP_PERIOD = 3600;

export const MAX_BACKUPS = 99;

export const COMMENT_SUFFIX = " -->";
export const COMMENT_SUFFIX_LENGTH = 4;

export const COMMENT_PREFIX = "<!--";
export const COMMENT_PREFIX_LENGTH = 4;

export const MAP_DISPLAY_NAME_COMMENT_PREFIX = "<!-- IN-GAME DISPLAYED NAME: ";
export const MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH = 29;

export const TXT_EXTENSION = ".txt";
export const TXT_EXTENSION_LENGTH = 4;

export const JSON_EXTENSION = ".json";
export const JSON_EXTENSION_LENGTH = 5;

export const BOOKMARK_COMMENT = "<!-- Bookmark -->";
export const ID_COMMENT = "<!-- ID -->";
export const NAME_COMMENT = "<!-- NAME -->";

export const RVPACKER_METADATA_FILE = ".rvpacker-metadata";

export const CLIPBOARD_SEPARATOR = "<###>";

export const DEFAULT_ROW_COLUMN_WIDTH = 128;
export const DEFAULT_COLUMN_WIDTH = 768;

export const DEFAULT_FUZZY_THRESHOLD = 0.8;

export const MAX_RECENT_PROJECTS = 10;

export const ABOUT_WINDOW_WIDTH = 480;
export const ABOUT_WINDOW_HEIGHT = 640;

export const DEFAULT_SEARCH_PANEL_WIDTH = 256;

export const DEFAULT_TEMPERATURE = 0.3;
export const DEFAULT_TOKEN_LIMIT = 4000;

export const MATCH_MENU_HEIGHT = 64;
