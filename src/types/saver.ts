import {
    copyFile,
    mkdir,
    readDir,
    readTextFile,
    remove as removePath,
    writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
    SEPARATOR,
    TEMP_MAPS_DIRECTORY,
    TRANSLATION_DIRECTORY,
    TXT_EXTENSION,
    TXT_EXTENSION_LENGTH,
} from "../utilities/constants";
import { join } from "../utilities/functions";
import { Settings } from "./settings";

export class Saver {
    #outputArray: string[] = [];
    #saving = false;
    public saved = true;

    public constructor(
        private readonly settings: Settings,
        private readonly tabInfo: TabInfo,
        private readonly currentGameTitle: HTMLInputElement,
        private readonly saveIcon: Element,
    ) {}

    public async saveSingle() {
        for (const rowContainer of this.tabInfo.currentTab.content.children) {
            const sourceTextDiv = rowContainer.children[1] as HTMLDivElement;
            const translationTextArea = rowContainer
                .children[2] as HTMLTextAreaElement;

            this.#outputArray.push(
                sourceTextDiv.textContent!.nnormalize() +
                    SEPARATOR +
                    translationTextArea.value.nnormalize(),
            );
        }

        if (this.tabInfo.currentTab.name === "system") {
            const sourceTitle =
                this.currentGameTitle.getAttribute("source-title")!;
            const output =
                sourceTitle +
                SEPARATOR +
                (sourceTitle === this.currentGameTitle.value
                    ? ""
                    : this.currentGameTitle.value);
            this.#outputArray.push(output);
        }

        const filePath = `${this.tabInfo.currentTab.name}${TXT_EXTENSION}`;
        const savePath = join(
            this.tabInfo.currentTab.name!.startsWith("map")
                ? this.settings.tempMapsPath
                : this.settings.translationPath,
            filePath,
        );

        await writeTextFile(savePath, this.#outputArray.join("\n"));
        this.#outputArray.length = 0;
    }

    public async saveBackup() {
        if (this.#saving) {
            return;
        }

        this.#saving = true;
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

        const backupDirectoryPath = join(
            this.settings.backupPath,
            formattedDate,
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

        const entries = (await readDir(this.settings.tempMapsPath)).sort(
            (a, b) =>
                Number(a.name.slice("map".length, -TXT_EXTENSION_LENGTH)) -
                Number(b.name.slice("map".length, -TXT_EXTENSION_LENGTH)),
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

        this.saveIcon.classList.remove("animate-spin");
        this.#saving = false;
        this.#outputArray.length = 0;
        this.saved = true;
    }

    public get saving() {
        return this.#saving;
    }
}
