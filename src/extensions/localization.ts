import { Language } from "../types/enums";

export class MainWindowLocalization {
    readonly askCreateSettings: string;
    readonly createdSettings: string;
    readonly unsavedChanges: string;
    readonly originalTextIrreplacable: string;
    readonly invalidRegexp: string;
    readonly textReverted: string;
    readonly reloadButton: string;
    readonly helpButton: string;
    readonly aboutButton: string;
    readonly hotkeysButton: string;
    readonly exit: string;
    readonly fileMenu: string;
    readonly helpMenu: string;
    readonly languageMenu: string;
    readonly menuButtonTitle: string;
    readonly saveButtonTitle: string;
    readonly compileButtonTitle: string;
    readonly settingsButtonTitle: string;
    readonly searchButtonTitle: string;
    readonly searchInputTitle: string;
    readonly replaceButtonTitle: string;
    readonly replaceInputTitle: string;
    readonly putButtonTitle: string;
    readonly caseButtonTitle: string;
    readonly wholeButtonTitle: string;
    readonly regexButtonTitle: string;
    readonly translationButtonTitle: string;
    readonly locationButtonTitle: string;
    readonly noMatches: string;
    readonly currentPage: string;
    readonly separator: string;
    readonly goToRow: string;
    readonly missingTranslationDir: string;
    readonly missingOriginalDir: string;
    readonly missingTranslationSubdirs: string;
    readonly noProjectSelected: string;
    readonly bgDark: string;
    readonly bgPrimary: string;
    readonly bgSecond: string;
    readonly bgThird: string;
    readonly outPrimary: string;
    readonly outSecond: string;
    readonly outThird: string;
    readonly outFocused: string;
    readonly bdPrimary: string;
    readonly bdSecond: string;
    readonly bdFocused: string;
    readonly bgPrimaryHovered: string;
    readonly bgSecondHovered: string;
    readonly txtPrimary: string;
    readonly txtSecond: string;
    readonly txtThird: string;
    readonly createTheme: string;
    readonly allowedThemeNameCharacters: string;
    readonly invalidThemeName: string;
    readonly themeName: string;
    readonly compileSuccess: string;
    readonly themeButtonTitle: string;
    readonly openButtonTitle: string;
    readonly loadingProject: string;
    readonly missingFileText: string;
    readonly cannotDetermineEngine: string;
    readonly selectedFolderMissing: string;
    readonly compileWindowTitle: string;
    readonly readWindowTitle: string;
    readonly purgeWindowTitle: string;
    readonly fromLanguage: string;
    readonly toLanguage: string;
    readonly bookmarksButtonTitle: string;
    readonly readButtonTitle: string;
    readonly directoryAlreadyOpened: string;
    readonly errorOccurred: string;
    readonly searchMode: string;
    readonly searchAll: string;
    readonly searchOnlyTranslation: string;
    readonly searchOnlyOriginal: string;
    readonly trimFields: string;
    readonly translateFields: string;
    readonly wrapFields: string;
    readonly translationLanguagesNotSelected: string;
    readonly selectFiles: string;
    readonly wrapNumber: string;
    readonly deletingDisabled: string;
    readonly deletingConfirmation: string;
    readonly selectAll: string;
    readonly deselectAll: string;
    readonly apply: string;
    readonly cancel: string;
    readonly newVersionFound: string;
    readonly currentVersion: string;
    readonly updateAvailable: string;
    readonly installUpdate: string;
    readonly couldNotSplitLine: string;
    readonly upToDate: string;
    readonly translationTextAreaUnputtable: string;
    readonly incorrectLanguageTag: string;
    readonly gameFilesDoNotExist: string;
    readonly options: string;
    readonly romanizeOption: string;
    readonly shuffleOption: string;
    readonly shuffleLevel: string;
    readonly chooseOptionText: string;
    readonly shuffleLinesOption: string;
    readonly shuffleAllOption: string;
    readonly disableCustomProcessing: string;
    readonly customOutputPath: string;
    readonly selectOutputPath: string;
    readonly disableProcessing: string;
    readonly disableMapsProcessingOption: string;
    readonly disableOtherProcessingOption: string;
    readonly disableSystemProcessingOption: string;
    readonly disablePluginsProcessingOption: string;
    readonly dontAskAgain: string;
    readonly compileButtonText: string;
    readonly mapsProcessingMode: string;
    readonly defaultMapsMode: string;
    readonly separateMapsMode: string;
    readonly preserveMapsMode: string;
    readonly mode: string;
    readonly chooseReadingMode: string;
    readonly defaultReadingMode: string;
    readonly appendReadingMode: string;
    readonly forceReadingMode: string;
    readonly appendModeDescription: string;
    readonly forceModeDescription: string;
    readonly readButtonText: string;
    readonly readingInAppendMode: string;
    readonly readingInForceMode: string;
    readonly readingModeNotSelected: string;
    readonly ignore: string;
    readonly statCheck: string;
    readonly leaveFilledCheck: string;
    readonly purgeEmptyCheck: string;
    readonly createIgnoreCheck: string;
    readonly purgeButtonText: string;
    readonly trim: string;
    readonly sort: string;

    constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.askCreateSettings = "Не удалось найти файл настроек программы.\nСоздать настройки?";
                this.createdSettings =
                    "Настройки созданы.\nРезервное копирование: Включено\nПериод копирования: 60 сек.\nМаксимальное число копий: 99.\nТема: Классный цинк";
                this.unsavedChanges = "У вас остались несохранённые изменения. Сохранить прогресс и выйти?";
                this.originalTextIrreplacable = "Оригинальные строки не могут быть заменены.";
                this.invalidRegexp = "Некорректное регулярное выражение";
                this.textReverted = "Текст был возвращён к исходному значению";
                this.reloadButton = "Перезагрузить (F5)";
                this.helpButton = "Помощь";
                this.aboutButton = "О программе";
                this.hotkeysButton = "Горячие клавиши";
                this.exit = "Выйти без сохранения?";
                this.fileMenu = "Файл";
                this.helpMenu = "Помощь";
                this.languageMenu = "Язык";
                this.menuButtonTitle = "Вкладки (Tab)";
                this.saveButtonTitle = "Сохранить файлы перевода (Ctrl + S)";
                this.compileButtonTitle = "Скомпилировать (Alt + C)";
                this.settingsButtonTitle = "Настройки";
                this.searchButtonTitle = "Поиск (Ctrl + F)";
                this.searchInputTitle = "Поиск";
                this.replaceButtonTitle = "Заменить все совпадения на";
                this.replaceInputTitle = "Замена";
                this.putButtonTitle = "Вставить текст в поле перевода совпадающего оригинального текста";
                this.caseButtonTitle = "Учитывать регистр (Alt + C)";
                this.wholeButtonTitle = "Искать слова целиком (Alt + W)";
                this.regexButtonTitle = "Поиск по регулярным выражениям (Alt + R)";
                this.translationButtonTitle = "Поиск только по переводу (Alt + T)";
                this.locationButtonTitle = "Поиск только в текущем файле (Alt + L)";
                this.noMatches = "Нет совпадений";
                this.currentPage = "Нет";
                this.separator = "из";
                this.goToRow = "Перейти к строке... от 1 до";
                this.missingTranslationDir = 'Директория "translation" отсутствует. Проект не будет инициализирован.';
                this.missingOriginalDir = 'Директория "data" отсутствует. Проект не будет инициализирован.';
                this.missingTranslationSubdirs =
                    'Поддиректории "maps" и "other" директории "translation" отсутствуют. Проект не будет инициализирован.';
                this.noProjectSelected =
                    'Проект не выбран. Выберите директорию проекта, используя кнопку "открыть папку" в левом верхнем углу. Директория должна содержать в себе папки "data" и "translation" (с поддиректориями "maps", "other" и "plugins", если это RPG Maker MV/MZ; или "maps" и "other", если это RPG Maker XP/VX/VXAce).';
                this.bgDark = "Тёмный цвет фона";
                this.bgPrimary = "Основной цвет фона";
                this.bgSecond = "Второстепенный цвет фона";
                this.bgThird = "Третий цвет фона";
                this.outPrimary = "Основной цвет контура";
                this.outSecond = "Второстепенный цвет контура";
                this.outThird = "Третий цвет контура";
                this.outFocused = "Цвет контура при фокусировке";
                this.bdPrimary = "Основной цвет границы";
                this.bdSecond = "Второстепенный цвет границы";
                this.bdFocused = "Цвет границы при фокусировке";
                this.bgPrimaryHovered = "Основной цвет фона при наведении курсора";
                this.bgSecondHovered = "Второстепенный цвет фона при наведении курсора";
                this.txtPrimary = "Основной цвет текста";
                this.txtSecond = "Второстепенный цвет текста";
                this.txtThird = "Третий цвет текста";
                this.createTheme = "Создать тему";
                this.allowedThemeNameCharacters = "Разрешенные символы: a-z, A-Z, 0-9, -, _.";
                this.invalidThemeName = "Название темы недопустимо.";
                this.themeName = "Название темы:";
                this.compileSuccess = "Все файлы записаны успешно.\nПотрачено (в секундах):";
                this.themeButtonTitle = "Меню тем";
                this.openButtonTitle = "Открыть папку";
                this.loadingProject = "Загружаем проект";
                this.selectedFolderMissing = "Выбранная папка не существует. Проект не будет инициализирован.";
                this.missingFileText =
                    "Текст выбранного файла отсутствует. Скорее всего, этот файл и/или его _trans версия отсутствуют.";
                this.cannotDetermineEngine = "Не удалось определить тип движка игры.";
                this.compileWindowTitle = "Настройки компиляции";
                this.readWindowTitle = "Настройки чтения";
                this.purgeWindowTitle = "Удаление неиспользуемых строк";
                this.fromLanguage = "С языка:";
                this.toLanguage = "На язык:";
                this.bookmarksButtonTitle = "Закладки (Ctrl + B)";
                this.readButtonTitle = "Перечитать файлы (Alt + R)";
                this.directoryAlreadyOpened = "Выбранная директория уже открыта в программе.";
                this.errorOccurred = "Произошла ошибка:";
                this.searchMode = "Режим поиска";
                this.searchAll = "Искать везде";
                this.searchOnlyOriginal = "Искать только в ориг. тексте";
                this.searchOnlyTranslation = "Искать только в переводе";
                this.trimFields = "Обрезать пробелы полей";
                this.translateFields = "Перевести поля";
                this.wrapFields = "Перенести строки в полях";
                this.translationLanguagesNotSelected = "Языки перевода не выбраны. Введите их в полях наверху.";
                this.selectFiles = "Выберите файлы (можно зажать ЛКМ и выделить несколько файлов)";
                this.wrapNumber = "Длина строки для переноса";
                this.deletingDisabled = "Удаление рядов выключено.";
                this.deletingConfirmation = "Вы действительно хотите удалить этот ряд? Это действие необратимо!";
                this.selectAll = "Выбрать всё";
                this.deselectAll = "Убрать всё";
                this.apply = "Применить";
                this.cancel = "Отменить";
                this.newVersionFound = "Обнаружена новая версия";
                this.currentVersion = "Текущая версия";
                this.updateAvailable = "Доступно обновление!";
                this.installUpdate = "Установить обновление";
                this.couldNotSplitLine = "Не удалось разделить линию на позиции в файле:";
                this.upToDate = "Программа обновлена до последней версии.";
                this.translationTextAreaUnputtable = "Нельзя вставить текст в поле перевода.";
                this.incorrectLanguageTag =
                    "Некорректный тег языка. Тег должен соответствовать BCP-47, например ru или ru-RU";
                this.gameFilesDoNotExist =
                    "Файлы игры не существуют (нет папки original или data), так что возможно только редактировать и сохранять перевод.";
                this.options = "Опции:";
                this.romanizeOption =
                    "Романизация игрового текста. Используйте эту опцию, лишь если вы прочитали текст с её использованием, чтобы корректно записать все файлы.";
                this.shuffleOption = "Перемешивание";
                this.shuffleLevel = "Уровень перемешивания";
                this.chooseOptionText = "Выберите опцию";
                this.shuffleLinesOption = "Перемешать линии в строках";
                this.shuffleAllOption = "Перемешать линии и слова";
                this.disableCustomProcessing =
                    "Выключить индивидуальную обработку (используйте лишь если вы прочитали файлы без индивидуальной обработки)";
                this.customOutputPath = "Другой выходной путь";
                this.selectOutputPath = "Выбрать выходной путь";
                this.disableProcessing = "Выключить обработку...";
                this.disableMapsProcessingOption = "Выключить обработку файлов maps";
                this.disableOtherProcessingOption = "Выключить обработку файлов other";
                this.disableSystemProcessingOption = "Выключить обработку файла system";
                this.disablePluginsProcessingOption = "Выключить обработку файла plugins/scripts";
                this.dontAskAgain = "Больше не спрашивать (вы можете вновь открыть это окно правой кнопкой мыши)";
                this.compileButtonText = "Скомпилировать";
                this.mapsProcessingMode = "Режим обработки файлов maps";
                this.defaultMapsMode = "Стандартный";
                this.separateMapsMode = "Раздельный текст карт";
                this.preserveMapsMode = "Сохранять дубликаты";
                this.ignore = "Игнорировать строки из файла .rvpacker-ignore";
                this.readButtonText = "Прочитать";
                this.readingInAppendMode = "Читаем в режиме добавления";
                this.readingInForceMode = "Читаем в режиме принудительной перезаписи";
                this.readingModeNotSelected = "Режим чтения не выбран.";
                this.mapsProcessingMode = "Режим обработки файлов maps";
                this.mode = "Режим чтения:";
                this.chooseReadingMode = "Выберите режим чтения";
                this.defaultReadingMode = "Стандартный";
                this.appendReadingMode = "Добавление";
                this.forceReadingMode = "Перезапись";
                this.appendModeDescription =
                    "В случае обновления игры, текст которой вы запарсили, либо же графического интерфейса, имеет смысл перечитать файлы в этом режиме, чтобы добавить новый текст к имеющемуся без потери прогресса. Перед чтением, убедитесь, что вы сохранили перевод!";
                this.forceModeDescription =
                    "Принудительно перезаписывает файлы перевода. Используйте, если вам нужно полностью перечитать файлы с определёнными настройками.";
                this.statCheck = "Вывести статистику в файл stat.txt";
                this.leaveFilledCheck = "Оставить поля, имеющие перевод";
                this.purgeEmptyCheck = "Удалить только поля, не имеющие перевода";
                this.createIgnoreCheck =
                    "Создать файл .rvpacker-ignore из удалённых строк, чтобы избежать их повторного появления в файлах";
                this.purgeButtonText = "Очистка";
                this.trim =
                    "Удалить лишние начальные и конечные пробелы из распарсенного текста. Может привести к нерабочей или некорректной записи текста.";
                this.sort =
                    "Отсортировать строки перевода в соответствии с их порядком в игре. Работает только с режимом добавления текста.";
                break;
            default:
                this.askCreateSettings = "Cannot find program's settings.\nCreate settings?";
                this.createdSettings =
                    "Settings created.\nBackups: Enabled\nBackup period: 60 secs.\nMaximum backups: 99.\nTheme: Cool Zinc";
                this.unsavedChanges = "You have unsaved changes. Save progress and quit?";
                this.originalTextIrreplacable = "Original text is irreplacable.";
                this.invalidRegexp = "Invalid regular expression.";
                this.textReverted = "Text was reverted to the original state";
                this.reloadButton = "Reload (F5)";
                this.helpButton = "Help";
                this.aboutButton = "About";
                this.hotkeysButton = "Hotkeys";
                this.exit = "Quit without saving?";
                this.fileMenu = "File";
                this.helpMenu = "Help";
                this.languageMenu = "Language";
                this.menuButtonTitle = "Tabs (Tab)";
                this.saveButtonTitle = "Save the translation files (Ctrl + S)";
                this.compileButtonTitle = "Compile (Alt + C)";
                this.settingsButtonTitle = "Settings";
                this.searchButtonTitle = "Search (Ctrl + F)";
                this.searchInputTitle = "Search";
                this.replaceButtonTitle = "Replace all matches with";
                this.replaceInputTitle = "Replace";
                this.putButtonTitle = "Put text to matching original text's translation textarea";
                this.caseButtonTitle = "Consider case (Alt + C)";
                this.wholeButtonTitle = "Search the whole text (Alt + W)";
                this.regexButtonTitle = "Search by regular expressions (Alt + R)";
                this.translationButtonTitle = "Search only by translation (Alt + T)";
                this.locationButtonTitle = "Search only in the current file (Alt + L)";
                this.noMatches = "No matches";
                this.currentPage = "None";
                this.separator = "of";
                this.goToRow = "Go to row... from 1 to";
                this.missingTranslationDir = "'translation' directory is missing. Project won't be initialized.";
                this.missingOriginalDir = "'data' directory is missing. Project won't be initialized.";
                this.missingTranslationSubdirs =
                    "'translation' directory's subdirectories 'maps', 'other' and/or 'plugins' are missing. Project won't be initialized.";
                this.noProjectSelected =
                    "No project selected. Select the project directory, using 'open folder' button in the left-top corner. Directory must contain directories  'data' and 'translation' (with 'maps', 'other' and 'plugins' subdirectories, if it's RPG Maker MV/MZ; or 'maps' and 'other', if it's RPG Maker XP/VX/VXAce).";
                this.bgDark = "Dark background color";
                this.bgPrimary = "Primary background color";
                this.bgSecond = "Second background color";
                this.bgThird = "Third background color";
                this.outPrimary = "Primary outline color";
                this.outSecond = "Second outline color";
                this.outThird = "Third outline color";
                this.outFocused = "Focused outline color";
                this.bdPrimary = "Primary border color";
                this.bdSecond = "Second border color";
                this.bdFocused = "Focused border color";
                this.bgPrimaryHovered = "Primary background color when hovered";
                this.bgSecondHovered = "Second background color when hovered";
                this.txtPrimary = "Primary text color";
                this.txtSecond = "Second text color";
                this.txtThird = "Third text color";
                this.createTheme = "Create theme";
                this.allowedThemeNameCharacters = "Allowed characters: a-z, A-Z, 0-9, -, _.";
                this.invalidThemeName = "Theme name is invalid.";
                this.themeName = "Theme name:";
                this.compileSuccess = "All files were written successfully.\nTime spent (in seconds):";
                this.themeButtonTitle = "Themes menu";
                this.openButtonTitle = "Open folder";
                this.loadingProject = "Loading project";
                this.selectedFolderMissing = "Selected folder is missing. Project won't be initialized.";
                this.missingFileText =
                    "Text of the selected file missing. Probably, it and it's _trans version don't exist for some reason.";
                this.cannotDetermineEngine = "Cannot determine the type of the game's engine.";
                this.compileWindowTitle = "Compilation settings";
                this.readWindowTitle = "Read settings";
                this.purgeWindowTitle = "Purge unused lines";
                this.fromLanguage = "From language:";
                this.toLanguage = "To language:";
                this.bookmarksButtonTitle = "Bookmarks (Ctrl + B)";
                this.readButtonTitle = "Re-read files (Alt + R)";
                this.directoryAlreadyOpened = "Selected directory is already opened in the program.";
                this.errorOccurred = "An error has occurred:";
                this.searchMode = "Search mode";
                this.searchAll = "Search everywhere";
                this.searchOnlyOriginal = "Search only in original text";
                this.searchOnlyTranslation = "Search only in translation";
                this.trimFields = "Trim fields";
                this.translateFields = "Translate fields";
                this.wrapFields = "Wrap lines in fields";
                this.translationLanguagesNotSelected =
                    "Translation languages are not selected. Input them to inputs above.";
                this.selectFiles = "Select files (You can hold LMB and drag to select multiple files)";
                this.wrapNumber = "Line length for wrapping";
                this.deletingDisabled = "Deleting is disabled in settings.";
                this.deletingConfirmation = "Do you really want to delete this row? This action is irreversible!";
                this.selectAll = "Select all";
                this.deselectAll = "Deselect all";
                this.apply = "Apply";
                this.cancel = "Cancel";
                this.newVersionFound = "New version found";
                this.currentVersion = "Current version";
                this.updateAvailable = "Update available!";
                this.installUpdate = "Install update";
                this.couldNotSplitLine = "Couldn't split line at line in file:";
                this.upToDate = "Program is up to date.";
                this.translationTextAreaUnputtable = "You can't put text to a translation textarea.";
                this.incorrectLanguageTag =
                    "Incorrect language tag. Tag must correspond to BCP-47, for example en or en-US";
                this.gameFilesDoNotExist =
                    "Game files do not exist (no original or data folders), so it's only possible to edit and save translation.";
                this.options = "Options:";
                this.romanizeOption =
                    "Whether to romanize text. Only use this option if you've read text with it, to correctly write all files.";
                this.shuffleOption = "Shuffle";
                this.shuffleLevel = "Shuffle level";
                this.chooseOptionText = "Choose an option";
                this.shuffleLinesOption = "Shuffle text lines";
                this.shuffleAllOption = "Shuffle both lines and words";
                this.disableCustomProcessing =
                    "Disable custom processing (use only if you've read files without custom processing)";
                this.customOutputPath = "Custom output path";
                this.selectOutputPath = "Select output path";
                this.disableProcessing = "Disable processing of...";
                this.disableMapsProcessingOption = "Disable maps processing";
                this.disableOtherProcessingOption = "Disable other processing";
                this.disableSystemProcessingOption = "Disable system processing";
                this.disablePluginsProcessingOption = "Disable plugins/scripts processing";
                this.dontAskAgain = "Don't ask again (you can open this window again by right-clicking compile button)";
                this.compileButtonText = "Compile";
                this.mapsProcessingMode = "Maps processing mode";
                this.defaultMapsMode = "Default";
                this.separateMapsMode = "Separate maps text";
                this.preserveMapsMode = "Preserve duplicates";
                this.ignore = "Ignore entries from .rvpacker-ignore file";
                this.readButtonText = "Read";
                this.readingInAppendMode = "Reading in append mode";
                this.readingInForceMode = "Reading in force rewrite mode";
                this.readingModeNotSelected = "Reading mode is not selected.";
                this.mode = "Reading mode:";
                this.chooseReadingMode = "Choose reading mode";
                this.defaultReadingMode = "Default";
                this.appendReadingMode = "Append";
                this.forceReadingMode = "Force rewrite";
                this.appendModeDescription =
                    "In case, when the game text you've parsed updates, or the GUI update, it makes sense to re-read files in this mode, to append new text to existing translation without overwriting the progress. Before reading ensure you've saved the translation!";
                this.forceModeDescription =
                    "Forcefully rewrites translation files. Use, only if you need to completely re-read files using certain settings.";
                this.statCheck = "Output statistics to stat.txt file";
                this.leaveFilledCheck = "Leave the fields that have the translation";
                this.purgeEmptyCheck = "Purge only the empty fields";
                this.createIgnoreCheck =
                    "Create .rvpacker-ignore file from purged lines to prevent their further appearance";
                this.purgeButtonText = "Purge";
                this.sort =
                    "Sort the translation entries according to their order in game. Works only with append mode.";
                this.trim =
                    "Remove the leading and trailing whitespace from extracted strings. Could lead to non-working or incorrect text writing.";
                break;
        }
    }
}

