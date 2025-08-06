import { Language } from "../types/enums";

export class MainWindowLocalization {
    public readonly askCreateSettings: string;
    public readonly unsavedChanges: string;
    public readonly sourceTextIrreplacable: string;
    public readonly textReverted: string;
    public readonly reloadButton: string;
    public readonly helpButton: string;
    public readonly aboutButton: string;
    public readonly hotkeysButton: string;
    public readonly exit: string;
    public readonly fileMenu: string;
    public readonly helpMenu: string;
    public readonly languageMenu: string;
    public readonly menuButtonTitle: string;
    public readonly saveButtonTitle: string;
    public readonly writeButtonTitle: string;
    public readonly settingsButtonTitle: string;
    public readonly searchButtonTitle: string;
    public readonly searchInputTitle: string;
    public readonly replaceButtonTitle: string;
    public readonly replaceInputTitle: string;
    public readonly putButtonTitle: string;
    public readonly caseButtonTitle: string;
    public readonly wholeButtonTitle: string;
    public readonly regexButtonTitle: string;
    public readonly translationButtonTitle: string;
    public readonly locationButtonTitle: string;
    public readonly noMatches: string;
    public readonly currentPage: string;
    public readonly separator: string;
    public readonly goToRow: string;
    public readonly missingTranslationDirectory: string;
    public readonly missingSourceDirectory: string;
    public readonly missingTranslationSubdirs: string;
    public readonly noProjectSelected: string;
    public readonly bgDark: string;
    public readonly bgPrimary: string;
    public readonly bgSecond: string;
    public readonly bgThird: string;
    public readonly outPrimary: string;
    public readonly outSecond: string;
    public readonly outThird: string;
    public readonly outFocused: string;
    public readonly bdPrimary: string;
    public readonly bdSecond: string;
    public readonly bdFocused: string;
    public readonly bgPrimaryHovered: string;
    public readonly bgSecondHovered: string;
    public readonly txtPrimary: string;
    public readonly txtSecond: string;
    public readonly txtThird: string;
    public readonly createTheme: string;
    public readonly allowedThemeNameCharacters: string;
    public readonly invalidThemeName: string;
    public readonly themeName: string;
    public readonly writeSuccess: string;
    public readonly themeButtonTitle: string;
    public readonly openButtonTitle: string;
    public readonly loadingProject: string;
    public readonly missingFileText: string;
    public readonly cannotDetermineEngine: string;
    public readonly selectedFolderMissing: string;
    public readonly writeWindowTitle: string;
    public readonly readWindowTitle: string;
    public readonly purgeWindowTitle: string;
    public readonly fromLanguage: string;
    public readonly toLanguage: string;
    public readonly bookmarksButtonTitle: string;
    public readonly readButtonTitle: string;
    public readonly directoryAlreadyOpened: string;
    public readonly errorOccurred: string;
    public readonly searchModeSelectLabel: string;
    public readonly searchAllOptionLabel: string;
    public readonly searchOnlyTranslationOptionLabel: string;
    public readonly searchOnlySourceOptionLabel: string;
    public readonly trimActionDescription: string;
    public readonly translateActionDescription: string;
    public readonly wrapActionDescription: string;
    public readonly translationLanguagesNotSelected: string;
    public readonly selectFiles: string;
    public readonly wrapNumber: string;
    public readonly deletingDisabled: string;
    public readonly deletingConfirmation: string;
    public readonly selectAll: string;
    public readonly deselectAll: string;
    public readonly apply: string;
    public readonly cancel: string;
    public readonly newVersionFound: string;
    public readonly currentVersion: string;
    public readonly updateAvailable: string;
    public readonly installUpdate: string;
    public readonly upToDate: string;
    public readonly translationTextAreaUnputtable: string;
    public readonly incorrectLanguageTag: string;
    public readonly gameFilesDoNotExist: string;
    public readonly options: string;
    public readonly romanizeOption: string;
    public readonly shuffleOption: string;
    public readonly shuffleLevel: string;
    public readonly chooseOptionText: string;
    public readonly shuffleLinesOption: string;
    public readonly shuffleAllOption: string;
    public readonly disableCustomProcessing: string;
    public readonly customOutputPath: string;
    public readonly selectOutputPath: string;
    public readonly disableProcessing: string;
    public readonly disableMapProcessingOption: string;
    public readonly disableOtherProcessingOption: string;
    public readonly disableSystemProcessingOption: string;
    public readonly disablePluginProcessingOption: string;
    public readonly dontAskAgain: string;
    public readonly writeButtonText: string;
    public readonly duplicateMode: string;
    public readonly removeMode: string;
    public readonly allowMode: string;
    public readonly mode: string;
    public readonly chooseReadMode: string;
    public readonly defaultReadMode: string;
    public readonly appendReadMode: string;
    public readonly forceReadMode: string;
    public readonly appendModeDescription: string;
    public readonly forceModeDescription: string;
    public readonly readButtonText: string;
    public readonly readingInAppendMode: string;
    public readonly readingInForceMode: string;
    public readonly readModeUnselected: string;
    public readonly ignore: string;
    public readonly createIgnoreCheck: string;
    public readonly purgeButtonText: string;
    public readonly trim: string;
    public readonly chooseFileOption: string;
    public readonly selectBatchAction: string;
    public readonly selectTranslationColumn: string;
    public readonly searchColumnSelectLabel: string;
    public readonly rightmostFilledOptionLabel: string;

