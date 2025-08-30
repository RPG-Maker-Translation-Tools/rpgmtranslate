import { emittery } from "@classes/emittery";
import { ProjectSettings } from "@lib/classes";
import { AppEvent } from "@lib/enums";

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

export class Saver {
    public saved = true;

    #saving = false;
    #backupInterval = -1;

    #backupPath = "";
    #translationPath = "";
    #tempMapsPath = "";

    #maxBackups = 0;
    #sourceTitle = "";
    #translationTitle = "";

    public get saving(): boolean {
        return this.#saving;
    }

    public set translationTitle(translationTitle: string) {
        this.#translationTitle = translationTitle;
    }

    public init(projectSettings: ProjectSettings, sourceTitle: string): void {
        this.#backupPath = projectSettings.backupPath;
        this.#translationPath = projectSettings.translationPath;
        this.#tempMapsPath = projectSettings.tempMapsPath;
        this.#sourceTitle = sourceTitle;
    }

    public async saveSingle(tabName: string, rows: Rows): Promise<void> {
        const outputArray: string[] = [];

        for (const rowContainer of rows) {
            const source = utils.source(rowContainer);
            const translations = utils.translations(rowContainer);

            outputArray.push(
                utils.dlbtoclb(source) +
                    consts.SEPARATOR +
                    translations
                        .map((translation) => utils.dlbtoclb(translation))
                        .join(consts.SEPARATOR),
            );
        }

        if (tabName === "system") {
            const title =
                this.#sourceTitle +
                consts.SEPARATOR +
                (this.#sourceTitle === this.#translationTitle
                    ? ""
                    : this.#translationTitle);

            outputArray.push(title);
        }

        const filePath = `${tabName}${consts.TXT_EXTENSION}`;
        const savePath = utils.join(
            tabName.startsWith("map")
                ? this.#tempMapsPath
                : this.#translationPath,
            filePath,
        );

        await writeTextFile(savePath, outputArray.join("\n"));
    }

    public disableBackup(): void {
        clearInterval(this.#backupInterval);
        this.#backupInterval = -1;
    }

    public setupBackup(max: number, period: number): void {
        this.#maxBackups = max;

        clearInterval(this.#backupInterval);

        this.#backupInterval = window.setInterval(async () => {
            await this.#saveBackup();
        }, period * consts.SECOND_MS);
    }

    public async saveAll(tabName: string | null, rows: Rows): Promise<void> {
        if (this.#saving) {
            return;
        }

        await emittery.emit(AppEvent.ToggleSaveAnimation);
        this.#saving = true;

        if (tabName !== null) {
            await this.saveSingle(tabName, rows);
        }

        const tempMapEntries = (await readDir(this.#tempMapsPath)).sort(
            (a, b) =>
                Number(
                    a.name.slice("map".length, -consts.TXT_EXTENSION_LENGTH),
                ) -
                Number(
                    b.name.slice("map".length, -consts.TXT_EXTENSION_LENGTH),
                ),
        );

        const outputArray: string[] = [];

        for (const entry of tempMapEntries) {
            outputArray.push(
                await readTextFile(utils.join(this.#tempMapsPath, entry.name)),
            );
        }

        await writeTextFile(
            utils.join(this.#translationPath, "maps.txt"),
            outputArray.join("\n"),
        );

        await emittery.emit(AppEvent.ToggleSaveAnimation);
        this.#saving = false;
        this.saved = true;
    }

    public async awaitSave(): Promise<void> {
        while (this.saving) {
            await new Promise((resolve) =>
                setTimeout(resolve, consts.SECOND_MS / 5),
            );
        }
    }

    async #saveBackup(): Promise<void> {
        if (this.#saving) {
            return;
        }

        this.#saving = true;
        const backupFolderEntries = await readDir(this.#backupPath);

        if (backupFolderEntries.length >= this.#maxBackups) {
            await remove(
                utils.join(this.#backupPath, backupFolderEntries[0].name),
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

        const backupDirectoryPath = utils.join(this.#backupPath, formattedDate);

        await mkdir(backupDirectoryPath, { recursive: true });
        await mkdir(
            utils.join(backupDirectoryPath, consts.TEMP_MAPS_DIRECTORY),
        );
        await mkdir(
            utils.join(backupDirectoryPath, consts.TRANSLATION_DIRECTORY),
        );

        for (const entry of await readDir(this.#translationPath)) {
            await copyFile(
                utils.join(this.#translationPath, entry.name),
                utils.join(
                    backupDirectoryPath,
                    consts.TRANSLATION_DIRECTORY,
                    entry.name,
                ),
            );
        }

        for (const entry of await readDir(this.#tempMapsPath)) {
            await copyFile(
                utils.join(this.#tempMapsPath, entry.name),
                utils.join(
                    backupDirectoryPath,
                    consts.TEMP_MAPS_DIRECTORY,
                    entry.name,
                ),
            );
        }

        this.#saving = false;
    }
}
