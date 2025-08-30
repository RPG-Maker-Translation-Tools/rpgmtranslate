export const RESOURCE_DIRECTORY = 11;
export const SETTINGS_PATH = "resources/settings.json";
export const NEW_LINE = "\\#";
export const SEPARATOR = "<#>";
export const PROGRAM_DATA_DIRECTORY = ".rpgmtranslate";
export const TRANSLATION_DIRECTORY = "translation";
export const TEMP_MAPS_DIRECTORY = "temp-maps";
export const LOG_FILE = "replacement-log.json";
export const PROJECT_SETTINGS_FILE = "project-settings.json";
export const BACKUP_DIRECTORY = "backups";
export const THEME_FILE_PATH = "resources/themes.json";

export const CHARACTER_SUBSTITUTIONS: Record<string, string> = {
    "<<": "«",
    ">>": "»",
    "--": "—",
    ",,": "„",
    "''": "“",
};
export const INTERRUPTING_KEYS = [
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Enter",
    "Escape",
];
export const ENGINE_NAMES = ["MV / MZ", "VX Ace", "VX", "XP"];
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
export const COMMENT_SUFFIX_LENGTH = COMMENT_SUFFIX.length;

export const COMMENT_PREFIX = "<!--";
export const COMMENT_PREFIX_LENGTH = COMMENT_PREFIX.length;

export const MAP_DISPLAY_NAME_COMMENT_PREFIX = "<!-- In-game Displayed Name: ";
export const MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH =
    MAP_DISPLAY_NAME_COMMENT_PREFIX.length;

export const TXT_EXTENSION = ".txt";
export const TXT_EXTENSION_LENGTH = TXT_EXTENSION.length;

export const JSON_EXTENSION = ".json";
export const JSON_EXTENSION_LENGTH = JSON_EXTENSION.length;

export const BOOKMARK_COMMENT = "<!-- Bookmark -->";
export const MAP_COMMENT = "<!-- Map -->";
export const EVENT_ID_COMMENT = "<!-- Event ID -->";
export const SYSTEM_ENTRY_COMMENT = "<!-- System Entry -->";
export const SCRIPT_ID_COMMENT = "<!-- Script ID -->";
export const PLUGIN_ID_COMMENT = "<!-- Plugin ID -->";

export const RVPACKER_METADATA_FILE = ".rvpacker-metadata";

export const CLIPBOARD_SEPARATOR = "<###>";

export const DEFAULT_ROW_COLUMN_WIDTH = 128;
export const DEFAULT_COLUMN_WIDTH = 768;
