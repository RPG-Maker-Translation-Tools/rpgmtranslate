import {
    TokenizerAlgorithm,
    TokenizerAlgorithmBCP47,
    TokenizerAlgorithmNames,
    TranslationEndpoint,
} from "@lib/enums";
import * as utils from "@utils/functions";

import { invoke } from "@tauri-apps/api/core";
import {
    DirEntry,
    exists,
    mkdir as mkdir_,
    MkdirOptions,
    readDir as readDir_,
    ReadDirOptions,
    readFile as readFile_,
    ReadFileOptions,
    readTextFile as readTextFile_,
    remove as remove_,
    RemoveOptions,
    WriteFileOptions,
    writeTextFile as writeTextFile_,
} from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

interface InvokeOptions {
    sourcePath: string;
    translationPath: string;
    engineType: import("@enums/EngineType").EngineType;
    duplicateMode: import("@enums/DuplicateMode").DuplicateMode;
    skipFiles: import("@enums/FileFlags").FileFlags;
    flags: import("@enums/BaseFlags").BaseFlags;
    skipMaps: number[];
    skipEvents: [import("@enums/RPGMFileType").RPGMFileType, number[]][];
    hashes: string[];
}

interface ReadOptions extends InvokeOptions {
    readMode: import("@enums/ReadMode").ReadMode;
    projectPath: string;
    mapEvents: boolean;
}

interface WriteOptions extends InvokeOptions {
    outputPath: string;
    gameTitle: string;
}

interface PurgeOptions extends InvokeOptions {
    gameTitle: string;
}

export interface TranslateArgs {
    translationEndpoint: TranslationEndpoint;
    model: string;
    projectContext: string;
    localContext: string;
    files: SourceFiles;
    glossary: {
        term: string;
        translation: string;
        note: string;
    }[];
    sourceLanguage: TokenizerAlgorithm | string;
    translationLanguage: TokenizerAlgorithm | string;
    apiKey: string;
    systemPrompt: string;
    yandexFolderId: string;
    tokenLimit: number;
    temperature: number;
    thinking: boolean;
    normalize: boolean;
}

interface MatchArgs {
    sourceHaystack: string;
    sourceNeedle: string;
    sourceMode: MatchModeData;

    trHaystack: string;
    trNeedle: string;
    trMode: MatchModeData;

    sourceAlgorithm: TokenizerAlgorithm;
    trAlgorithm: TokenizerAlgorithm;
}

export function isOk<T>(r: Result<T>): boolean {
    return r[0] === undefined;
}

export function isErr<T>(r: Result<T>): boolean {
    return r[0] !== undefined;
}

async function fsCall<T>(fn: () => Promise<T>): Promise<Result<T>> {
    try {
        const value = await fn();
        return [undefined, value];
    } catch (err) {
        return [err as string];
    }
}

export async function fallibleInvoke<T = void>(
    command: string,
    args?: Record<string, unknown>,
): Promise<Result<T>> {
    try {
        const value = await invoke<T>(command, args);
        return [undefined, value];
    } catch (err) {
        return [err as string];
    }
}

export async function read(args: ReadOptions): Promise<Result<string[]>> {
    return await fallibleInvoke(
        "read",
        args as unknown as Record<string, unknown>,
    );
}

export async function write(args: WriteOptions): Promise<Result<string>> {
    return await fallibleInvoke(
        "write",
        args as unknown as Record<string, unknown>,
    );
}

export async function purge(args: PurgeOptions): Promise<Result<void>> {
    return await fallibleInvoke(
        "purge",
        args as unknown as Record<string, unknown>,
    );
}

export async function readLastLine(filePath: string): Promise<string> {
    return await invoke("read_last_line", { filePath });
}

export async function expandScope(dir: string): Promise<void> {
    await invoke("expand_scope", { dir });
}

export async function getModels(
    endpoint: TranslationEndpoint,
    apiKey: string,
): Promise<Result<string[]>> {
    return await fallibleInvoke("get_models", {
        endpoint,
        apiKey,
    });
}

export async function translate(
    args: TranslateArgs,
): Promise<Result<TranslatedFiles>> {
    args.sourceLanguage =
        TokenizerAlgorithmBCP47[args.sourceLanguage as TokenizerAlgorithm];
    args.translationLanguage =
        TokenizerAlgorithmBCP47[args.translationLanguage as TokenizerAlgorithm];

    return await fallibleInvoke(
        "translate",
        args as unknown as Record<string, unknown>,
    );
}

export async function extractArchive(projectPath: string): Promise<boolean> {
    let extracted = false;

    for (const archive of ["Game.rgssad", "Game.rgss2a", "Game.rgss3a"]) {
        const archivePath = utils.join(projectPath, archive);

        if (await exists(archivePath)) {
            const result = await fallibleInvoke("extract_archive", {
                archivePath,
                projectPath,
            });

            if (isErr(result)) {
                void error(result[0]!);
            }

            extracted = true;
            break;
        }
    }

    return extracted;
}

export async function walkDir(dir: string): Promise<string[]> {
    return await invoke("walk_dir", { dir });
}

export async function findMatch(args: MatchArgs): Promise<Result<MatchResult>> {
    return await fallibleInvoke(
        "find_match",
        args as unknown as Record<string, unknown>,
    );
}

export async function findAllMatches(
    args: MatchArgs,
): Promise<Result<[MatchResult[], MatchResult[]] | null>> {
    return await fallibleInvoke(
        "find_all_matches",
        args as unknown as Record<string, unknown>,
    );
}

export function readTextFile(
    path: string,
    options?: ReadFileOptions,
): Promise<Result<string>> {
    return fsCall(() => readTextFile_(path, options));
}

export function writeTextFile(
    path: string,
    contents: string,
    options?: WriteFileOptions,
): Promise<Result<void>> {
    return fsCall(() => writeTextFile_(path, contents, options));
}

export function readFile(
    path: string,
    options?: ReadFileOptions,
): Promise<Result<Uint8Array<ArrayBuffer>>> {
    return fsCall(() => readFile_(path, options));
}

export function mkdir(
    path: string,
    options?: MkdirOptions,
): Promise<Result<void>> {
    return fsCall(() => mkdir_(path, options));
}

export function readDir(
    path: string,
    options?: ReadDirOptions,
): Promise<Result<DirEntry[]>> {
    return fsCall(() => readDir_(path, options));
}

export function remove(
    path: string,
    options?: RemoveOptions,
): Promise<Result<void>> {
    return fsCall(() => remove_(path, options));
}

export function detectLang(str: string): void {
    void invoke("detect_lang", { str });
}

export async function getLang(): Promise<string | undefined> {
    const lang = await invoke<string>("get_lang");
    return TokenizerAlgorithmNames.find((e) => e === lang);
}
