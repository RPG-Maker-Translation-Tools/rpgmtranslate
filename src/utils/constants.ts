/* eslint-disable no-magic-numbers */

export const RESOURCE_DIRECTORY = 11 as const;
export const SETTINGS_PATH = "resources/settings.json" as const;
export const THEME_FILE_PATH = "resources/themes.json" as const;

export const NEW_LINE = "\\#" as const;
export const SEPARATOR = "<#>" as const;

export const PROGRAM_DATA_DIRECTORY = ".rpgmtranslate" as const;
export const MATCHES_DIRECTORY = "matches" as const;
export const TRANSLATION_DIRECTORY = "translation" as const;
export const TEMP_MAPS_DIRECTORY = "temp-maps" as const;
export const LOG_FILE = "replacement-log.json" as const;
export const PROJECT_SETTINGS_FILE = "project-settings.json" as const;
export const BACKUP_DIRECTORY = "backups" as const;
export const GLOSSARY_FILE = "glossary.json" as const;

export const CHARACTER_SUBSTITUTIONS: Record<string, string> = {
    "<<": "«",
    ">>": "»",
    "--": "—",
    ",,": "„",
    "''": "“",
} as const;

export const INTERRUPTING_KEYS: string[] = [
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Enter",
    "Escape",
] as const;

export const ENGINE_NAMES = ["MV / MZ", "VX Ace", "VX", "XP"] as const;
export const MAX_FILE_MATCHES = 1000 as const;
export const SECOND_MS = 1000 as const;

export const MAX_ZOOM = 7 as const;
export const MIN_ZOOM = 0.1 as const;
export const ZOOM_STEP = 0.1 as const;

export const PERCENT_MULTIPLIER = 100 as const;

export const MIN_BACKUP_PERIOD = 60 as const;
export const MAX_BACKUP_PERIOD = 3600 as const;

export const MAX_BACKUPS = 99 as const;

export const COMMENT_SUFFIX = " -->" as const;
export const COMMENT_SUFFIX_LENGTH = 4 as const;

export const COMMENT_PREFIX = "<!--" as const;
export const COMMENT_PREFIX_LENGTH = 4 as const;

export const MAP_DISPLAY_NAME_COMMENT_PREFIX =
    "<!-- IN-GAME DISPLAYED NAME: " as const;
export const MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH = 29 as const;

export const TXT_EXTENSION = ".txt" as const;
export const TXT_EXTENSION_LENGTH = 4 as const;

export const JSON_EXTENSION = ".json" as const;
export const JSON_EXTENSION_LENGTH = 5 as const;

export const BOOKMARK_COMMENT = "<!-- Bookmark -->" as const;
export const ID_COMMENT = "<!-- ID -->" as const;

export const RVPACKER_METADATA_FILE = ".rvpacker-metadata" as const;

export const CLIPBOARD_SEPARATOR = "<###>" as const;

export const DEFAULT_ROW_COLUMN_WIDTH = 128 as const;
export const DEFAULT_COLUMN_WIDTH = 768 as const;

export const DEFAULT_FUZZY_THRESHOLD = 0.8 as const;

export const MAX_RECENT_PROJECTS = 10 as const;

export const ABOUT_WINDOW_WIDTH = 480 as const;
export const ABOUT_WINDOW_HEIGHT = 640 as const;

export const DEFAULT_SEARCH_PANEL_WIDTH = 256 as const;

export const DEFAULT_TEMPERATURE = 0.3 as const;
export const DEFAULT_TOKEN_LIMIT = 4000 as const;
