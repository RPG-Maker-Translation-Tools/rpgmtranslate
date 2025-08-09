import { Settings } from "@classes/Settings";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

import {
    copyFile,
    mkdir,
    readDir,
    readTextFile,
    remove,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import { ProjectSettings } from "./ProjectSettings";

export class Saver {
    #outputArray: string[] = [];
    #saving = false;
    #backupIsActive = -1;
    public saved = true;

    public constructor(
        private readonly settings: Settings,
        private readonly projectSettings: ProjectSettings,
        private readonly tabInfo: TabInfo,
        private readonly currentGameTitle: HTMLInputElement,
        private readonly saveIcon: Element,
    ) {
        this.#setupBackup();
    }

    public async saveSingle() {
        for (const rowContainer of this.tabInfo.currentTab.content
            .children as HTMLCollectionOf<HTMLDivElement>) {
            const source = rowContainer.children[1] as HTMLDivElement;
            const translations = utils.translations(rowContainer);

            this.#outputArray.push(
                utils.dlbtoclb(source.textContent) +
                    consts.SEPARATOR +
                    translations
                        .map((translation) => utils.dlbtoclb(translation))
                        .join(consts.SEPARATOR),
            );
        }

        if (this.tabInfo.currentTab.name === "system") {
            const sourceTitle =
                this.currentGameTitle.getAttribute("source-title")!;

            const output =
                sourceTitle +
                consts.SEPARATOR +
                (sourceTitle === this.currentGameTitle.value
                    ? ""
                    : this.currentGameTitle.value);

            this.#outputArray.push(output);
        }

        const filePath = `${this.tabInfo.currentTab.name}${consts.TXT_EXTENSION}`;
        const savePath = utils.join(
            this.tabInfo.currentTab.name.startsWith("map")
                ? this.projectSettings.tempMapsPath
                : this.projectSettings.translationPath,
            filePath,
        );

        await writeTextFile(savePath, this.#outputArray.join("\n"));
        this.#outputArray.length = 0;
    }

    #setupBackup() {
        if (!this.settings.backup.enabled || this.#backupIsActive !== -1) {
            return;
        }

        // @ts-expect-error aweddopkawkodwa
        this.#backupIsActive = setInterval(async () => {
            if (this.settings.backup.enabled) {
                await this.#saveBackup();
            } else {
                clearInterval(this.#backupIsActive);
                this.#backupIsActive = -1;
            }
        }, this.settings.backup.period * consts.SECOND_MS);
    }

    async #saveBackup() {
        if (this.#saving) {
            return;
        }

        this.#saving = true;
        const backupFolderEntries = await readDir(
            this.projectSettings.backupPath,
        );

        if (backupFolderEntries.length >= this.settings.backup.max) {
            await remove(
                utils.join(
                    this.projectSettings.backupPath,
                    backupFolderEntries[0].name,
                ),
                { recursive: true },
            );
        }

        const date = new Date();
        const formattedDate = [
            date.getFullYear(),
            (date.getMonth() + 1).toString().padStart(2, "0"),
            date.getDate().toString().padStart(2, "0"),
            date.getHours().toString().padStart(2, "0"),
            date.getMinutes().toString().padStart(2, "0"),
            date.getSeconds().toString().padStart(2, "0"),
        ].join("-");

        const backupDirectoryPath = utils.join(
            this.projectSettings.backupPath,
            formattedDate,
        );

        await mkdir(backupDirectoryPath, { recursive: true });
        await mkdir(
            utils.join(backupDirectoryPath, consts.TEMP_MAPS_DIRECTORY),
        );
        await mkdir(
            utils.join(backupDirectoryPath, consts.TRANSLATION_DIRECTORY),
        );

        for (const entry of await readDir(
            this.projectSettings.translationPath,
        )) {
            await copyFile(
                utils.join(this.projectSettings.translationPath, entry.name),
                utils.join(
                    backupDirectoryPath,
                    consts.TRANSLATION_DIRECTORY,
                    entry.name,
                ),
            );
        }

        for (const entry of await readDir(this.projectSettings.tempMapsPath)) {
            await copyFile(
                utils.join(this.projectSettings.tempMapsPath, entry.name),
                utils.join(
                    backupDirectoryPath,
                    consts.TEMP_MAPS_DIRECTORY,
                    entry.name,
                ),
            );
        }

        this.#saving = false;
        this.#outputArray.length = 0;
    }

    public async saveAll() {
        if (this.#saving) {
            return;
        }

        this.saveIcon.classList.add("animate-spin");
        this.#saving = true;

        if (this.tabInfo.currentTab.name) {
            await this.saveSingle();
        }

        const entries = (await readDir(this.projectSettings.tempMapsPath)).sort(
            (a, b) =>
                Number(
                    a.name.slice("map".length, -consts.TXT_EXTENSION_LENGTH),
                ) -
                Number(
                    b.name.slice("map".length, -consts.TXT_EXTENSION_LENGTH),
                ),
        );

        for (const entry of entries) {
            this.#outputArray.push(
                await readTextFile(
                    utils.join(this.projectSettings.tempMapsPath, entry.name),
                ),
            );
        }

        await writeTextFile(
            utils.join(this.projectSettings.translationPath, "maps.txt"),
            this.#outputArray.join("\n"),
        );

        this.saveIcon.classList.remove("animate-spin");
        this.#saving = false;
        this.#outputArray.length = 0;
        this.saved = true;
    }

    public get saving() {
        return this.#saving;
    }
}
