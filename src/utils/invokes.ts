import * as utils from "@utils/functions";

import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

export async function read(args: ReadOptions): Promise<string[]> {
    return await invoke<string[]>("read", args).catch(error);
}

export async function write(args: WriteOptions): Promise<string> {
    return await invoke<string>("write", args);
}

export async function purge(args: PurgeOptions): Promise<void> {
    await invoke("purge", args).catch(error);
}

export async function escapeText(text: string): Promise<string> {
    return invoke<string>("escape_text", { text });
}

export async function readLastLine(filePath: string): Promise<string> {
    return await invoke<string>("read_last_line", { filePath });
}

export async function expandScope(dir: string): Promise<void> {
    await invoke("expand_scope", { dir });
}

export async function translate(args: {
    text: string;
    to: Intl.UnicodeBCP47LocaleIdentifier;
    from: Intl.UnicodeBCP47LocaleIdentifier;
    normalize: boolean;
}): Promise<string | undefined> {
    args.text = args.text.replaceAll("\n", " ");

    return (await invoke<string>("translate_text", args).catch(error)) as
        | string
        | undefined;
}

export async function extractArchive(projectPath: string): Promise<boolean> {
    let extracted = false;

    for (const archive of ["Game.rgssad", "Game.rgss2a", "Game.rgss3a"]) {
        const archivePath = utils.join(projectPath, archive);

        if (await exists(archivePath)) {
            await invoke("extract_archive", { archivePath, projectPath }).catch(
                error,
            );
            extracted = true;
            break;
        }
    }

    return extracted;
}

export async function walkDir(dir: string): Promise<string[]> {
    return await invoke("walk_dir", { dir });
}
