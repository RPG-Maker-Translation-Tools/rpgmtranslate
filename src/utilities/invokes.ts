import { invoke } from "@tauri-apps/api/core";
import { EngineType, ProcessingMode } from "../types/enums";

export async function invokeRead(
    projectPath: string,
    originalDir: string,
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

export async function invokeCompile(
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

export async function invokeEscapeText(args: {
    text: string;
}): Promise<string> {
    return await invoke<string>("escape_text", args);
}

export async function invokeReadLastLine(args: {
    filePath: string;
}): Promise<string> {
    return await invoke<string>("read_last_line", args);
}

export async function invokeAddToScope(args: { path: string }) {
    await invoke("add_to_scope", args);
}

export async function invokeTranslateText(args: {
    text: string;
    to: Intl.UnicodeBCP47LocaleIdentifier;
    from: Intl.UnicodeBCP47LocaleIdentifier;
    replace: boolean;
}): Promise<string> {
    return await invoke<string>("translate_text", args);
}

export async function invokeExtractArchive(args: {
    inputPath: string;
    outputPath: string;
    processingMode: ProcessingMode;
}) {
    await invoke("extract_archive", args);
}

export async function invokeWalkDir(dir: string): Promise<string[]> {
    return await invoke("walk_dir", { dir });
}

export async function invokePurge(
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

export async function invokeConvertToLF(translationPath: string) {
    await invoke("convert_to_lf", {
        translationPath,
    });
}
