import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export async function invokeRead(args: ReadCommandOptions) {
    await invoke("read", args);
}

export async function invokeCompile(args: CompileCommandOptions): Promise<string> {
    return await invoke<string>("compile", args);
}

export async function invokeEscapeText(args: { text: string }): Promise<string> {
    return await invoke<string>("escape_text", args);
}

export async function invokeReadLastLine(args: { filePath: string }): Promise<string> {
    return await invoke<string>("read_last_line", args);
}

export async function invokeAddToScope(args: { window: WebviewWindow; path: string }) {
    await invoke("add_to_scope", args);
}

export async function invokeTranslateText(args: { text: string; to: "ru"; from: "en" }): Promise<string> {
    return await invoke<string>("translate_text", args);
}
