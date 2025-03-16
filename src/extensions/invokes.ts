import { invoke } from "@tauri-apps/api/core";
import { EngineType, ProcessingMode } from "../types/enums";

export async function read(
    projectPath: string,
    originalDir: string,
    gameTitle: string,
    mapsProcessingMode: number,
    romanize: boolean,
    disableCustomProcessing: boolean,
    disableProcessing: boolean[],
    processingMode: ProcessingMode,
    engineType: EngineType,
    ignore: boolean,
    trim: boolean,
    sort: boolean,
) {
    await invoke("read", {
        projectPath,
        originalDir,
        gameTitle,
        mapsProcessingMode,
        romanize,
        disableCustomProcessing,
        disableProcessing,
        processingMode,
        engineType,
        ignore,
        trim,
        sort,
    });
}

export async function compile(
    projectPath: string,
    originalDir: string,
    outputPath: string,
    gameTitle: string,
    mapsProcessingMode: number,
    romanize: boolean,
    disableCustomProcessing: boolean,
    disableProcessing: boolean[],
    engineType: EngineType,
    trim: boolean,
): Promise<string> {
    return await invoke<string>("compile", {
        projectPath,
        originalDir,
        outputPath,
        gameTitle,
        mapsProcessingMode,
        romanize,
        disableCustomProcessing,
        disableProcessing,
        engineType,
        trim,
    });
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
    replace: boolean;
}): Promise<string> {
    return await invoke<string>("translate_text", args);
}

export async function extractArchive(args: { inputPath: string; outputPath: string; processingMode: ProcessingMode }) {
    await invoke("extract_archive", args);
}

export async function appendToEnd(args: { path: string; text: string }) {
    await invoke("append_to_end", args);
}

export async function walkDir(dir: string): Promise<string[]> {
    return await invoke("walk_dir", { dir });
}

export async function purge(
    projectPath: string,
    originalDir: string,
    gameTitle: string,
    mapsProcessingMode: number,
    romanize: boolean,
    disableCustomProcessing: boolean,
    disableProcessing: boolean[],
    engineType: EngineType,
    stat: boolean,
    leaveFilled: boolean,
    purgeEmpty: boolean,
    createIgnore: boolean,
    trim: boolean,
) {
    await invoke("purge", {
        projectPath,
        originalDir,
        gameTitle,
        mapsProcessingMode,
        romanize,
        disableCustomProcessing,
        disableProcessing,
        engineType,
        stat,
        leaveFilled,
        purgeEmpty,
        createIgnore,
        trim,
    });
}

export async function convertToLF(translationPath: string) {
    await invoke("convert_to_lf", {
        translationPath,
    });
}
