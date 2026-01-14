import { emittery } from "@classes/emittery";
import {
    ProjectSettings,
    ProjectSettingsOptions,
    Settings,
} from "@lib/classes";
import {
    AppEvent,
    BaseFlags,
    DuplicateMode,
    ElementToShow,
    FileFlags,
    JumpDirection,
    Language,
    MatchMode,
    ReadMode,
    RPGMFileType,
    SearchAction,
    TokenizerAlgorithm,
    TokenizerAlgorithmNames,
    TranslationEndpoint,
} from "@lib/enums";
import {
    applyTheme,
    initializeLocalization,
    join,
    objectIsEmpty,
    retranslate,
    rowNumber,
} from "@utils/functions";
import {
    expandScope,
    extractArchive,
    isErr,
    mkdir,
    purge,
    read,
    readDir,
    readFile,
    readTextFile,
    saveAPIKeys,
    write,
    writeTextFile,
} from "@utils/invokes";
import {
    BatchMenu,
    BookmarkMenu,
    GlossaryMenu,
    GoToRowInput,
    MatchMenu,
    PurgeMenu,
    ReadMenu,
    Replacer,
    Saver,
    Searcher,
    SearchMenu,
    SearchPanel,
    TabPanel,
    ThemeEditMenu,
    ThemeMenu,
    TranslationsMenu,
    TranslationTable,
    UtilsPanel,
    WriteMenu,
} from "./components";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import * as _ from "radashi";

import { t } from "@lingui/core/macro";

