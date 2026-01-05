import { emittery } from "@classes/emittery";

import { ProjectSettings } from "@lib/classes";
import { AppEvent } from "@lib/enums";

import * as consts from "@utils/constants";
import * as utils from "@utils/functions";
import {
    isErr,
    mkdir,
    readDir,
    readTextFile,
    writeTextFile,
} from "@utils/invokes";

import { copyFile, DirEntry, remove } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

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

    public async saveSingle(tabName: string, rows: Rows): Promise<boolean> {
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

        const result = await writeTextFile(savePath, outputArray.join("\n"));

        if (isErr(result)) {
            void error(result[0]!);
            return false;
        }

        return true;
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

    public async saveAll(tabName: string | null, rows: Rows): Promise<boolean> {
        if (this.#saving) {
            return true;
        }

        await emittery.emit(AppEvent.ToggleSaveAnimation);
        this.#saving = true;
        let saved = true;

        if (tabName !== null) {
            await this.saveSingle(tabName, rows);
        }

        let result: Result<DirEntry[] | undefined> = await readDir(
            this.#tempMapsPath,
        );

        let tempMapEntries: DirEntry[] = [];

        if (isErr(result)) {
            void error(result[0]!);
            saved = false;
        } else {
            tempMapEntries = result[1]!.sort(
                (a, b) =>
                    Number(
                        a.name.slice(
                            "map".length,
                            -consts.TXT_EXTENSION_LENGTH,
                        ),
                    ) -
                    Number(
                        b.name.slice(
                            "map".length,
                            -consts.TXT_EXTENSION_LENGTH,
                        ),
                    ),
            );
        }

        const outputArray: string[] = [];

        for (const entry of tempMapEntries) {
            const result = await readTextFile(
                utils.join(this.#tempMapsPath, entry.name),
            );

            if (isErr(result)) {
                void error(result[0]!);
                saved = false;
                break;
            }

            outputArray.push(result[1]!);
        }

        result = (await writeTextFile(
            utils.join(this.#translationPath, "maps.txt"),
            outputArray.join("\n"),
        )) as Result<undefined>;

        if (isErr(result)) {
            void error(result[0]!);
            saved = false;
        }

        await emittery.emit(AppEvent.ToggleSaveAnimation);
        this.#saving = false;
        this.saved = saved;

        return this.saved;
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

        if (isErr(backupFolderEntries)) {
            void error(backupFolderEntries[0]!);
        } else {
            if (backupFolderEntries[1]!.length >= this.#maxBackups) {
                await remove(
                    utils.join(
                        this.#backupPath,
                        backupFolderEntries[1]![0].name,
                    ),
                    { recursive: true },
                );
            }
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

        const entries = await readDir(this.#translationPath);

        if (isErr(entries)) {
            void error(entries[0]!);
            return;
        }

        const mapEntries = await readDir(this.#tempMapsPath);

        if (isErr(mapEntries)) {
            void error(mapEntries[0]!);
            return;
        }

        for (const entry of entries[1]!) {
            await copyFile(
                utils.join(this.#translationPath, entry.name),
                utils.join(
                    backupDirectoryPath,
                    consts.TRANSLATION_DIRECTORY,
                    entry.name,
                ),
            );
        }

        for (const entry of mapEntries[1]!) {
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
