import { emittery } from "@classes/emittery";
import {
    ProjectSettings,
    ProjectSettingsOptions,
    Settings,
} from "@classes/index";
import {
    AppEvent,
    DuplicateMode,
    FileFlags,
    JumpDirection,
    Language,
    ReadMode,
    SearchAction,
    SearchFlags,
} from "@enums/index";
import {
    applyTheme,
    initializeLocalization,
    join,
    logErrorIO,
    objectIsEmpty,
    retranslate,
    rowNumber,
} from "@utils/functions";
import {
    expandScope,
    extractArchive,
    purge,
    read,
    translate,
    write,
} from "@utils/invokes";
import {
    BatchMenu,
    BookmarkMenu,
    FileMenu,
    GoToRowInput,
    HelpMenu,
    LanguageMenu,
    MenuBar,
    PurgeMenu,
    ReadMenu,
    Replacer,
    Saver,
    ScrollBar,
    Searcher,
    SearchMenu,
    SearchPanel,
    TabContent,
    TabContentHeader,
    TabPanel,
    ThemeEditMenu,
    ThemeMenu,
    UtilsPanel,
    WriteMenu,
} from "./components/index";

import * as consts from "@utils/constants";
import * as _ from "radashi";

import { t } from "@lingui/core/macro";

import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { resolveResource } from "@tauri-apps/api/path";
import {
    getCurrentWebviewWindow,
    WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { ask, message, open } from "@tauri-apps/plugin-dialog";
import {
    copyFile,
    exists,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { attachConsole, error } from "@tauri-apps/plugin-log";

export class MainWindow {
    #changeTabTimer = -1;

    readonly #tabInfo: TabInfo = {
        tabName: "",
        tabs: {},
    };

    #settings: Settings;
    #projectSettings: ProjectSettings;
    #replacementLog: ReplacementLog;
    #themes: Themes;

    readonly #appWindow = getCurrentWebviewWindow();

    readonly #tabPanel: TabPanel;
    readonly #searcher: Searcher;
    readonly #replacer: Replacer;
    readonly #saver: Saver;
    readonly #searchPanel: SearchPanel;
    readonly #utilsPanel: UtilsPanel;
    readonly #searchMenu: SearchMenu;
    readonly #batchMenu: BatchMenu;
    readonly #readMenu: ReadMenu;
    readonly #themeMenu: ThemeMenu;
    readonly #themeEditMenu: ThemeEditMenu;
    readonly #writeMenu: WriteMenu;
    readonly #purgeMenu: PurgeMenu;
    readonly #bookmarkMenu: BookmarkMenu;
    readonly #tabContent: TabContent;
    readonly #tabContentHeader: TabContentHeader;
    readonly #goToRowInput: GoToRowInput;
    readonly #menuBar: MenuBar;
    readonly #scrollBar: ScrollBar;
    readonly #fileMenu: FileMenu;
    readonly #helpMenu: HelpMenu;
    readonly #languageMenu: LanguageMenu;

    public constructor() {
        this.#settings = new Settings();
        this.#themes = {};
        this.#projectSettings = new ProjectSettings();
        this.#replacementLog = {};

        this.#tabPanel = new TabPanel();

        this.#utilsPanel = new UtilsPanel();
        this.#batchMenu = new BatchMenu();
        this.#readMenu = new ReadMenu();
        this.#themeMenu = new ThemeMenu();
        this.#themeEditMenu = new ThemeEditMenu();
        this.#writeMenu = new WriteMenu();
        this.#purgeMenu = new PurgeMenu();
        this.#bookmarkMenu = new BookmarkMenu();

        this.#menuBar = new MenuBar();
        this.#fileMenu = new FileMenu();
        this.#helpMenu = new HelpMenu();
        this.#languageMenu = new LanguageMenu();

        this.#tabContent = new TabContent();
        this.#tabContentHeader = new TabContentHeader();

        this.#goToRowInput = new GoToRowInput();

        this.#scrollBar = new ScrollBar(
            this.#tabContent,
            this.#tabContentHeader,
        );

        this.#saver = new Saver();
        this.#searcher = new Searcher();
        this.#replacer = new Replacer();

        this.#searchMenu = new SearchMenu();

        this.#searchPanel = new SearchPanel();
    }

    public async init(): Promise<void> {
        await attachConsole();
        this.#attachListeners();

        await this.#settings.init();
        await this.#initThemes();
        await this.#initFont();
        await this.#retranslate(this.#settings.language);
        await this.#appWindow.setZoom(this.#settings.zoom);

        if (this.#settings.backup.enabled) {
            this.#saver.setupBackup(
                this.#settings.backup.max,
                this.#settings.backup.period,
            );
        }

        applyTheme(this.#themes, this.#settings.theme);
        this.#themeMenu.init(this.#themes);

        if (this.#settings.projectPath) {
            await this.#openProject(this.#settings.projectPath, false);
        } else {
            this.#tabContent.textContent = t`No project selected. Select the project directory, using 'open folder' button in the left-top corner.`;
        }
    }

    async #initFont(): Promise<void> {
        if (!this.#settings.font) {
            for (const element of document.querySelectorAll<HTMLElement>(
                ".font",
            )) {
                element.style.fontFamily = "";
            }

            return;
        }

        await expandScope(this.#settings.font);

        const font = await new FontFace(
            "font",
            `url(${convertFileSrc(this.#settings.font)})`,
        ).load();
        document.fonts.add(font);

        for (const element of document.querySelectorAll<HTMLElement>(".font")) {
            element.style.fontFamily = "font";
        }
    }

    async #reload(): Promise<void> {
        if (await this.#confirmExit()) {
            await this.#exitCleanup();
            location.reload();
        }
    }

    async #retranslate(language: Language): Promise<void> {
        this.#settings.language = language;
        await initializeLocalization("Main", language);
        retranslate();
    }

    async #openProject(
        projectPath: string,
        openingNew: boolean,
    ): Promise<void> {
        await expandScope(projectPath);

        const rootTranslationPath = join(
            projectPath,
            consts.TRANSLATION_DIRECTORY,
        );

        if (
            !projectPath ||
            !(await this.#isProjectValid(projectPath, rootTranslationPath))
        ) {
            return;
        }

        if (openingNew) {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
            await this.#exitCleanup();
            await this.#changeTab(null);
            this.#tabPanel.clear();
        }

        this.#tabContent.innerHTML = t`Loading project`;

        this.#settings.projectPath = projectPath;
        await this.#projectSettings.setProjectPath(projectPath);

        this.#replacementLog = await this.#loadReplacementLog();

        if (!(await exists(this.#projectSettings.translationPath))) {
            if (await exists(rootTranslationPath)) {
                await this.#copyTranslationFromRoot(rootTranslationPath);
            } else {
                await this.#invokeRead(
                    ReadMode.Default,
                    FileFlags.All,
                    DuplicateMode.Allow,
                    false,
                    false,
                    false,
                    false,
                );
            }
        }

        if (this.#settings.firstLaunch) {
            // eslint-disable-next-line sonarjs/constructor-for-side-effects
            new WebviewWindow("help", {
                url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                title: t`Help`,
                center: true,
            });
            this.#settings.firstLaunch = false;
        }

        await this.#tabPanel.init(this.#projectSettings);
        await this.#utilsPanel.init(this.#projectSettings);
        this.#batchMenu.init(
            this.#tabInfo,
            this.#projectSettings,
            this.#tabPanel.tabs,
        );
        this.#searchMenu.init(this.#projectSettings.translationColumns);
        this.#readMenu.init(this.#projectSettings);
        this.#searchPanel.init(
            this.#tabInfo,
            this.#tabContent,
            this.#projectSettings,
            this.#replacementLog,
        );
        this.#writeMenu.init(this.#projectSettings.programDataPath);
        this.#tabContentHeader.init(this.#projectSettings);
        this.#tabContent.init(this.#settings, this.#projectSettings);
        this.#saver.init(this.#projectSettings, this.#utilsPanel.sourceTitle);
        this.#searcher.init(this.#projectSettings);
        this.#replacer.init(this.#projectSettings);

        this.#tabContent.innerHTML = "";
        this.#updateProgressMeter();
    }

    async #changeTab(filename: string | null): Promise<void> {
        if (this.#tabInfo.tabName === filename || this.#changeTabTimer !== -1) {
            return;
        }

        if (filename !== null && !(filename in this.#tabInfo.tabs)) {
            return;
        }

        await this.#saver.awaitSave();

        if (this.#tabInfo.tabName) {
            await this.#saver.saveSingle(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
            const activeTab = this.#tabPanel.tab(
                this.#tabInfo.tabs[this.#tabInfo.tabName].index,
            );
            activeTab.classList.replace("bg-third", "bg-primary");
        }

        this.#tabContent.innerHTML = "";

        if (filename === null) {
            this.#tabContentHeader.hide();
            this.#tabInfo.tabName = this.#utilsPanel.tabName = "";
        } else {
            this.#utilsPanel.tabName = this.#tabInfo.tabName = filename;

            const activeTab = this.#tabPanel.tab(
                this.#tabInfo.tabs[filename].index,
            );
            activeTab.classList.replace("bg-primary", "bg-third");

            await this.#tabContent.fill(
                filename,
                this.#projectSettings.translationColumnCount,
            );
            this.#tabContentHeader.show();
        }

        this.#changeTabTimer = window.setTimeout(() => {
            this.#changeTabTimer = -1;
            // eslint-disable-next-line no-magic-numbers
        }, consts.SECOND_MS / 10);

        this.#tabContent.clearTextAreaHistory();
    }

    async #handleHotkey(event: KeyboardEvent): Promise<void> {
        if (event.ctrlKey) {
            switch (event.code) {
                case "Equal":
                    if (this.#settings.zoom < consts.MAX_ZOOM) {
                        this.#settings.zoom += consts.ZOOM_STEP;
                        await this.#appWindow.setZoom(this.#settings.zoom);
                    }
                    break;
                case "Minus":
                    if (this.#settings.zoom > consts.MIN_ZOOM) {
                        this.#settings.zoom -= consts.ZOOM_STEP;
                        await this.#appWindow.setZoom(this.#settings.zoom);
                    }
                    break;
                case "KeyS":
                    await this.#saver.saveAll(
                        this.#tabInfo.tabName,
                        this.#tabContent.children,
                    );
                    break;
                case "KeyB":
                    if (this.#bookmarkMenu.hidden) {
                        this.#bookmarkMenu.show(
                            this.#utilsPanel.bookmarksButton.offsetLeft,
                            this.#utilsPanel.bookmarksButton.offsetTop +
                                this.#utilsPanel.bookmarksButton.clientHeight,
                        );
                    } else {
                        this.#bookmarkMenu.hide();
                    }
                    break;
                case "KeyF":
                    event.preventDefault();

                    if (this.#searchMenu.hidden) {
                        this.#searchMenu.show(
                            this.#utilsPanel.saveButton.offsetLeft,
                            this.#utilsPanel.saveButton.offsetTop +
                                this.#utilsPanel.saveButton.clientHeight,
                        );
                        this.#searchMenu.focus();
                    } else {
                        this.#searchMenu.hide();
                    }
                    break;
                case "KeyG":
                    event.preventDefault();

                    if (this.#tabInfo.tabName) {
                        if (this.#goToRowInput.hidden) {
                            this.#goToRowInput.show();
                            this.#goToRowInput.focus();

                            const lastRowContainer = this.#tabContent.lastRow;
                            const lastRowNumber = rowNumber(lastRowContainer);
                            this.#goToRowInput.placeholder = t`Go to row... from 1 to ${lastRowNumber}`;
                        } else {
                            this.#goToRowInput.hide();
                        }
                    }
                    break;
            }
        } else if (event.altKey) {
            switch (event.code) {
                case "F4":
                    await this.#appWindow.close();
                    break;
                case "KeyC":
                    await this.#invokeWrite(FileFlags.All);
                    break;
            }
        } else {
            switch (event.code) {
                case "KeyR":
                    // Prevent reloading
                    event.preventDefault();

                    if (this.#searchPanel.hidden) {
                        this.#searchPanel.show();
                    } else {
                        this.#searchPanel.hide();
                    }
                    break;
                case "Tab":
                    event.preventDefault();

                    if (this.#tabPanel.hidden) {
                        this.#tabPanel.show();
                    } else {
                        this.#tabPanel.hide();
                    }
                    break;
                case "Escape":
                    await this.#changeTab(null);
                    break;
            }
        }
    }

    async #invokeWrite(fileFlags: FileFlags): Promise<void> {
        if (!this.#settings.projectPath) {
            alert(
                t`Game files do not exist (no original/data/Data directory), so it's only possible to edit and save translation.`,
            );
            return;
        }

        this.#utilsPanel.toggleWriteAnimation();

        await write({
            sourcePath: this.#projectSettings.sourcePath,
            translationPath: this.#projectSettings.translationPath,
            outputPath: this.#projectSettings.outputPath,
            engineType: this.#projectSettings.engineType,
            duplicateMode: this.#projectSettings.duplicateMode,
            gameTitle: this.#utilsPanel.translationTitle,
            romanize: this.#projectSettings.romanize,
            disableCustomProcessing:
                this.#projectSettings.disableCustomProcessing,
            fileFlags,
            trim: this.#projectSettings.trim,
        })
            .then((executionTime) => {
                this.#utilsPanel.toggleWriteAnimation();

                alert(
                    t`All files were written successfully.\nElapsed: ${executionTime}`,
                );
            })
            .catch(error);
    }

    async #exitCleanup(): Promise<void> {
        await writeTextFile(
            consts.SETTINGS_PATH,
            JSON.stringify(this.#settings),
            {
                baseDir: consts.RESOURCE_DIRECTORY,
            },
        ).catch((err) => {
            logErrorIO(consts.SETTINGS_PATH, err);
        });

        if (!this.#settings.projectPath) {
            return;
        }

        await readDir(this.#projectSettings.programDataPath)
            .then(async (entries) => {
                for (const entry of entries) {
                    const name = entry.name;

                    if (
                        entry.isFile &&
                        ![
                            consts.PROJECT_SETTINGS_FILE,
                            consts.LOG_FILE,
                        ].includes(name)
                    ) {
                        await removePath(
                            join(this.#projectSettings.programDataPath, name),
                        );
                    }
                }
            })
            .catch((err) => {
                logErrorIO(this.#projectSettings.programDataPath, err);
            });

        await removePath(this.#projectSettings.tempMapsPath, {
            recursive: true,
        });

        await writeTextFile(
            this.#projectSettings.logPath,
            JSON.stringify(this.#replacementLog),
        ).catch((err) => {
            logErrorIO(this.#projectSettings.logPath, err);
        });

        this.#projectSettings.translationLanguages = {
            source: this.#utilsPanel.sourceLanguage,
            translation: this.#utilsPanel.translationLanguage,
        };

        await writeTextFile(
            this.#projectSettings.projectSettingsPath,
            JSON.stringify(this.#projectSettings),
        ).catch((err) => {
            logErrorIO(this.#projectSettings.projectSettingsPath, err);
        });
    }

    async #loadReplacementLog(): Promise<ReplacementLog> {
        return await readTextFile(this.#projectSettings.logPath)
            .then((value) => {
                return JSON.parse(value) as ReplacementLog;
            })
            .catch(() => {
                return {};
            });
    }

    async #confirmExit(): Promise<boolean> {
        if (this.#saver.saved) {
            return true;
        }

        const exitWithSave = await ask(
            t`You have unsaved changes. Save progress and quit?`,
        );

        if (exitWithSave) {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
            return true;
        } else {
            const exitUnsaved = await ask(t`Quit without saving?`);
            return exitUnsaved;
        }
    }

    async #isProjectValid(
        projectPath: string,
        rootTranslationPath: string,
    ): Promise<boolean> {
        if (!(await exists(projectPath))) {
            await message(
                t`Selected directory is missing. Project won't be initialized.`,
            );
            return false;
        }

        const translationExists = await this.#checkTranslationPath(
            projectPath,
            rootTranslationPath,
        );

        let sourceDirectoryFound =
            await this.#projectSettings.findSourceDirectory(projectPath);

        if (!sourceDirectoryFound) {
            const extracted = await extractArchive(projectPath);

            if (extracted) {
                sourceDirectoryFound =
                    await this.#projectSettings.findSourceDirectory(
                        projectPath,
                    );
            } else if (!translationExists) {
                await message(
                    t`Selected directory does not contain original/data/Data directory, .rgss archive or translation directory. Project won't be initialized.`,
                );
                return false;
            }
        }

        if (sourceDirectoryFound) {
            const engineTypeFound =
                await this.#projectSettings.setEngineType(projectPath);

            if (!engineTypeFound) {
                await message(
                    t`Cannot determine the type of the game's engine.`,
                );

                return false;
            }
        } else {
            this.#projectSettings.sourceDirectory = "";
        }

        return true;
    }

    async #checkTranslationPath(
        projectPath: string,
        rootTranslationPath: string,
    ): Promise<boolean> {
        const projectSettingsPath = join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
            consts.PROJECT_SETTINGS_FILE,
        );

        return await readTextFile(projectSettingsPath)
            .then(async (settings) => {
                // TODO: move this assignment from here
                this.#projectSettings = new ProjectSettings(
                    JSON.parse(settings) as ProjectSettingsOptions,
                );
                return await exists(this.#projectSettings.translationPath);
            })
            .catch(async () => {
                return await exists(rootTranslationPath);
            });
    }

    async #copyTranslationFromRoot(translationPath: string): Promise<void> {
        const ok = await mkdir(this.#projectSettings.translationPath, {
            recursive: true,
        }).catch((err) => {
            logErrorIO(this.#projectSettings.translationPath, err);
            return false;
        });

        if (ok === false) {
            return;
        }

        const translationEntries = await readDir(translationPath).catch(
            (err) => {
                logErrorIO(this.#projectSettings.translationPath, err);
            },
        );

        if (!translationEntries) {
            return;
        }

        for (const entry of translationEntries) {
            await copyFile(
                join(translationPath, entry.name),
                join(this.#projectSettings.translationPath, entry.name),
            );
        }

        const metadataPath = join(
            translationPath,
            consts.RVPACKER_METADATA_FILE,
        );

        await readTextFile(metadataPath)
            .then((value) => {
                if (!value) {
                    return;
                }

                const metadata = JSON.parse(value) as {
                    duplicateMode: DuplicateMode;
                    romanize: boolean;
                    disableCustomProcessing: boolean;
                    trim: boolean;
                };

                Object.assign(this.#projectSettings, metadata);
            })
            .catch((err) => {
                logErrorIO(metadataPath, err);
            });
    }

    async #initThemes(): Promise<void> {
        const themes = JSON.parse(
            await readTextFile(await resolveResource("resources/themes.json")),
        ) as Themes;
        this.#themes = themes;
    }

    #updateProgressMeter(): void {
        this.#utilsPanel.updateProgressMeter(this.#tabInfo);
    }

    #attachListeners(): void {
        emittery.on(AppEvent.ShowHelpWindow, () => {
            // eslint-disable-next-line sonarjs/constructor-for-side-effects
            new WebviewWindow("help", {
                url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                title: t`Help`,
                center: true,
            });
        });

        emittery.on(AppEvent.ShowAboutWindow, async () => {
            const aboutWindow = new WebviewWindow("about", {
                url: "windows/about/AboutWindow.html",
                title: t`About`,
                center: true,
                resizable: false,
            });

            await aboutWindow.once("tauri://webview-created", async () => {
                await _.sleep(consts.SECOND_MS / 2);
                await aboutWindow.emit("settings", [
                    this.#settings,
                    this.#themes,
                    this.#projectSettings,
                ]);
            });
        });

        emittery.on(AppEvent.MenuBarButtonClick, (button) => {
            switch (button) {
                case this.#menuBar.fileMenuButton:
                    if (this.#fileMenu.hidden) {
                        this.#fileMenu.show(
                            this.#menuBar.fileMenuButton.offsetLeft,
                            this.#menuBar.fileMenuButton.offsetTop +
                                this.#menuBar.fileMenuButton.offsetHeight,
                        );
                    } else {
                        this.#fileMenu.hide();
                    }
                    break;
                case this.#menuBar.helpMenuButton:
                    if (this.#helpMenu.hidden) {
                        this.#helpMenu.show(
                            this.#menuBar.helpMenuButton.offsetLeft,
                            this.#menuBar.helpMenuButton.offsetTop +
                                this.#menuBar.helpMenuButton.offsetHeight,
                        );
                    } else {
                        this.#helpMenu.hide();
                    }
                    break;
                case this.#menuBar.languageMenuButton:
                    if (this.#languageMenu.hidden) {
                        this.#languageMenu.show(
                            this.#menuBar.languageMenuButton.offsetLeft,
                            this.#menuBar.languageMenuButton.offsetTop +
                                this.#menuBar.languageMenuButton.offsetHeight,
                        );
                    } else {
                        this.#languageMenu.hide();
                    }
                    break;
            }
        });

        emittery.on(AppEvent.AddLog, ([filename, source, data]) => {
            if (!(filename in this.#replacementLog)) {
                this.#replacementLog[filename] = {};
                this.#searchPanel.addLog(filename);
            }

            this.#replacementLog[filename][source] = data;
        });

        emittery.on(AppEvent.LogEntryReverted, ([filename, source]) => {
            delete this.#replacementLog[filename][source];

            if (objectIsEmpty(this.#replacementLog[filename])) {
                delete this.#replacementLog[filename];
                this.#searchPanel.removeLog(filename);
            }
        });

        emittery.on(
            AppEvent.TranslateTextArea,
            async ([sourceText, textarea]) => {
                if (textarea.value) {
                    return;
                }

                if (textarea.placeholder) {
                    textarea.value = textarea.placeholder;
                    textarea.placeholder = "";
                    return;
                }

                if (
                    sourceText.startsWith(
                        consts.MAP_DISPLAY_NAME_COMMENT_PREFIX,
                    )
                ) {
                    sourceText = sourceText.slice(
                        consts.MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                        -consts.COMMENT_SUFFIX_LENGTH,
                    );
                }

                const translation =
                    (await translate({
                        text: sourceText,
                        to: this.#utilsPanel.translationLanguage,
                        from: this.#utilsPanel.sourceLanguage,
                        normalize: false,
                    })) ?? "";

                if (translation) {
                    textarea.placeholder = translation;
                }
            },
        );

        emittery.on(AppEvent.ScrollIntoRow, (row) => {
            this.#tabContent.children[row].scrollIntoView({
                inline: "center",
                block: "center",
            });
        });

        emittery.on(
            AppEvent.TabAdded,
            ([filename, index, total, translated]) => {
                this.#tabInfo.tabs[filename] = {
                    index,
                    sourceLineCount: total,
                    translatedLineCount: translated,
                };
            },
        );

        emittery.on(AppEvent.AddTheme, ([name, theme]) => {
            this.#themes[name] = theme;
            this.#themeMenu.addTheme(name);
        });

        emittery.on(AppEvent.ShowThemeEditMenu, () => {
            this.#themeEditMenu.show();
        });

        emittery.on(AppEvent.InvokeWrite, async (fileFlags) => {
            await this.#invokeWrite(fileFlags);
        });

        emittery.on(AppEvent.ChangeTab, async (filename) => {
            await this.#changeTab(filename);
        });

        emittery.on(AppEvent.ColumnResized, ([columnIndex, width]) => {
            for (const rowContainer of this.#tabContent.children) {
                const element = rowContainer.children[columnIndex];
                element.style.minWidth = element.style.width = `${width}px`;
            }
        });

        emittery.on(AppEvent.JumpToTab, async (direction) => {
            if (!this.#tabInfo.tabName) {
                return;
            }

            if (direction === JumpDirection.Down) {
                const newTabIndex =
                    this.#tabInfo.tabs[this.#tabInfo.tabName].index + 1;

                if (newTabIndex <= this.#tabPanel.tabCount - 1) {
                    const tab = this.#tabPanel.tab(
                        this.#tabInfo.tabs[this.#tabInfo.tabName].index,
                    );
                    await this.#changeTab(tab.firstElementChild!.textContent);
                }
            } else {
                const newTabIndex =
                    this.#tabInfo.tabs[this.#tabInfo.tabName].index - 1;

                if (newTabIndex > 0) {
                    const tab = this.#tabPanel.tab(
                        this.#tabInfo.tabs[this.#tabInfo.tabName].index,
                    );
                    await this.#changeTab(tab.firstElementChild!.textContent);
                }
            }
        });

        emittery.on(AppEvent.UpdateSourceLineCount, ([number, tabName]) => {
            this.#tabInfo.tabs[
                tabName ?? this.#tabInfo.tabName
            ].sourceLineCount += number;
        });

        emittery.on(AppEvent.UpdateTranslatedLineCount, ([number, tabName]) => {
            tabName ??= this.#tabInfo.tabName;

            const tabEntry = this.#tabInfo.tabs[tabName];
            tabEntry.translatedLineCount += number ?? tabEntry.sourceLineCount;

            const percentage = Math.floor(
                (tabEntry.translatedLineCount / tabEntry.sourceLineCount) *
                    consts.PERCENT_MULTIPLIER,
            );

            this.#tabPanel.updateTabProgress(
                this.#tabInfo.tabs[tabName].index,
                percentage,
            );
            this.#updateProgressMeter();
        });

        emittery.on(AppEvent.ColumnRenamed, ([columnIndex, columnName]) => {
            this.#projectSettings.translationColumns[columnIndex][0] =
                columnName;
            this.#searchMenu.updateColumn(columnIndex, columnName);
            this.#batchMenu.updateColumn(columnIndex, columnName);
        });

        emittery.on(AppEvent.ColumnAdded, () => {
            this.#projectSettings.addColumn();

            for (const rowContainer of this.#tabContent.children) {
                this.#tabContent.addTextAreaCell(
                    rowContainer,
                    "",
                    Number.parseInt(rowContainer.style.minHeight),
                    consts.DEFAULT_COLUMN_WIDTH,
                );
            }

            this.#searchMenu.updateColumn(
                this.#projectSettings.translationColumnCount - 1,
                t`Translation`,
            );
            this.#batchMenu.updateColumn(
                this.#projectSettings.translationColumnCount - 1,
                t`Translation`,
            );
            this.#scrollBar.width = this.#tabContent.scrollWidth;
        });

        emittery.on(AppEvent.RemoveBookmark, (rowNumber) => {
            this.#bookmarkMenu.deleteBookmark(this.#tabInfo.tabName, rowNumber);
        });

        emittery.on(AppEvent.Reload, async () => {
            await this.#reload();
        });

        emittery.on(AppEvent.UpdateSaved, (saved) => {
            this.#saver.saved = saved;
        });

        emittery.on(AppEvent.Retranslate, async (language) => {
            await this.#retranslate(language);
        });

        emittery.on(AppEvent.SaveAll, async () => {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
        });

        emittery.on(AppEvent.InvokePurge, async ([fileFlags, createIgnore]) => {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
            this.#utilsPanel.togglePurgeAnimation();

            await purge({
                sourcePath: this.#projectSettings.sourcePath,
                translationPath: this.#projectSettings.translationPath,
                engineType: this.#projectSettings.engineType,
                duplicateMode: this.#projectSettings.duplicateMode,
                gameTitle: this.#utilsPanel.sourceTitle,
                romanize: this.#projectSettings.romanize,
                disableCustomProcessing:
                    this.#projectSettings.disableCustomProcessing,
                fileFlags,
                createIgnore,
                trim: this.#projectSettings.trim,
            });

            await this.#reload();
        });

        emittery.on(
            AppEvent.UtilsButtonClick,
            async (button): Promise<void> => {
                if (
                    !this.#settings.projectPath &&
                    button !== this.#utilsPanel.openDirectoryButton
                ) {
                    return;
                }

                switch (button) {
                    case this.#utilsPanel.tabPanelButton:
                        if (this.#tabPanel.hidden) {
                            this.#tabPanel.show();
                        } else {
                            this.#tabPanel.hide();
                        }
                        break;
                    case this.#utilsPanel.saveButton:
                        await this.#saver.saveAll(
                            this.#tabInfo.tabName,
                            this.#tabContent.children,
                        );
                        break;
                    case this.#utilsPanel.writeButton: {
                        if (this.#writeMenu.hidden) {
                            this.#writeMenu.show(
                                this.#utilsPanel.writeButton.offsetLeft,
                                this.#utilsPanel.writeButton.offsetTop +
                                    this.#utilsPanel.writeButton.clientHeight,
                            );
                        } else {
                            this.#writeMenu.hide();
                        }
                        break;
                    }
                    case this.#utilsPanel.openDirectoryButton: {
                        const directory =
                            (await open({
                                directory: true,
                                multiple: false,
                            })) ?? "";

                        if (!directory) {
                            return;
                        }

                        if (directory === this.#settings.projectPath) {
                            await message(
                                t`Selected directory is already opened in the program.`,
                            );
                            return;
                        }

                        await this.#openProject(
                            directory,
                            Boolean(this.#settings.projectPath),
                        );
                        break;
                    }
                    case this.#utilsPanel.settingsButton: {
                        const settingsWindow = new WebviewWindow("settings", {
                            url: "windows/settings/SettingsWindow.html",
                            title: t`Settings`,
                            center: true,
                            resizable: false,
                        });

                        await settingsWindow.once(
                            "tauri://webview-created",
                            async () => {
                                await _.sleep(consts.SECOND_MS / 2);
                                await settingsWindow.emit("settings", [
                                    this.#settings,
                                    this.#themes,
                                    this.#projectSettings,
                                ]);
                            },
                        );

                        break;
                    }
                    case this.#utilsPanel.themeButton:
                        if (this.#themeMenu.hidden) {
                            this.#themeMenu.show(
                                this.#utilsPanel.themeButton.offsetLeft,
                                this.#utilsPanel.themeButton.offsetTop +
                                    this.#utilsPanel.themeButton.clientHeight,
                            );
                        } else {
                            this.#themeMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.bookmarksButton:
                        if (this.#bookmarkMenu.hidden) {
                            this.#bookmarkMenu.show(
                                this.#utilsPanel.bookmarksButton.offsetLeft,
                                this.#utilsPanel.bookmarksButton.offsetTop +
                                    this.#utilsPanel.bookmarksButton
                                        .clientHeight,
                            );
                        } else {
                            this.#bookmarkMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.readButton: {
                        if (!this.#projectSettings.sourceDirectory) {
                            alert(
                                t`Game files do not exist (no original/data/Data directory), so it's only possible to edit and save translation.`,
                            );
                            return;
                        }

                        if (this.#readMenu.hidden) {
                            this.#readMenu.show(
                                this.#utilsPanel.readButton.offsetLeft,
                                this.#utilsPanel.readButton.offsetTop +
                                    this.#utilsPanel.readButton.clientHeight,
                            );
                        } else {
                            this.#readMenu.hide();
                        }
                        break;
                    }
                    case this.#utilsPanel.searchButton:
                        if (this.#searchMenu.hidden) {
                            this.#searchMenu.show(
                                this.#utilsPanel.searchButton.offsetLeft,
                                this.#utilsPanel.searchButton.offsetTop +
                                    this.#utilsPanel.searchButton.clientHeight,
                            );
                        } else {
                            this.#searchMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.batchButton:
                        if (this.#batchMenu.hidden) {
                            this.#batchMenu.show(
                                this.#utilsPanel.batchButton.offsetLeft,
                                this.#utilsPanel.batchButton.offsetTop +
                                    this.#utilsPanel.batchButton.clientHeight,
                            );
                        } else {
                            this.#batchMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.purgeButton: {
                        if (!this.#projectSettings.sourceDirectory) {
                            alert(
                                t`Game files do not exist (no original/data/Data directory), so it's only possible to edit and save translation.`,
                            );
                            return;
                        }

                        if (this.#purgeMenu.hidden) {
                            this.#purgeMenu.show(
                                this.#utilsPanel.purgeButton.offsetLeft,
                                this.#utilsPanel.purgeButton.offsetTop +
                                    this.#utilsPanel.purgeButton.clientHeight,
                            );
                        } else {
                            this.#purgeMenu.hide();
                        }
                        break;
                    }
                }

                await this.#appWindow.onCloseRequested(async (event) => {
                    if (
                        !this.#settings.projectPath ||
                        (await this.#confirmExit())
                    ) {
                        await this.#exitCleanup();
                    } else {
                        event.preventDefault();
                    }
                });
            },
        );

        emittery.on(AppEvent.InvokeRead, async (args) => {
            await this.#invokeRead(...args);
        });

        emittery.on(AppEvent.ApplyTheme, (theme) => {
            applyTheme(this.#themes, theme);
        });

        emittery.on(
            AppEvent.ReplaceSingle,
            async ([
                resultElement,
                filename,
                entry,
                columnIndex,
                rowIndex,
                searchAction,
            ]) => {
                const searchText = this.#searchMenu.searchText;

                if (!searchText.trim()) {
                    return;
                }

                const replacerText = this.#searchMenu.replaceText;

                const regexp = (await this.#searcher.createRegExp(
                    searchText,
                    searchAction,
                ))!;

                await this.#replacer.replaceSingle(
                    this.#tabContent.children,
                    this.#tabInfo.tabName,
                    regexp,
                    replacerText,
                    filename,
                    entry,
                    columnIndex,
                    rowIndex,
                    searchAction,
                );

                if (searchAction === SearchAction.Replace) {
                    for (const child of resultElement.firstElementChild!
                        .children) {
                        child.outerHTML = `<span class="bg-red-600">${replacerText}</span>`;
                    }
                } else {
                    resultElement.children[3].innerHTML = `<span class="bg-red-600">${replacerText}</span>`;
                }
            },
        );

        emittery.on(
            AppEvent.LanguageTags,
            ([sourceLanguage, translationLanguage]) => {
                this.#batchMenu.sourceLanguage = sourceLanguage;
                this.#batchMenu.translationLanguage = translationLanguage;
            },
        );

        emittery.on(
            AppEvent.ReplaceText,
            async ([
                predicate,
                replacerText,
                columnIndex,
                searchMode,
                searchAction,
            ]) => {
                const results = await this.#searcher.search(
                    this.#tabInfo.tabName,
                    this.#tabInfo.tabs,
                    this.#tabContent.children,
                    predicate,
                    columnIndex,
                    searchMode,
                    searchAction,
                );

                if (results.pages === 0) {
                    return;
                }

                await this.#replacer.replaceAll(
                    results,
                    this.#tabContent.children,
                    this.#tabInfo.tabName,
                    replacerText,
                    searchAction,
                );
            },
        );

        emittery.on(
            AppEvent.SearchText,
            async ([predicate, columnIndex, searchMode, searchAction]) => {
                const results = await this.#searcher.search(
                    this.#tabInfo.tabName,
                    this.#tabInfo.tabs,
                    this.#tabContent.children,
                    predicate,
                    columnIndex,
                    searchMode,
                    searchAction,
                );

                if (searchAction === SearchAction.Search) {
                    this.#searchPanel.updateResults(results.pages);
                    this.#searchPanel.show();
                }
            },
        );

        emittery.on(AppEvent.AddBookmark, ([name, description, rowNumber]) => {
            this.#bookmarkMenu.addBookmark(
                name ?? this.#tabInfo.tabName,
                description,
                rowNumber,
            );
        });

        emittery.on(AppEvent.AdditionalColumnRequired, () => {
            this.#projectSettings.addColumn();
            this.#scrollBar.width = this.#tabContent.scrollWidth;
        });

        emittery.on(AppEvent.ToggleSaveAnimation, () => {
            this.#utilsPanel.toggleSaveAnimation();
        });

        emittery.on(AppEvent.TogglePurgeAnimation, () => {
            this.#utilsPanel.togglePurgeAnimation();
        });

        emittery.on(AppEvent.TitleTranslationChanged, (translationTitle) => {
            this.#saver.translationTitle = translationTitle;
        });

        emittery.on(AppEvent.SearchFlagChanged, (flag: SearchFlags) => {
            this.#searcher.toggleFlag(flag);
        });

        document.addEventListener("keydown", (event) => {
            if (event.code === "Tab") {
                event.preventDefault();
            }
        });

        document.addEventListener("keyup", async (event) => {
            await this.#handleHotkey(event);
        });

        void listen<Settings>("get-settings", (settings) => {
            this.#settings = settings.payload;

            if (this.#settings.backup.enabled) {
                this.#saver.setupBackup(
                    this.#settings.backup.max,
                    this.#settings.backup.period,
                );
            } else {
                this.#saver.disableBackup();
            }

            this.#tabContent.init(this.#settings, this.#projectSettings);
        });
    }

    async #invokeRead(
        readMode: ReadMode,
        fileFlags: FileFlags,
        duplicateMode: DuplicateMode,
        romanize: boolean,
        disableCustomProcessing: boolean,
        trim: boolean,
        ignore: boolean,
    ): Promise<void> {
        this.#utilsPanel.toggleReadAnimation();

        if (readMode !== ReadMode.Append) {
            const metadata = {
                disableCustomProcessing,
                trim,
                duplicateMode,
                romanize,
            };

            Object.assign(this.#projectSettings, metadata);

            await writeTextFile(
                join(
                    this.#projectSettings.translationPath,
                    ".rvpacker-metadata",
                ),
                JSON.stringify(metadata),
            );
        } else {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#tabContent.children,
            );
        }

        await read({
            projectPath: this.#settings.projectPath,
            sourcePath: this.#projectSettings.sourcePath,
            translationPath: this.#projectSettings.translationPath,
            engineType: this.#projectSettings.engineType,
            readMode,
            duplicateMode,
            romanize,
            disableCustomProcessing,
            fileFlags,
            ignore,
            trim,
        });

        if (readMode === ReadMode.Force) {
            await this.#reload();
        }

        this.#utilsPanel.toggleReadAnimation();
    }
}

await new MainWindow().init();