import { emit, listen } from "@tauri-apps/api/event";
import { Menu, MenuItem, Submenu } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import {
    getCurrentWebviewWindow,
    WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { ask, message, open } from "@tauri-apps/plugin-dialog";
import { copyFile, exists, remove as removePath } from "@tauri-apps/plugin-fs";
import { attachConsole, attachLogger, error } from "@tauri-apps/plugin-log";

const enum FontPlace {
    Tab,
    UI,
}

export class MainWindow {
    #changeTabTimer = -1;

    readonly #tabInfo: TabInfo = {
        tabName: "",
        tabs: {},
    };

    #settings: Settings;
    #projectSettings: ProjectSettings;
    #glossary: Glossary;
    #replacementLog: ReplacementLog;
    #themes: Themes;
    #menu: Menu | null;

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
    readonly #glossaryMenu: GlossaryMenu;
    readonly #matchMenu: MatchMenu;
    readonly #translationsMenu: TranslationsMenu;

    readonly #translationTable: TranslationTable;
    readonly #goToRowInput: GoToRowInput;
    readonly #debugOutput: HTMLDivElement = document.getElementById(
        "debug-output",
    ) as HTMLDivElement;

    #activeContextMenu: HTMLDivElement | null = null;

    #debugInputOpacity = 0;
    #debugInputInterval = -1;

    #pendingRead = false;

    public constructor() {
        this.#settings = new Settings();
        this.#themes = {};
        this.#projectSettings = new ProjectSettings();
        this.#glossary = [];
        this.#replacementLog = {};
        this.#menu = null;

        this.#tabPanel = new TabPanel();

        this.#utilsPanel = new UtilsPanel();
        this.#batchMenu = new BatchMenu();
        this.#readMenu = new ReadMenu();
        this.#themeMenu = new ThemeMenu();
        this.#themeEditMenu = new ThemeEditMenu();
        this.#writeMenu = new WriteMenu();
        this.#purgeMenu = new PurgeMenu();
        this.#bookmarkMenu = new BookmarkMenu();
        this.#glossaryMenu = new GlossaryMenu();
        this.#matchMenu = new MatchMenu();
        this.#translationsMenu = new TranslationsMenu();

        this.#translationTable = new TranslationTable();

        this.#goToRowInput = new GoToRowInput();

        this.#saver = new Saver();
        this.#searcher = new Searcher();
        this.#replacer = new Replacer();

        this.#searchMenu = new SearchMenu();

        this.#searchPanel = new SearchPanel();
    }

    public async init(): Promise<void> {
        await attachConsole();
        await attachLogger((e) => {
            this.#debugOutput.innerHTML = e.message;
            // eslint-disable-next-line no-magic-numbers
            this.#debugInputOpacity = 100;

            if (this.#debugInputInterval === -1) {
                this.#debugInputInterval = window.setInterval(
                    () => {
                        if (this.#debugInputOpacity === 0) {
                            clearInterval(this.#debugInputInterval);
                            this.#debugInputInterval = -1;
                        }

                        this.#debugOutput.style.opacity = `${this.#debugInputOpacity}%`;
                        this.#debugInputOpacity--;
                    },

                    // eslint-disable-next-line no-magic-numbers
                    10,
                );
            }
        });

        this.#attachListeners();

        let initialized = await this.#settings.new();

        if (!initialized) {
            void error("Failed to initialize settings");
        }

        initialized = await this.#initThemes();

        if (!initialized) {
            void error("Failed to initialize themes");
        }

        initialized = await this.#updateFonts();

        if (!initialized) {
            void error("Failed to initialize font");
        }

        await this.#retranslate(this.#settings.appearance.language);
        await this.#appWindow.setZoom(this.#settings.appearance.zoom);
        await this.#settings.checkForUpdates();

        const fileSubmenu = await Submenu.new({
            id: "File",
            text: t`File`,
            items: [
                await MenuItem.new({
                    id: "Exit",
                    text: t`Exit`,
                    action: async () => {
                        await this.#appWindow.close();
                    },
                }),
                await MenuItem.new({
                    id: "Reload",
                    text: t`Reload`,
                    action: async () => {
                        await this.#reload();
                    },
                }),
                await Submenu.new({
                    id: "Recent Projects",
                    text: t`Recent Projects`,
                    items: await Promise.all(
                        this.#settings.core.recentProjects.map(
                            async (item) =>
                                await MenuItem.new({
                                    text: item,
                                    action: async () => {
                                        await this.#openProject(item);
                                    },
                                }),
                        ),
                    ),
                }),
                await MenuItem.new({
                    id: "Close Project",
                    text: t`Close Project`,
                    action: async () => {
                        await this.#closeProject();
                    },
                }),
            ],
        });

        const languageSubmenu = await Submenu.new({
            id: "Language",
            text: t`Language`,
            items: [
                await MenuItem.new({
                    id: "English",
                    text: "English",
                    action: async () => {
                        if (
                            this.#settings.appearance.language !==
                            Language.English
                        ) {
                            await this.#retranslate(Language.English);
                        }
                    },
                }),
                await MenuItem.new({
                    id: "Русский",
                    text: "Русский",
                    action: async () => {
                        if (
                            this.#settings.appearance.language !==
                            Language.Russian
                        ) {
                            await this.#retranslate(Language.Russian);
                        }
                    },
                }),
            ],
        });

        const helpSubmenu = await Submenu.new({
            id: "Help",
            text: t`Help`,
            items: [
                await MenuItem.new({
                    id: "About",
                    text: t`About`,
                    action: async () => {
                        const aboutWindow = new WebviewWindow("about", {
                            url: "windows/about/AboutWindow.html",
                            title: t`About`,
                            center: true,
                            resizable: false,
                            width: consts.ABOUT_WINDOW_WIDTH,
                            height: consts.ABOUT_WINDOW_HEIGHT,
                            parent: this.#appWindow,
                        });

                        await aboutWindow.once(
                            "tauri://webview-created",
                            async () => {
                                await _.sleep(consts.SECOND_MS / 2);
                                await aboutWindow.emit("settings", [
                                    this.#settings,
                                    this.#themes,
                                    this.#projectSettings,
                                ]);
                            },
                        );
                    },
                }),
                await MenuItem.new({
                    id: "Help",
                    text: t`Help`,
                    action: () => {
                        // eslint-disable-next-line sonarjs/constructor-for-side-effects
                        new WebviewWindow("help", {
                            url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                            title: t`Help`,
                            center: true,
                            parent: this.#appWindow,
                        });
                    },
                }),
            ],
        });

        this.#menu = await Menu.new({
            items: [fileSubmenu, languageSubmenu, helpSubmenu],
        });

        await this.#menu.setAsWindowMenu();

        applyTheme(this.#themes, this.#settings.appearance.theme);
        this.#themeMenu.init(this.#themes);
        this.#tabPanel.top = `${this.#utilsPanel.clientHeight}px`;

        if (this.#settings.core.projectPath) {
            await this.#openProject(this.#settings.core.projectPath);
        } else {
            this.#resetTable();
        }
    }

    #showSearchMenu(): void {
        if (this.#searchMenu.hidden) {
            this.#searchMenu.show(
                this.#searchMenu.x || this.#utilsPanel.searchButton.offsetLeft,
                this.#searchMenu.y ||
                    this.#utilsPanel.searchButton.offsetTop +
                        this.#utilsPanel.searchButton.clientHeight,
            );
            this.#searchMenu.focus();
        } else {
            this.#searchMenu.hide();
        }
    }

    async #updateFont(place: FontPlace): Promise<boolean> {
        const fontPath: string =
            place === FontPlace.Tab
                ? this.#settings.appearance.translationTableFont
                : this.#settings.appearance.uiFont;

        if (!fontPath) {
            if (place === FontPlace.Tab) {
                this.#translationTable.style.setProperty(
                    "--translation-table-font",
                    "system-ui",
                );
            } else {
                document.body.style.setProperty("--ui-font", "system-ui");
            }

            return true;
        }

        await expandScope(fontPath);

        const fontData = await readFile(fontPath);

        if (isErr(fontData)) {
            void error(fontData[0]!);
            return false;
        }

        const font = await new FontFace(
            place === FontPlace.Tab
                ? "CustomTranslationTableFont"
                : "CustomUIFont",
            fontData[1]!,
        ).load();
        document.fonts.add(font);

        if (place === FontPlace.Tab) {
            this.#translationTable.style.setProperty(
                "--translation-table-font",
                "CustomTranslationTableFont",
            );
        } else {
            document.body.style.setProperty("--ui-font", "CustomUIFont");
        }

        return true;
    }

    async #updateFonts(): Promise<boolean> {
        const result = await this.#updateFont(FontPlace.Tab);

        if (!result) {
            return false;
        }

        return await this.#updateFont(FontPlace.UI);
    }

    async #reload(): Promise<void> {
        if (await this.#confirmExit()) {
            await this.#saveProject();
            location.reload();
        }
    }

    async #retranslate(language: Language): Promise<void> {
        this.#settings.appearance.language = language;
        await initializeLocalization("main", language);
        retranslate();

        if (this.#menu === null) {
            return;
        }

        for (const item of await this.#menu.items()) {
            const id = item.id;

            switch (id) {
                case "File":
                    await item.setText(t`File`);
                    break;
                case "Language":
                    await item.setText(t`Language`);
                    break;
                case "Help":
                    await item.setText(t`Help`);
                    break;
            }

            for (const subitem of await (item as Submenu).items()) {
                const id = subitem.id;

                switch (id) {
                    case "Exit":
                        await subitem.setText(t`Exit`);
                        break;
                    case "Reload":
                        await subitem.setText(t`Reload`);
                        break;
                    case "About":
                        await subitem.setText(t`About`);
                        break;
                    case "Help":
                        await subitem.setText(t`Help`);
                        break;
                }
            }
        }
    }

    async #loadProject(): Promise<void> {
        if (this.#settings.core.firstLaunch) {
            // eslint-disable-next-line sonarjs/constructor-for-side-effects
            new WebviewWindow("help", {
                url: "https://rpg-maker-translation-tools.github.io/rpgmtranslate/",
                title: t`Help`,
                center: true,
                parent: this.#appWindow,
            });
            this.#settings.core.firstLaunch = false;
        }

        if (this.#settings.core.backup.enabled) {
            this.#saver.setupBackup(
                this.#settings.core.backup.max,
                this.#settings.core.backup.period,
            );
        } else {
            this.#saver.disableBackup();
        }

        this.#replacementLog = await this.#loadReplacementLog();

        this.#tabInfo.tabs = {};
        this.#tabInfo.tabName = "";

        const glossaryContent = await readTextFile(
            this.#projectSettings.glossaryPath,
        );

        if (isErr(glossaryContent)) {
            void error(glossaryContent[0]!);
        } else {
            const glossary = JSON.parse(glossaryContent[1]!) as Glossary;
            this.#glossary = glossary;
        }

        const determinedLang = await this.#tabPanel.init(this.#projectSettings);

        if (
            this.#projectSettings.translationLanguages.sourceLanguage ===
                TokenizerAlgorithm.None &&
            determinedLang !== undefined
        ) {
            const enumLang = TokenizerAlgorithmNames.findIndex(
                (x) => x === determinedLang,
            );

            if (enumLang !== -1) {
                this.#projectSettings.translationLanguages.sourceLanguage =
                    enumLang - 1;
                alert(t`Auto-determined language as ${determinedLang}.`);
            }
        }

        await this.#utilsPanel.init(this.#projectSettings);
        this.#batchMenu.init(
            this.#tabInfo,
            this.#projectSettings,
            this.#settings.translation,
            this.#glossary,
            this.#tabPanel.tabs,
        );
        this.#searchMenu.init(this.#projectSettings.translationColumns);
        this.#readMenu.init(this.#projectSettings);
        this.#searchPanel.init(
            this.#tabInfo,
            this.#translationTable,
            this.#projectSettings,
            this.#replacementLog,
        );
        this.#writeMenu.init(this.#projectSettings.programDataPath);
        this.#translationTable.init(this.#settings, this.#projectSettings);
        this.#saver.init(this.#projectSettings, this.#utilsPanel.sourceTitle);
        this.#searcher.init(this.#projectSettings);
        this.#replacer.init(this.#projectSettings);
        this.#glossaryMenu.init(this.#glossary);
        this.#translationsMenu.init(
            this.#projectSettings,
            this.#settings.translation,
            this.#glossary,
            this.#tabInfo,
        );

        this.#translationTable.innerHTML = "";
        this.#updateProgressMeter();

        if (
            !this.#settings.core.recentProjects.includes(
                this.#settings.core.projectPath,
            )
        ) {
            this.#settings.core.recentProjects.push(
                this.#settings.core.projectPath,
            );

            if (
                this.#settings.core.recentProjects.length >
                consts.MAX_RECENT_PROJECTS
            ) {
                this.#settings.core.recentProjects.shift();
            }
        }

        const recentProjectsSubmenu = (
            await ((await this.#menu!.items())[0] as Submenu).items()
        ).at(-2) as Submenu;
        const recentProjectsItems = await recentProjectsSubmenu.items();

        for (const item of recentProjectsItems) {
            await recentProjectsSubmenu.remove(item);
        }

        for (const path of this.#settings.core.recentProjects) {
            await recentProjectsSubmenu.append(
                await MenuItem.new({
                    text: path,
                    action: async () => {
                        await this.#openProject(path);
                    },
                }),
            );
        }
    }

    async #openProject(projectPath: string): Promise<void> {
        if (!projectPath) {
            return;
        }

        await expandScope(projectPath);

        const rootTranslationPath = join(
            projectPath,
            consts.TRANSLATION_DIRECTORY,
        );

        const projectSettings = await this.#tryOpenProject(
            projectPath,
            rootTranslationPath,
        );

        if (!projectSettings) {
            return;
        }

        if (this.#settings.core.projectPath) {
            await this.#changeTab(null);
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#translationTable.rows,
            );
            await this.#saveProject();
            this.#tabPanel.clear();
        }

        this.#translationTable.innerHTML = t`Loading project...`;

        this.#settings.core.projectPath = projectPath;
        this.#projectSettings = projectSettings;

        if (!(await exists(this.#projectSettings.translationPath))) {
            if (await exists(rootTranslationPath)) {
                const proceed = await ask(
                    t`Existing translation folder detected in ${rootTranslationPath}. Use it?`,
                );

                if (proceed) {
                    await this.#copyTranslationFromRoot(rootTranslationPath);
                    this.#translationTable.innerHTML = t`Copying translation from root...`;
                }

                await this.#loadProject();
            } else {
                this.#readMenu.show(
                    this.#utilsPanel.readButton.offsetLeft,
                    this.#utilsPanel.readButton.offsetTop +
                        this.#utilsPanel.readButton.clientHeight,
                );

                this.#pendingRead = true;
                return;
            }
        } else {
            await this.#loadProject();
        }
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
            await this.#saver.saveCurrentTab(
                this.#tabInfo.tabName,
                this.#translationTable.rows,
            );
            const activeTab = this.#tabPanel.tab(
                this.#tabInfo.tabs[this.#tabInfo.tabName].index,
            );
            activeTab.classList.remove("bg-third");
        }

        this.#translationTable.innerHTML = "";

        if (filename === null) {
            this.#translationTable.hide();
            this.#tabInfo.tabName = this.#utilsPanel.tabName = "";
        } else {
            this.#utilsPanel.tabName = this.#tabInfo.tabName = filename;

            const activeTab = this.#tabPanel.tab(
                this.#tabInfo.tabs[filename].index,
            );
            activeTab.classList.add("bg-third");

            await this.#translationTable.fill(
                filename,
                this.#projectSettings.translationColumnCount,
            );
            this.#translationTable.show();
        }

        this.#changeTabTimer = window.setTimeout(() => {
            this.#changeTabTimer = -1;
            // eslint-disable-next-line no-magic-numbers
        }, consts.SECOND_MS / 10);

        this.#translationTable.clearTextAreaHistory();
    }

    #showSearchPanel(): void {
        this.#searchPanel.show(
            this.#searchPanel.x ||
                document.body.clientWidth - consts.DEFAULT_SEARCH_PANEL_WIDTH,
            this.#searchPanel.y || 0,
        );
    }

    async #handleHotkey(event: KeyboardEvent): Promise<void> {
        if (event.ctrlKey) {
            switch (event.code) {
                case "Equal":
                    if (this.#settings.appearance.zoom < consts.MAX_ZOOM) {
                        this.#settings.appearance.zoom += consts.ZOOM_STEP;
                        await this.#appWindow.setZoom(
                            this.#settings.appearance.zoom,
                        );
                    }
                    break;
                case "Minus":
                    if (this.#settings.appearance.zoom > consts.MIN_ZOOM) {
                        this.#settings.appearance.zoom -= consts.ZOOM_STEP;
                        await this.#appWindow.setZoom(
                            this.#settings.appearance.zoom,
                        );
                    }
                    break;
                case "KeyS":
                    await this.#saver.saveAll(
                        this.#tabInfo.tabName,
                        this.#translationTable.rows,
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
                    this.#showSearchMenu();
                    break;
                case "KeyG":
                    event.preventDefault();

                    if (this.#tabInfo.tabName) {
                        if (this.#goToRowInput.hidden) {
                            this.#goToRowInput.show();
                            this.#goToRowInput.focus();

                            const lastRowContainer =
                                this.#translationTable.lastRow;
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
                    await this.#invokeWrite(FileFlags.None);
                    break;
            }
        } else {
            switch (event.code) {
                case "KeyR":
                    // Prevent reloading
                    event.preventDefault();

                    if (document.activeElement?.tagName === "INPUT") {
                        return;
                    }

                    if (this.#searchPanel.hidden) {
                        this.#showSearchPanel();
                    } else {
                        this.#searchPanel.hide();
                    }
                    break;
                case "Tab":
                    event.preventDefault();

                    if (
                        this.#tabPanel.hidden &&
                        this.#settings.core.projectPath
                    ) {
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

    async #invokeWrite(
        skipFiles: FileFlags,
        skipMaps: number[] = [],
        skipEvents: [RPGMFileType, number[]][] = [],
    ): Promise<void> {
        if (!this.#settings.core.projectPath) {
            alert(
                t`Game files do not exist (no data/Data directory), so it's only possible to edit and save translation.`,
            );
            return;
        }

        this.#utilsPanel.toggleWriteAnimation();

        const result = await write({
            sourcePath: this.#projectSettings.sourcePath,
            translationPath: this.#projectSettings.translationPath,
            outputPath: this.#projectSettings.outputPath,
            engineType: this.#projectSettings.engineType,
            duplicateMode: this.#projectSettings.duplicateMode,
            gameTitle: this.#utilsPanel.translationTitle,
            flags: this.#projectSettings.flags,
            skipFiles,
            skipMaps,
            skipEvents,
            hashes: this.#projectSettings.hashes,
        });

        this.#utilsPanel.toggleWriteAnimation();

        if (isErr(result)) {
            void error(result[0]!);
            return;
        }

        const elapsed = result[1]!;

        alert(t`All files were written successfully.\nElapsed: ${elapsed}`);
    }

    async #saveProject(): Promise<void> {
        const keys: string[] = [];

        for (
            let i = TranslationEndpoint.Google;
            i <= TranslationEndpoint.Gemini;
            i++
        ) {
            keys.push(this.#settings.translation.endpoints[i as number].apiKey);
            // @ts-expect-error we are doing this for serialization
            delete this.#settings.translation.endpoints[i].apiKey;
        }

        saveAPIKeys(keys);

        let writeResult = await writeTextFile(
            consts.SETTINGS_PATH,
            JSON.stringify(this.#settings),
            {
                baseDir: consts.RESOURCE_DIRECTORY,
            },
        );

        if (isErr(writeResult)) {
            void error(writeResult[0]!);
        }

        if (!this.#settings.core.projectPath) {
            return;
        }

        await removePath(this.#projectSettings.matchesPath, {
            recursive: true,
        }).catch(error);

        await removePath(this.#projectSettings.tempMapsPath, {
            recursive: true,
        }).catch(error);

        writeResult = await writeTextFile(
            this.#projectSettings.logPath,
            JSON.stringify(this.#replacementLog),
        );

        if (isErr(writeResult)) {
            void error(writeResult[0]!);
        }

        writeResult = await writeTextFile(
            this.#projectSettings.projectSettingsPath,
            JSON.stringify(this.#projectSettings),
        );

        if (isErr(writeResult)) {
            void error(writeResult[0]!);
        }

        writeResult = await writeTextFile(
            this.#projectSettings.glossaryPath,
            JSON.stringify(this.#glossary),
        );

        if (isErr(writeResult)) {
            void error(writeResult[0]!);
        }
    }

    async #loadReplacementLog(): Promise<ReplacementLog> {
        const result = await readTextFile(this.#projectSettings.logPath);

        if (isErr(result)) {
            void error(result[0]!);
            return {};
        }

        return JSON.parse(result[1]!) as ReplacementLog;
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
                this.#translationTable.rows,
            );
            return true;
        } else {
            const exitUnsaved = await ask(t`Quit without saving?`);
            return exitUnsaved;
        }
    }

    async #tryOpenProject(
        projectPath: string,
        rootTranslationPath: string,
    ): Promise<ProjectSettings | null> {
        if (!(await exists(projectPath))) {
            await message(t`Selected directory is missing.`);
            return null;
        }

        const projectSettingsPath = join(
            projectPath,
            consts.PROGRAM_DATA_DIRECTORY,
            consts.PROJECT_SETTINGS_FILE,
        );

        const result = await readTextFile(projectSettingsPath);
        let projectSettings: ProjectSettings;
        let translationExists = false;

        if (isErr(result)) {
            void error(result[0]!);
            projectSettings = new ProjectSettings();
            translationExists = await exists(rootTranslationPath);
        } else {
            const json = JSON.parse(result[1]!) as ProjectSettingsOptions;
            projectSettings = new ProjectSettings(json);
        }

        let sourceDirectoryFound =
            await projectSettings.findSourceDirectory(projectPath);

        await projectSettings.setProjectPath(projectPath);

        if (!isErr(result)) {
            translationExists = await exists(projectSettings.translationPath);
        }

        if (!sourceDirectoryFound) {
            const extracted = await extractArchive(projectPath);

            if (extracted) {
                sourceDirectoryFound =
                    await projectSettings.findSourceDirectory(projectPath);
            } else if (!translationExists) {
                await message(
                    t`Selected directory does not contain data/Data directory, .rgss archive or translation directory.`,
                );
                return null;
            }
        }

        if (sourceDirectoryFound) {
            const engineTypeFound =
                await projectSettings.setEngineType(projectPath);

            if (!engineTypeFound) {
                await message(
                    t`Cannot determine the type of the game's engine.`,
                );

                return null;
            }
        } else {
            projectSettings.sourceDirectory = "";
        }

        return projectSettings;
    }

    async #copyTranslationFromRoot(translationPath: string): Promise<boolean> {
        const ok = await mkdir(this.#projectSettings.translationPath, {
            recursive: true,
        });

        if (isErr(ok)) {
            void error(ok[0]!);
            return false;
        }

        const translationEntries = await readDir(translationPath);

        if (isErr(translationEntries)) {
            void error(translationEntries[0]!);
            return false;
        }

        for (const entry of translationEntries[1]!) {
            await copyFile(
                join(translationPath, entry.name),
                join(this.#projectSettings.translationPath, entry.name),
            );
        }

        const metadataPath = join(
            translationPath,
            consts.RVPACKER_METADATA_FILE,
        );

        const result = await readTextFile(metadataPath);

        if (isErr(result)) {
            void error(result[0]!);
            return false;
        }

        const metadata = JSON.parse(result[1]!) as Metadata;
        utils.deepAssign(
            this.#projectSettings as unknown as Record<string, unknown>,
            metadata as unknown as Record<string, unknown>,
        );

        return true;
    }

    async #initThemes(): Promise<boolean> {
        const themesFile = await readTextFile(
            await resolveResource("resources/themes.json"),
        );

        if (isErr(themesFile)) {
            void error(themesFile[0]!);
            return false;
        }

        const themes = JSON.parse(themesFile[1]!) as Themes;
        this.#themes = themes;

        return true;
    }

    #updateProgressMeter(): void {
        this.#utilsPanel.updateProgressMeter(this.#tabInfo);
    }

    #attachListeners(): void {
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

        emittery.on(AppEvent.ScrollIntoRow, (row) => {
            this.#translationTable.rows[row].scrollIntoView({
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

        emittery.on(AppEvent.ShowElement, ([element, toggle]) => {
            switch (element) {
                case ElementToShow.MatchMenu:
                    if (toggle) {
                        if (this.#matchMenu.hidden) {
                            this.#matchMenu.show(
                                this.#matchMenu.x || 0,
                                this.#matchMenu.y ||
                                    window.innerHeight -
                                        consts.MATCH_MENU_HEIGHT,
                            );
                        } else {
                            this.#matchMenu.hide();
                        }
                    } else {
                        this.#matchMenu.show(
                            this.#matchMenu.x || 0,
                            this.#matchMenu.y ||
                                window.innerHeight - consts.MATCH_MENU_HEIGHT,
                        );
                    }

                    break;
                case ElementToShow.ThemeEditMenu:
                    this.#themeEditMenu.show();
                    break;
            }
        });

        emittery.on(
            AppEvent.InvokeWrite,
            async ([skipFiles, skipMaps, skipEvents]) => {
                await this.#invokeWrite(skipFiles, skipMaps, skipEvents);
            },
        );

        emittery.on(AppEvent.ChangeTab, async (filename) => {
            await this.#changeTab(filename);
        });

        emittery.on(AppEvent.ColumnResized, ([columnIndex, width]) => {
            for (const row of this.#translationTable.rows) {
                const element = row.children[columnIndex];
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

            for (const row of this.#translationTable.rows) {
                this.#translationTable.addTextAreaCell(row, "");
            }

            // This is search menu
            this.#searchMenu.updateColumn(
                this.#projectSettings.translationColumnCount - 1,
                t`Translation`,
            );

            // And this is batch menu
            this.#batchMenu.updateColumn(
                this.#projectSettings.translationColumnCount - 1,
                t`Translation`,
            );
        });

        emittery.on(AppEvent.RemoveBookmark, (rowNumber) => {
            this.#bookmarkMenu.deleteBookmark(this.#tabInfo.tabName, rowNumber);
        });

        emittery.on(AppEvent.UpdateSaved, (saved) => {
            this.#saver.saved = saved;
        });

        emittery.on(AppEvent.SaveAll, async () => {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#translationTable.rows,
            );
        });

        emittery.on(
            AppEvent.InvokePurge,
            async ([skipFiles, createIgnore, skipMaps, skipEvents]) => {
                await this.#saver.saveAll(
                    this.#tabInfo.tabName,
                    this.#translationTable.rows,
                );
                await this.#changeTab(null);

                this.#utilsPanel.togglePurgeAnimation();

                let flags = this.#projectSettings.flags;

                if (createIgnore) {
                    flags |= BaseFlags.CreateIgnore;
                }

                await purge({
                    sourcePath: this.#projectSettings.sourcePath,
                    translationPath: this.#projectSettings.translationPath,
                    engineType: this.#projectSettings.engineType,
                    duplicateMode: this.#projectSettings.duplicateMode,
                    gameTitle: this.#utilsPanel.sourceTitle,
                    skipFiles,
                    flags,
                    skipMaps,
                    skipEvents,
                    hashes: this.#projectSettings.hashes,
                });

                await removePath(this.#projectSettings.tempMapsPath, {
                    recursive: true,
                });
                this.#tabPanel.clear();
                await this.#tabPanel.init(this.#projectSettings);
            },
        );

        emittery.on(
            AppEvent.UtilsButtonClick,
            async (button): Promise<void> => {
                if (
                    !this.#settings.core.projectPath &&
                    button !== this.#utilsPanel.openFolderButton
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
                            this.#translationTable.rows,
                        );
                        break;
                    case this.#utilsPanel.writeButton:
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
                    case this.#utilsPanel.openFolderButton: {
                        const directory =
                            (await open({
                                directory: true,
                                multiple: false,
                            })) ?? "";

                        if (!directory) {
                            return;
                        }

                        if (directory === this.#settings.core.projectPath) {
                            await message(
                                t`Selected directory is already opened in the program.`,
                            );
                            return;
                        }

                        await this.#openProject(directory);
                        break;
                    }
                    case this.#utilsPanel.settingsButton: {
                        // eslint-disable-next-line sonarjs/constructor-for-side-effects
                        new WebviewWindow("settings", {
                            url: "windows/settings/SettingsWindow.html",
                            title: t`Settings`,
                            center: true,
                            resizable: false,
                            parent: this.#appWindow,
                        });

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
                    case this.#utilsPanel.readButton:
                        if (!this.#projectSettings.sourceDirectory) {
                            alert(
                                t`Game files do not exist (no data/Data directory), so it's only possible to edit and save translation.`,
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

                            if (this.#pendingRead) {
                                this.#resetTable();
                                this.#settings.core.projectPath = "";
                                this.#projectSettings = new ProjectSettings();
                            }
                        }
                        break;
                    case this.#utilsPanel.searchButton:
                        this.#showSearchMenu();
                        break;
                    case this.#utilsPanel.batchButton:
                        if (this.#batchMenu.hidden) {
                            this.#batchMenu.show(
                                this.#batchMenu.x ||
                                    this.#utilsPanel.batchButton.offsetLeft,
                                this.#batchMenu.y ||
                                    this.#utilsPanel.batchButton.offsetTop +
                                        this.#utilsPanel.batchButton
                                            .clientHeight,
                            );
                        } else {
                            this.#batchMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.purgeButton:
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

                    case this.#utilsPanel.glossaryButton:
                        if (this.#glossaryMenu.hidden) {
                            this.#glossaryMenu.show(
                                this.#glossaryMenu.x ||
                                    this.#utilsPanel.glossaryButton.offsetLeft,
                                this.#glossaryMenu.y ||
                                    this.#utilsPanel.glossaryButton.offsetTop +
                                        this.#utilsPanel.glossaryButton
                                            .clientHeight,
                            );
                        } else {
                            this.#glossaryMenu.hide();
                        }
                        break;
                    case this.#utilsPanel.translationsButton:
                        if (this.#translationsMenu.hidden) {
                            this.#translationsMenu.show(
                                this.#translationsMenu.x ||
                                    this.#utilsPanel.translationsButton
                                        .offsetLeft,
                                this.#translationsMenu.y ||
                                    this.#utilsPanel.translationsButton
                                        .offsetTop +
                                        this.#utilsPanel.translationsButton
                                            .clientHeight,
                            );
                        } else {
                            this.#translationsMenu.hide();
                        }
                        break;
                }

                await this.#appWindow.onCloseRequested(async (event) => {
                    if (
                        !this.#settings.core.projectPath ||
                        (await this.#confirmExit())
                    ) {
                        await this.#saveProject();
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
                    this.#translationTable.rows,
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
                    this.#translationTable.rows,
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
                    this.#translationTable.rows,
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
                    this.#translationTable.rows,
                    predicate,
                    columnIndex,
                    searchMode,
                    searchAction,
                );

                if (searchAction === SearchAction.Search) {
                    this.#searchPanel.updateResults(results.pages);
                    this.#showSearchPanel();
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

        emittery.on(AppEvent.SearchFlagChanged, (flag) => {
            this.#searcher.toggleFlag(flag);
        });

        emittery.on(AppEvent.ContextMenuChanged, (menu) => {
            if (menu === this.#activeContextMenu) {
                return;
            }

            this.#activeContextMenu?.remove();
            this.#activeContextMenu = menu;
        });

        emittery.on(AppEvent.BatchAction, async (fileData) => {
            await this.#batchMenu.process(fileData);
        });

        emittery.on(AppEvent.TermCheck, async ([id, mode]) => {
            const checkSpecificRow = mode[1] !== undefined;
            const checkOnlyCurrentFile = Boolean(mode[0]);

            const {
                sourceLanguage: sourceAlgorithm,
                translationLanguage: translationAlgorithm,
            } = this.#projectSettings.translationLanguages;

            if (sourceAlgorithm === TokenizerAlgorithm.None) {
                this.#matchMenu.showError(t`Source language is not set.`);
                return;
            }

            if (translationAlgorithm === TokenizerAlgorithm.None) {
                this.#matchMenu.showError(t`Translation language is not set.`);
                return;
            }

            this.#matchMenu.clear();

            const termsToCheck =
                id === -1 ? this.#glossary : [this.#glossary[id]];

            const processRow = async (
                source: string,
                translation: string,
                filename: string,
                line: number,
            ): Promise<void> => {
                for (const term of termsToCheck) {
                    await this.#matchMenu.appendMatches(
                        source,
                        translation.trim(),
                        sourceAlgorithm,
                        translationAlgorithm,
                        term,
                        filename,
                        line,
                    );
                }
            };

            if (checkSpecificRow || checkOnlyCurrentFile) {
                const rowsToCheck = checkSpecificRow
                    ? [this.#translationTable.row(mode[1])]
                    : this.#translationTable.rows;

                for (const row of rowsToCheck) {
                    const source = utils.source(row);

                    if (source.startsWith(consts.COMMENT_PREFIX)) {
                        continue;
                    }

                    await processRow(
                        source,
                        utils.translation(row)[0],
                        this.#tabInfo.tabName,
                        utils.rowNumber(row),
                    );
                }

                return;
            }

            for (const filename in this.#tabInfo.tabs) {
                if (filename === this.#tabInfo.tabName) {
                    await this.#changeTab(null);
                }

                const contentPath = utils.join(
                    filename.startsWith("map")
                        ? this.#projectSettings.tempMapsPath
                        : this.#projectSettings.translationPath,
                    `${filename}${consts.TXT_EXTENSION}`,
                );

                const content = await readTextFile(contentPath);
                if (isErr(content)) {
                    void error(content[0]!);
                    return;
                }

                const lines = utils.lines(content[1]!);

                for (let l = 0; l < lines.length; l++) {
                    const line = lines[l];
                    if (!line.trim()) {
                        continue;
                    }

                    const split = utils.parts(line);
                    if (!split) {
                        utils.logSplitError(filename, l + 1);
                        continue;
                    }

                    let source = utils.toLF(utils.source(split));
                    const translation = utils.toLF(utils.translation(split)[0]);

                    const isComment = source.startsWith(consts.COMMENT_PREFIX);
                    const isMapComment = source.startsWith(
                        consts.MAP_DISPLAY_NAME_COMMENT_PREFIX,
                    );

                    if (isComment && !isMapComment) {
                        continue;
                    }

                    if (isMapComment) {
                        source = source.slice(
                            consts.MAP_DISPLAY_NAME_COMMENT_PREFIX_LENGTH,
                            -consts.COMMENT_SUFFIX_LENGTH,
                        );
                    }

                    await processRow(source, translation, filename, l + 1);
                }
            }
        });

        emittery.on(AppEvent.ShowTranslations, async (text) => {
            await this.#translationsMenu.showTranslations(text);
        });

        emittery.on(AppEvent.AddTerm, (source) => {
            const term: Term = {
                source,
                sourceMatchMode: [
                    [MatchMode.Exact, consts.DEFAULT_FUZZY_THRESHOLD],
                    true,
                    false,
                ],
                translation: "",
                translationMatchMode: [
                    [MatchMode.Exact, consts.DEFAULT_FUZZY_THRESHOLD],
                    true,
                    false,
                ],
                note: "",
            };

            this.#glossaryMenu.addTerm(term);
        });

        document.addEventListener("keydown", (event) => {
            if (event.code === "Tab") {
                event.preventDefault();
            }
        });

        document.addEventListener("keyup", async (event) => {
            await this.#handleHotkey(event);
        });

        window.addEventListener("click", () => {
            this.#activeContextMenu?.remove();
        });

        void listen<[Settings, ProjectSettings]>(
            "close-settings",
            async (res) => {
                utils.deepAssign(
                    this.#settings as unknown as Record<string, unknown>,
                    res.payload[0] as unknown as Record<string, unknown>,
                );
                utils.deepAssign(
                    this.#projectSettings as unknown as Record<string, unknown>,
                    res.payload[1] as unknown as Record<string, unknown>,
                );

                if (this.#settings.core.backup.enabled) {
                    this.#saver.setupBackup(
                        this.#settings.core.backup.max,
                        this.#settings.core.backup.period,
                    );
                } else {
                    this.#saver.disableBackup();
                }

                await this.#updateFonts();
                this.#translationTable.init(
                    this.#settings,
                    this.#projectSettings,
                );
            },
        );

        void listen("awaiting-settings", async () => {
            await emit("open-settings", [
                this.#settings,
                this.#themes,
                this.#projectSettings,
                this.#tabInfo.tabs,
            ]);
        });
    }

    async #closeProject(): Promise<void> {
        if (this.#settings.core.projectPath === "") {
            return;
        }

        await this.#changeTab(null);
        await this.#saver.saveAll(
            this.#tabInfo.tabName,
            this.#translationTable.rows,
        );
        await this.#saveProject();
        this.#tabPanel.clear();

        this.#settings.core.projectPath = "";
        this.#projectSettings = new ProjectSettings();

        this.#resetTable();
    }

    async #invokeRead(
        readMode: ReadMode,
        skipFiles: FileFlags,
        duplicateMode: DuplicateMode,
        flags: BaseFlags,
        skipMaps: number[],
        skipEvents: [RPGMFileType, number[]][],
        mapEvents: boolean,
    ): Promise<void> {
        if (this.#pendingRead) {
            this.#translationTable.innerHTML = t`Reading game files...`;
        }

        this.#utilsPanel.toggleReadAnimation();
        await this.#changeTab(null);
        await mkdir(this.#projectSettings.translationPath, { recursive: true });

        if (
            readMode === ReadMode.AppendDefault ||
            readMode === ReadMode.AppendForce
        ) {
            await this.#saver.saveAll(
                this.#tabInfo.tabName,
                this.#translationTable.rows,
            );
        }

        let result: Result<undefined | string[]> = await read({
            projectPath: this.#settings.core.projectPath,
            sourcePath: this.#projectSettings.sourcePath,
            translationPath: this.#projectSettings.translationPath,
            engineType: this.#projectSettings.engineType,
            readMode,
            duplicateMode,
            skipFiles,
            flags,
            skipMaps,
            skipEvents,
            mapEvents,
            hashes: this.#projectSettings.hashes,
        });

        if (isErr(result)) {
            void error(result[0]!);
            return;
        }

        this.#utilsPanel.toggleReadAnimation();

        const metadata: Metadata = {
            disableCustomProcessing: Boolean(
                flags & BaseFlags.DisableCustomProcessing,
            ),
            trim: Boolean(flags & BaseFlags.Trim),
            duplicateMode,
            romanize: Boolean(flags & BaseFlags.Romanize),
            hashes: result[1]!,
        };

        utils.deepAssign(
            this.#projectSettings as unknown as Record<string, unknown>,
            metadata as unknown as Record<string, unknown>,
        );

        result = (await writeTextFile(
            join(this.#projectSettings.translationPath, ".rvpacker-metadata"),
            JSON.stringify(metadata),
        )) as Result<undefined>;

        if (isErr(result)) {
            void error(result[0]!);
        }

        if (readMode !== ReadMode.Default) {
            await removePath(this.#projectSettings.tempMapsPath, {
                recursive: true,
            });
            this.#tabPanel.clear();
            await this.#tabPanel.init(this.#projectSettings);
        } else {
            this.#readMenu.hide();
            this.#pendingRead = false;
            await this.#loadProject();
        }
    }

    #resetTable(): void {
        this.#translationTable.innerHTML = "";

        const noProjectContainer = document.createElement("div");
        noProjectContainer.innerHTML = t`No project selected. Select the project directory, using 'open folder' button in the left-top corner.`;
        this.#translationTable.append(noProjectContainer);

        if (this.#settings.core.recentProjects.length !== 0) {
            const recentProjectsContainer = document.createElement("div");
            recentProjectsContainer.innerHTML = t`Recent projects:`;

            for (const path of this.#settings.core.recentProjects) {
                const projectLink = document.createElement("a");
                projectLink.innerHTML = path;

                recentProjectsContainer.appendChild(projectLink);
            }

            this.#translationTable.append(recentProjectsContainer);
            recentProjectsContainer.onclick = async (e): Promise<void> => {
                const target = e.target as HTMLElement;

                if (target.tagName !== "A") {
                    return;
                }

                await this.#openProject(target.innerHTML);
            };
        }
    }
}

await new MainWindow().init();