export class SettingsWindowLocalization {
    readonly backupPeriodLabel: string;
    readonly backupPeriodNote: string;
    readonly backupMaxLabel: string;
    readonly backupMaxNote: string;
    readonly backup: string;
    readonly font: string;
    readonly defaultFont: string;
    readonly translationLanguages: string;
    readonly confirmation: string;
    readonly disabled: string;
    readonly allowed: string;
    readonly delete: string;
    readonly displayGhostLines: string;
    readonly checkForUpdates: string;

    constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.backupPeriodLabel = "Создавать резервные копии каждые:";
                this.backupPeriodNote = "секунд (минимум 60, максимум 3600)";
                this.backupMaxLabel = "Максимальное количество резервных копий:";
                this.backupMaxNote = "(минимум 1, максимум 99)";
                this.backup = "Резервное копирование";
                this.font = "Шрифт";
                this.defaultFont = "Стандартный";
                this.translationLanguages = "Языки перевода (для машинного перевода)";
                this.delete = "Режим удаления рядов";
                this.disabled = "Выключить";
                this.confirmation = "Спрашивать";
                this.allowed = "Разрешить";
                this.displayGhostLines = "Отображать переносы строк в текстовых полях";
                this.checkForUpdates = "Проверять наличие обновлений";
                break;
            default:
                this.backupPeriodLabel = "Create backup every:";
                this.backupPeriodNote = "seconds (min 60, max 3600)";
                this.backupMaxLabel = "Max number of backups:";
                this.backupMaxNote = "(min 1, max 99)";
                this.backup = "Backup";
                this.font = "Font";
                this.defaultFont = "Default";
                this.translationLanguages = "Translation languages (for machine translation)";
                this.delete = "Row delete mode";
                this.disabled = "Disabled";
                this.confirmation = "Ask for confirmation";
                this.allowed = "Allowed";
                this.displayGhostLines = "Display lines breaks in text areas";
                this.checkForUpdates = "Check for updates";
                break;
        }
    }
}

export class AboutWindowLocalization {
    readonly version: string;
    readonly contacts: string;
    readonly vkLink: string;
    readonly tgLink: string;
    readonly repoLink: string;
    readonly license: string;

    constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.version = "Версия";
                this.contacts = "Контакты:";
                this.vkLink = "ВК";
                this.tgLink = "Телеграм";
                this.repoLink = "Репозиторий программы";
                this.license = "Лицензия";
                break;
            default:
                this.version = "Version";
                this.contacts = "Contacts:";
                this.vkLink = "VK";
                this.tgLink = "Telegram";
                this.repoLink = "Program's repository";
                this.license = "License";
                break;
        }
    }
}

export type Localization = MainWindowLocalization | AboutWindowLocalization | SettingsWindowLocalization;
