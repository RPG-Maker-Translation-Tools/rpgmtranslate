import {
    copyFile,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
    LINES_SEPARATOR,
    NEW_LINE,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
} from "../utilities/constants";
import { join } from "../utilities/functions";
import { SaveMode } from "./enums";
import { Settings } from "./settings";

export class Saver {
    #outputArray: string[] = [];
    #saving = false;

    constructor(
        private readonly settings: Settings,
        private readonly currentTab: CurrentTab,
        private readonly currentGameTitle: HTMLInputElement,
    ) {}

    private async saveCurrentTab(): Promise<void> {
        for (const rowContainer of this.currentTab.content.children) {
            const originalTextDiv = rowContainer.children[1] as HTMLDivElement;
            const translationTextArea = rowContainer
                .children[2] as HTMLTextAreaElement;

            this.#outputArray.push(
                originalTextDiv.textContent!.replaceAll("\n", NEW_LINE) +
                    LINES_SEPARATOR +
                    translationTextArea.value.replaceAll("\n", NEW_LINE),
            );
        }

        if (this.currentTab.name === "system") {
            const originalTitle =
                this.currentGameTitle.getAttribute("original-title")!;
            const output =
                originalTitle +
                LINES_SEPARATOR +
                (originalTitle === this.currentGameTitle.value
                    ? ""
                    : this.currentGameTitle.value);
            this.#outputArray.push(output);
        }

        const filePath = `${this.currentTab.name}${TXT_EXTENSION}`;
        const savePath = join(
            this.currentTab.name!.startsWith("maps")
                ? this.settings.tempMapsPath
                : this.settings.translationPath,
            filePath,
        );

        await writeTextFile(savePath, this.#outputArray.join("\n"));
    }

    private async saveBackup(): Promise<void> {
        const backupFolderEntries = await readDir(this.settings.backupPath);

        if (backupFolderEntries.length >= this.settings.backup.max) {
            await removePath(
                join(this.settings.backupPath, backupFolderEntries[0].name),
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

        this.settings.nextBackupNumber =
            (this.settings.nextBackupNumber % this.settings.backup.max) + 1;

        const backupDirectoryPath = join(
            this.settings.backupPath,
            `${formattedDate}_${this.settings.nextBackupNumber.toString().padStart(2, "0")}`,
        );

        await mkdir(backupDirectoryPath, { recursive: true });
        await mkdir(join(backupDirectoryPath, TEMP_MAPS_DIRECTORY));
        await mkdir(join(backupDirectoryPath, TRANSLATION_DIRECTORY));

        for (const entry of await readDir(this.settings.translationPath)) {
            await copyFile(
                join(this.settings.translationPath, entry.name),
                join(backupDirectoryPath, TRANSLATION_DIRECTORY, entry.name),
            );
        }

        for (const entry of await readDir(this.settings.tempMapsPath)) {
            await copyFile(
                join(this.settings.tempMapsPath, entry.name),
                join(backupDirectoryPath, TEMP_MAPS_DIRECTORY, entry.name),
            );
        }
    }

    private async saveFile(mode: SaveMode): Promise<void> {
        if (this.currentTab.name) {
            await this.saveCurrentTab();
            return;
        }

        if (mode !== SaveMode.AllFiles) {
            return;
        }

        const entries = (await readDir(this.settings.tempMapsPath)).sort(
            (a, b) => Number(a.name.slice(4, -4)) - Number(b.name.slice(4, -4)),
        );

        for (const entry of entries) {
            this.#outputArray.push(
                await readTextFile(
                    join(this.settings.tempMapsPath, entry.name),
                ),
            );
        }

        await writeTextFile(
            join(this.settings.translationPath, "maps.txt"),
            this.#outputArray.join("\n"),
        );
    }

    get saving(): boolean {
        return this.#saving;
    }

    public async save(mode: SaveMode): Promise<boolean> {
        this.#saving = true;
        let saved = false;

        if (mode === SaveMode.Backup) {
            await this.saveBackup();
        } else {
            await this.saveFile(mode);
            saved = true;
        }

        this.#outputArray.length = 0;
        this.#saving = false;
        return saved;
    }
}