    public constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.askCreateSettings =
                    "Не удалось найти файл настроек программы.\nСоздать настройки?";
                this.unsavedChanges =
                    "У вас остались несохранённые изменения. Сохранить прогресс и выйти?";
                this.sourceTextIrreplacable =
                    "Оригинальные строки не могут быть заменены.";
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
                this.writeButtonTitle = "Скомпилировать (Alt + C)";
                this.settingsButtonTitle = "Настройки";
                this.searchButtonTitle = "Поиск (Ctrl + F)";
                this.searchInputTitle = "Поиск";
                this.replaceButtonTitle = "Заменить все совпадения на";
                this.replaceInputTitle = "Замена";
                this.putButtonTitle =
                    "Заместить текст в поле перевода, если текст в поле исходного текста совпадает с искомым.";
                this.caseButtonTitle = "Учитывать регистр (Alt + C)";
                this.wholeButtonTitle = "Искать слова целиком (Alt + W)";
                this.regexButtonTitle =
                    "Поиск по регулярным выражениям (Alt + R)";
                this.translationButtonTitle =
                    "Поиск только по переводу (Alt + T)";
                this.locationButtonTitle =
                    "Поиск только в текущем файле (Alt + L)";
                this.noMatches = "Нет совпадений";
                this.currentPage = "Нет";
                this.separator = "из";
                this.goToRow = "Перейти к строке... от 1 до";
                this.missingTranslationDirectory =
                    'Директория "translation" отсутствует. Проект не будет инициализирован.';
                this.missingSourceDirectory =
                    'Директория "data" отсутствует. Проект не будет инициализирован.';
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
                this.bgPrimaryHovered =
                    "Основной цвет фона при наведении курсора";
                this.bgSecondHovered =
                    "Второстепенный цвет фона при наведении курсора";
                this.txtPrimary = "Основной цвет текста";
                this.txtSecond = "Второстепенный цвет текста";
                this.txtThird = "Третий цвет текста";
                this.createTheme = "Создать тему";
                this.allowedThemeNameCharacters =
                    "Разрешенные символы: a-z, A-Z, 0-9, -, _.";
                this.invalidThemeName = "Название темы недопустимо.";
                this.themeName = "Название темы:";
                this.writeSuccess =
                    "Все файлы записаны успешно.\nПотрачено (в секундах):";
                this.themeButtonTitle = "Меню тем";
                this.openButtonTitle = "Открыть папку";
                this.loadingProject = "Загружаем проект";
                this.selectedFolderMissing =
                    "Выбранная папка не существует. Проект не будет инициализирован.";
                this.missingFileText =
                    "Текст выбранного файла отсутствует. Скорее всего, этот файл и/или его _trans версия отсутствуют.";
                this.cannotDetermineEngine =
                    "Не удалось определить тип движка игры.";
                this.writeWindowTitle = "Настройки компиляции";
                this.readWindowTitle = "Настройки чтения";
                this.purgeWindowTitle = "Удаление неиспользуемых строк";
                this.fromLanguage = "С языка:";
                this.toLanguage = "На язык:";
                this.bookmarksButtonTitle = "Закладки (Ctrl + B)";
                this.readButtonTitle = "Перечитать файлы (Alt + R)";
                this.directoryAlreadyOpened =
                    "Выбранная директория уже открыта в программе.";
                this.errorOccurred = "Произошла ошибка:";
                this.searchModeSelectLabel = "Режим поиска";
                this.searchAllOptionLabel = "Искать везде";
                this.searchOnlySourceOptionLabel =
                    "Искать только в ориг. тексте";
                this.searchOnlyTranslationOptionLabel =
                    "Искать только в переводе";
                this.trimActionDescription = "Обрезать пробелы полей";
                this.translateActionDescription = "Перевести поля";
                this.wrapActionDescription = "Перенести строки в полях";
                this.translationLanguagesNotSelected =
                    "Языки перевода не выбраны. Введите их в полях наверху.";
                this.selectFiles =
                    "Выберите файлы (можно зажать ЛКМ и выделить несколько файлов)";
                this.wrapNumber = "Длина строки для переноса";
                this.deletingDisabled = "Удаление рядов выключено.";
                this.deletingConfirmation =
                    "Вы действительно хотите удалить этот ряд? Это действие необратимо!";
                this.selectAll = "Выбрать всё";
                this.deselectAll = "Убрать всё";
                this.apply = "Применить";
                this.cancel = "Отменить";
                this.newVersionFound = "Обнаружена новая версия";
                this.currentVersion = "Текущая версия";
                this.updateAvailable = "Доступно обновление!";
                this.installUpdate = "Установить обновление";
                this.upToDate = "Программа обновлена до последней версии.";
                this.translationTextAreaUnputtable =
                    "Нельзя вставить текст в поле перевода.";
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
                this.disableMapProcessingOption =
                    "Выключить обработку файлов maps";
                this.disableOtherProcessingOption =
                    "Выключить обработку файлов other";
                this.disableSystemProcessingOption =
                    "Выключить обработку файла system";
                this.disablePluginProcessingOption =
                    "Выключить обработку файла plugins/scripts";
                this.dontAskAgain =
                    "Больше не спрашивать (вы можете вновь открыть это окно правой кнопкой мыши)";
                this.writeButtonText = "Скомпилировать";
                this.duplicateMode = "Режим обработки файлов maps";
                this.removeMode = "Удалить дубликаты";
                this.allowMode = "Разрешить дубликаты";
                this.ignore = "Игнорировать строки из файла .rvpacker-ignore";
                this.readButtonText = "Прочитать";
                this.readingInAppendMode = "Читаем в режиме добавления";
                this.readingInForceMode =
                    "Читаем в режиме принудительной перезаписи";
                this.readModeUnselected = "Режим чтения не выбран.";
                this.duplicateMode = "Режим обработки файлов maps";
                this.mode = "Режим чтения:";
                this.chooseReadMode = "Выберите режим чтения";
                this.defaultReadMode = "Стандартный";
                this.appendReadMode = "Добавление";
                this.forceReadMode = "Перезапись";
                this.appendModeDescription =
                    "В случае обновления игры, текст которой вы запарсили, либо же графического интерфейса, имеет смысл перечитать файлы в этом режиме, чтобы добавить новый текст к имеющемуся без потери прогресса. Перед чтением, убедитесь, что вы сохранили перевод!";
                this.forceModeDescription =
                    "Принудительно перезаписывает файлы перевода. Используйте, если вам нужно полностью перечитать файлы с определёнными настройками.";
                this.createIgnoreCheck =
                    "Создать файл .rvpacker-ignore из удалённых строк, чтобы избежать их повторного появления в файлах";
                this.purgeButtonText = "Очистка";
                this.trim =
                    "Удалить лишние начальные и конечные пробелы из распарсенного текста. Может привести к нерабочей или некорректной записи текста.";
                this.chooseFileOption = "-Выберите файл-";
                this.selectBatchAction = "-Выберите действие-";
                this.selectTranslationColumn = "-Выберите целевой столбец-";
                this.searchColumnSelectLabel = "Выберите столбец для поиска";
                this.rightmostFilledOptionLabel = "Крайний заполненный";
                break;
            case Language.English:
            default:
                this.askCreateSettings =
                    "Cannot find program's settings.\nCreate settings?";
                this.unsavedChanges =
                    "You have unsaved changes. Save progress and quit?";
                this.sourceTextIrreplacable = "Source text cannot be replaced.";
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
                this.writeButtonTitle = "Write (Alt + C)";
                this.settingsButtonTitle = "Settings";
                this.searchButtonTitle = "Search (Ctrl + F)";
                this.searchInputTitle = "Search";
                this.replaceButtonTitle = "Replace all matches with";
                this.replaceInputTitle = "Replace";
                this.putButtonTitle =
                    "Put text to translation textarea of matching source text.";
                this.caseButtonTitle = "Consider case (Alt + C)";
                this.wholeButtonTitle = "Search the whole text (Alt + W)";
                this.regexButtonTitle =
                    "Search by regular expressions (Alt + R)";
                this.translationButtonTitle =
                    "Search only by translation (Alt + T)";
                this.locationButtonTitle =
                    "Search only in the current file (Alt + L)";
                this.noMatches = "No matches";
                this.currentPage = "None";
                this.separator = "of";
                this.goToRow = "Go to row... from 1 to";
                this.missingTranslationDirectory =
                    "'translation' directory is missing. Project won't be initialized.";
                this.missingSourceDirectory =
                    "'data' directory is missing. Project won't be initialized.";
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
                this.allowedThemeNameCharacters =
                    "Allowed characters: a-z, A-Z, 0-9, -, _.";
                this.invalidThemeName = "Theme name is invalid.";
                this.themeName = "Theme name:";
                this.writeSuccess =
                    "All files were written successfully.\nTime spent (in seconds):";
                this.themeButtonTitle = "Themes menu";
                this.openButtonTitle = "Open folder";
                this.loadingProject = "Loading project";
                this.selectedFolderMissing =
                    "Selected folder is missing. Project won't be initialized.";
                this.missingFileText =
                    "Text of the selected file missing. Probably, it and it's _trans version don't exist for some reason.";
                this.cannotDetermineEngine =
                    "Cannot determine the type of the game's engine.";
                this.writeWindowTitle = "Compilation settings";
                this.readWindowTitle = "Read settings";
                this.purgeWindowTitle = "Purge unused lines";
                this.fromLanguage = "From language:";
                this.toLanguage = "To language:";
                this.bookmarksButtonTitle = "Bookmarks (Ctrl + B)";
                this.readButtonTitle = "Re-read files (Alt + R)";
                this.directoryAlreadyOpened =
                    "Selected directory is already opened in the program.";
                this.errorOccurred = "An error has occurred:";
                this.searchModeSelectLabel = "Search mode";
                this.searchAllOptionLabel = "Search everywhere";
                this.searchOnlySourceOptionLabel = "Search only in source text";
                this.searchOnlyTranslationOptionLabel =
                    "Search only in translation";
                this.trimActionDescription = "Trim fields";
                this.translateActionDescription = "Translate fields";
                this.wrapActionDescription = "Wrap lines in fields";
                this.translationLanguagesNotSelected =
                    "Translation languages are not selected. Input them to inputs above.";
                this.selectFiles =
                    "Select files (You can hold LMB and drag to select multiple files)";
                this.wrapNumber = "Line length for wrapping";
                this.deletingDisabled = "Deleting is disabled in settings.";
                this.deletingConfirmation =
                    "Do you really want to delete this row? This action is irreversible!";
                this.selectAll = "Select all";
                this.deselectAll = "Deselect all";
                this.apply = "Apply";
                this.cancel = "Cancel";
                this.newVersionFound = "New version found";
                this.currentVersion = "Current version";
                this.updateAvailable = "Update available!";
                this.installUpdate = "Install update";
                this.upToDate = "Program is up to date.";
                this.translationTextAreaUnputtable =
                    "You can't put text to a translation textarea.";
                this.incorrectLanguageTag =
                    "Incorrect language tag. Tag must correspond to BCP-47, for example en or en-US";
                this.gameFilesDoNotExist =
                    "Game files do not exist (no original or data directories), so it's only possible to edit and save translation.";
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
                this.disableMapProcessingOption = "Disable maps processing";
                this.disableOtherProcessingOption = "Disable other processing";
                this.disableSystemProcessingOption =
                    "Disable system processing";
                this.disablePluginProcessingOption =
                    "Disable plugins/scripts processing";
                this.dontAskAgain =
                    "Don't ask again (you can open this window again by right-clicking write button)";
                this.writeButtonText = "Write";
                this.duplicateMode = "Duplicate mode";
                this.removeMode = "Remove duplicates";
                this.allowMode = "Allow duplicates";
                this.ignore = "Ignore entries from .rvpacker-ignore file";
                this.readButtonText = "Read";
                this.readingInAppendMode = "Reading in append mode";
                this.readingInForceMode = "Reading in force rewrite mode";
                this.readModeUnselected = "Read mode is not selected.";
                this.mode = "Read mode:";
                this.chooseReadMode = "Read mode";
                this.defaultReadMode = "Default";
                this.appendReadMode = "Append";
                this.forceReadMode = "Force rewrite";
                this.appendModeDescription =
                    "In case, when the game text you've parsed updates, or the GUI update, it makes sense to re-read files in this mode, to append new text to existing translation without overwriting the progress. Before reading ensure you've saved the translation!";
                this.forceModeDescription =
                    "Forcefully rewrites translation files. Use, only if you need to completely re-read files using certain settings.";
                this.createIgnoreCheck =
                    "Create .rvpacker-ignore file from purged lines to prevent their further appearance";
                this.purgeButtonText = "Purge";
                this.trim =
                    "Remove the leading and trailing whitespace from extracted strings. Could lead to non-working or incorrect text writing.";
                this.chooseFileOption = "-Choose a file-";
                this.selectBatchAction = "-Select action-";
                this.selectTranslationColumn = "-Select column-";
                this.searchColumnSelectLabel = "Select column for search";
                this.rightmostFilledOptionLabel = "Rightmost filled";
                break;
        }
    }
}

