import { invoke } from "@tauri-apps/api/core";

export async function read(args: ReadArgs) {
    await invoke("read", args);
}

export async function compile(args: CompileArgs): Promise<string> {
    return await invoke<string>("compile", args);
}

export async function escapeText(args: { text: string }): Promise<string> {
    return await invoke<string>("escape_text", args);
}

export async function readLastLine(args: { filePath: string }): Promise<string> {
    return await invoke<string>("read_last_line", args);
}

export async function addToScope(args: { path: string }) {
    await invoke("add_to_scope", args);
}

export async function translateText(args: {
    text: string;
    to: Intl.UnicodeBCP47LocaleIdentifier;
    from: Intl.UnicodeBCP47LocaleIdentifier;
}): Promise<string> {
    return await invoke<string>("translate_text", args);
}
