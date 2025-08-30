import { FileFlags } from "@enums/index";

import * as consts from "@utils/constants";

import { i18n, Messages } from "@lingui/core";

import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

export const join = (...strings: string[]): string => strings.join("/");

export const tw = (
    strings: TemplateStringsArray,
    ...values: string[]
): string => String.raw({ raw: strings }, ...values);

export function logErrorIO(path: string, err: unknown): void {
    void error(`${path}: IO error occured: ${err}`);
}

export function getFileComment(filename: string): string {
    let fileComment: string;

    if (filename.startsWith("map")) {
        fileComment = consts.MAP_COMMENT;
    } else if (filename.startsWith("system")) {
        fileComment = consts.SYSTEM_ENTRY_COMMENT;
    } else if (filename.startsWith("scripts")) {
        fileComment = consts.SCRIPT_ID_COMMENT;
    } else if (filename.startsWith("plugins")) {
        fileComment = consts.PLUGIN_ID_COMMENT;
    } else {
        fileComment = consts.EVENT_ID_COMMENT;
    }

    return fileComment;
}

/**
 * Compares two strings with different line break styles, in this case, `\#` and `\n`.
 * @param clbStr - string with custom `\#` line breaks.
 * @param dlbStr - string with default `\n` line breaks.
 */
export function lbcmp(clbStr: string, dlbStr: string): boolean {
    let i = 0,
        j = 0;

    while (i < clbStr.length && j < dlbStr.length) {
        const clbChar = clbStr[i];
        const dlbChar = dlbStr[j];

        if (clbChar === "\\" && clbStr[i + 1] === "#") {
            if (dlbChar !== "\n") {
                return false;
            }

            i += 2;
            j += 1;
        } else {
            if (clbChar !== dlbChar) {
                return false;
            }

            i += 1;
            j += 1;
        }
    }

    return i === clbStr.length && j === dlbStr.length;
}

export function logSplitError(filename: string, row: number): void {
    void error(`Couldn't split line in file ${filename} at line ${row}`);
}

export function objectIsEmpty(obj: object): boolean {
    // eslint-disable-next-line sonarjs/no-unused-vars
    for (const _ in obj) {
        return false;
    }

    return true;
}

export function getFileFlags(menu: HTMLDivElement): FileFlags {
    const disableMapProcessingCheckbox = menu.querySelector<HTMLInputElement>(
        "#disable-map-processing-checkbox",
    )!;
    const disableOtherProcessingCheckbox = menu.querySelector<HTMLInputElement>(
        "#disable-other-processing-checkbox",
    )!;
    const disableSystemProcessingCheckbox =
        menu.querySelector<HTMLInputElement>(
            "#disable-system-processing-checkbox",
        )!;
    const disablePluginProcessingCheckbox =
        menu.querySelector<HTMLInputElement>(
            "#disable-plugin-processing-checkbox",
        )!;

    let fileFlags = FileFlags.All;

    if (disableMapProcessingCheckbox.checked) {
        fileFlags &= ~FileFlags.Map;
    }

    if (disableOtherProcessingCheckbox.checked) {
        fileFlags &= ~FileFlags.Other;
    }

    if (disableSystemProcessingCheckbox.checked) {
        fileFlags &= ~FileFlags.System;
    }

    if (disablePluginProcessingCheckbox.checked) {
        fileFlags &= ~FileFlags.Scripts;
    }

    return fileFlags;
}

export function parts(string: string): string[] | null {
    const split = string.split(consts.SEPARATOR);

    if (split.length < 2) {
        return null;
    }

    return split;
}

export function joinParts(parts: string[]): string {
    return parts.join(consts.SEPARATOR);
}

export function source(container: string[] | RowContainer): string {
    if (Array.isArray(container)) {
        return container[0];
    } else {
        return container.children[1].textContent;
    }
}

export function sourceElement(container: RowContainer): HTMLDivElement {
    return container.children[1];
}

export function translation(
    container: string[] | RowContainer,
): [string, number] {
    if (Array.isArray(container)) {
        for (let i = container.length - 1; i > 0; i--) {
            if (container[i].length) {
                return [container[i], i - 1];
            }
        }
    } else {
        for (let i = container.childElementCount - 1; i >= 2; i--) {
            const element = container.children[i];

            if (element.value) {
                return [element.value, i - 2];
            }
        }
    }

    return ["", -1];
}

