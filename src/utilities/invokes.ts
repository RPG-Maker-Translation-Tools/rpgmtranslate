import { invoke } from "@tauri-apps/api/core";
import { error } from "@tauri-apps/plugin-log";

export async function invokeRead(args: ReadOptions) {
    await invoke("read", args).catch(error);
}

export async function invokeWrite(args: WriteOptions): Promise<string> {
    return await invoke<string>("write", args);
}

export async function invokePurge(args: PurgeOptions) {
    await invoke("purge", args).catch(error);
}

export async function invokeEscapeText(text: string): Promise<string> {
    return invoke<string>("escape_text", { text });
}

export async function invokeReadLastLine(filePath: string): Promise<string> {
    return await invoke<string>("read_last_line", { filePath });
}

export async function expandScope(dir: string) {
    await invoke("expand_scope", { dir });
}

export async function invokeTranslateText(args: {
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

export async function invokeExtractArchive(
    inputPath: string,
    outputPath: string,
) {
    await invoke("extract_archive", { inputPath, outputPath }).catch(error);
}

export async function invokeWalkDir(dir: string): Promise<string[]> {
    return await invoke("walk_dir", { dir });
}