export class SettingsWindowLocalization {
    public readonly backupPeriodLabel: string;
    public readonly backupPeriodNote: string;
    public readonly backupMaxLabel: string;
    public readonly backupMaxNote: string;
    public readonly backup: string;
    public readonly font: string;
    public readonly defaultFont: string;
    public readonly translationLanguages: string;
    public readonly confirmation: string;
    public readonly disabled: string;
    public readonly allowed: string;
    public readonly delete: string;
    public readonly displayGhostLines: string;
    public readonly checkForUpdates: string;

    public constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.backupPeriodLabel = "Создавать резервные копии каждые:";
                this.backupPeriodNote = "секунд (минимум 60, максимум 3600)";
                this.backupMaxLabel =
                    "Максимальное количество резервных копий:";
                this.backupMaxNote = "(минимум 1, максимум 99)";
                this.backup = "Резервное копирование";
                this.font = "Шрифт";
                this.defaultFont = "Стандартный";
                this.translationLanguages =
                    "Языки перевода (для машинного перевода)";
                this.delete = "Режим удаления рядов";
                this.disabled = "Выключить";
                this.confirmation = "Спрашивать";
                this.allowed = "Разрешить";
                this.displayGhostLines =
                    "Отображать переносы строк в текстовых полях";
                this.checkForUpdates = "Проверять наличие обновлений";
                break;
            case Language.English:
            default:
                this.backupPeriodLabel = "Create backup every:";
                this.backupPeriodNote = "seconds (min 60, max 3600)";
                this.backupMaxLabel = "Max number of backups:";
                this.backupMaxNote = "(min 1, max 99)";
                this.backup = "Backup";
                this.font = "Font";
                this.defaultFont = "Default";
                this.translationLanguages =
                    "Translation languages (for machine translation)";
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
    public readonly version: string;
    public readonly contacts: string;
    public readonly vkLink: string;
    public readonly tgLink: string;
    public readonly repoLink: string;
    public readonly license: string;

    public constructor(language: Language) {
        switch (language) {
            case Language.Russian:
                this.version = "Версия";
                this.contacts = "Контакты:";
                this.vkLink = "ВК";
                this.tgLink = "Телеграм";
                this.repoLink = "Репозиторий программы";
                this.license = "Лицензия";
                break;
            case Language.English:
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

export type Localization =
    | MainWindowLocalization
    | AboutWindowLocalization
    | SettingsWindowLocalization;