export function translationElement(
    container: RowContainer,
): HTMLTextAreaElement {
    for (let i = container.childElementCount - 1; i >= 2; i--) {
        const element = container.children[i];

        if (element.value) {
            return element;
        }
    }

    return container.children[2];
}

export function translations(container: string[] | RowContainer): string[] {
    if (Array.isArray(container)) {
        return container.slice(1);
    } else {
        const translations: string[] = [];

        for (let i = 2; i < container.childElementCount; i++) {
            translations.push(container.children[i].value);
        }

        return translations;
    }
}

export function rowNumberElement(container: RowContainer): HTMLSpanElement {
    return container.children[0].firstElementChild! as HTMLSpanElement;
}

export function rowNumber(container: RowContainer): number {
    return Number(container.children[0].firstElementChild!.textContent);
}

export function stripSuffix(string: string, suffix: string): string {
    if (string.endsWith(suffix)) {
        return string.slice(0, -suffix.length);
    }

    return string;
}

export function stripPrefix(string: string, suffix: string): string {
    if (string.startsWith(suffix)) {
        return string.slice(suffix.length);
    }

    return string;
}

export function lines(input: string): string[] {
    const result: string[] = [];
    let currentLine = "";

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const nextChar = input[i + 1];

        if (char === "\r") {
            result.push(currentLine);
            currentLine = "";

            if (nextChar === "\n") {
                // eslint-disable-next-line sonarjs/updated-loop-counter
                i++;
            }
        } else if (char === "\n") {
            result.push(currentLine);
            currentLine = "";
        } else {
            currentLine += char;
        }
    }

    result.push(currentLine); // Push the last line
    return result;
}

export function countLines(input: string): number {
    let count = 1;

    for (let i = 0; i < input.length; i++) {
        if (input[i] === "\r") {
            count++;

            if (input[i + 1] === "\n") {
                // Skip, because already accounted.
                // eslint-disable-next-line sonarjs/updated-loop-counter
                i++;
            }
        } else if (input[i] === "\n") {
            count++;
        }
    }

    return count;
}

export function count(input: string, pattern: string): number {
    let count = 0;
    let pos = 0;

    while ((pos = input.indexOf(pattern, pos)) !== -1) {
        count++;
        pos += pattern.length;
    }

    return count;
}

export function dlbtoclb(input: string): string {
    return input.replaceAll("\n", consts.NEW_LINE);
}

export function clbtodlb(input: string): string {
    return input.replaceAll(consts.NEW_LINE, "\n");
}

export function calculateHeight(textarea: HTMLTextAreaElement): void {
    const { lineHeight, paddingTop } = window.getComputedStyle(textarea);

    const newHeight =
        countLines(textarea.value) * Number.parseFloat(lineHeight) +
        Number.parseFloat(paddingTop) * 2;

    for (const child of (textarea.parentElement?.children ??
        []) as HTMLCollectionOf<HTMLElement>) {
        child.style.height = `${newHeight}px`;
    }
}

export function toggleMultiple(element: Element, ...classes: string[]): void {
    for (const className of classes) {
        element.classList.toggle(className);
    }
}

export function applyTheme(themes: Themes, theme: string): void {
    for (const [property, value] of Object.entries(themes[theme])) {
        document.documentElement.style.setProperty(property, value);
    }
}

export async function initializeLocalization(
    window: "About" | "Main" | "Settings",
    locale: string,
): Promise<void> {
    const { messages } = JSON.parse(
        await readTextFile(
            await resolveResource(
                `resources/locales/${locale}/${window}/messages.json`,
            ),
        ),
    ) as { messages: Messages };
    i18n.load(locale, messages);
    i18n.activate(locale);
}

export function retranslate(): void {
    for (const element of document.querySelectorAll<HTMLElement>(
        "[data-i18n]",
    )) {
        element.textContent = i18n._(element.getAttribute("data-i18n")!);
    }

    for (const element of document.querySelectorAll<HTMLElement>(
        "[data-i18n-title]",
    )) {
        element.title = i18n._(element.getAttribute("data-i18n-title")!);
    }

    for (const element of document.querySelectorAll<HTMLInputElement>(
        "[data-i18n-placeholder]",
    )) {
        element.placeholder = i18n._(
            element.getAttribute("data-i18n-placeholder")!,
        );
    }
}
