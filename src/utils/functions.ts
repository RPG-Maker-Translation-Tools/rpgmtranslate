import { FileFlags } from "@enums/index";
import { SearchAction } from "@enums/SearchAction";
import { SearchFlags } from "@enums/SearchFlags";
import { escapeText } from "@utils/invokes";

import * as consts from "@utils/constants";
import * as _ from "radashi";
import XRegExp from "xregexp";

import { i18n, Messages } from "@lingui/core";

import { resolveResource } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { error } from "@tauri-apps/plugin-log";

export function animateProgressText(
    progressText: HTMLElement,
    interval = consts.SECOND_MS / 2,
) {
    // eslint-disable-next-line sonarjs/slow-regex
    const baseText = progressText.textContent.replace(/\.+$/, "");
    let dots = 0;

    function updateText() {
        progressText.textContent = baseText + ".".repeat(dots);
        dots = (dots + 1) % 4;
    }

    return setInterval(updateText, interval);
}

export const join = (...strings: string[]): string => strings.join("/");

export const tw = (
    strings: TemplateStringsArray,
    ...values: string[]
): string => String.raw({ raw: strings }, ...values);

export async function createRegExp(
    text: string,
    searchFlagsObject: SearchFlagsObject,
    searchAction: SearchAction,
): Promise<RegExp | null> {
    text = text.trim();
    if (!text) {
        return null;
    }

    const searchFlags = searchFlagsObject.flags;

    let expression =
        searchFlags & SearchFlags.RegExp ? text : await escapeText(text);

    if (searchFlags & SearchFlags.WholeWord) {
        expression = `(?<!\\p{L})${expression}(?!\\p{L})`;
    }

    if (searchAction === SearchAction.Put) {
        expression = `^${expression}$`;
    }

    const flags = searchFlags & SearchFlags.CaseSensitive ? "g" : "gi";

    try {
        return XRegExp(expression, flags);
    } catch (err) {
        await message(`Invalid regular expression. (${text}), ${err})`);
        return null;
    }
}

export function logErrorIO(path: string, err: unknown) {
    void error(`${path}: IO error occured: ${err}`);
}

export function getFileComment(filename: string): string {
    let fileComment: string;

    if (filename.startsWith("map")) {
        fileComment = consts.MAP_ID_COMMENT;
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

export function logSplitError(filename: string, row: number) {
    void error(`Couldn't split line in file ${filename} at line ${row}`);
}

export function objectIsEmpty(obj: object) {
    // eslint-disable-next-line sonarjs/no-unused-vars
    for (const _ in obj) {
        return false;
    }

    return true;
}

export function getFileFlags(menu: HTMLDivElement): FileFlags {
    const disableMapProcessingCheckbox = menu.querySelector(
        "#disable-map-processing-checkbox",
    )!;
    const disableOtherProcessingCheckbox = menu.querySelector(
        "#disable-other-processing-checkbox",
    )!;
    const disableSystemProcessingCheckbox = menu.querySelector(
        "#disable-system-processing-checkbox",
    )!;
    const disablePluginProcessingCheckbox = menu.querySelector(
        "#disable-plugin-processing-checkbox",
    )!;

    let fileFlags = FileFlags.All;

    if (!_.isEmpty(disableMapProcessingCheckbox.textContent)) {
        fileFlags &= ~FileFlags.Map;
    }

    if (!_.isEmpty(disableOtherProcessingCheckbox.textContent)) {
        fileFlags &= ~FileFlags.Other;
    }

    if (!_.isEmpty(disableSystemProcessingCheckbox.textContent)) {
        fileFlags &= ~FileFlags.System;
    }

    if (!_.isEmpty(disablePluginProcessingCheckbox.textContent)) {
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

export function source(container: string[] | HTMLDivElement): string {
    if (Array.isArray(container)) {
        return container[0];
    } else {
        return container.children[1].textContent;
    }
}

export function sourceElement(container: HTMLDivElement): HTMLDivElement {
    return container.children[1] as HTMLDivElement;
}

export function translation(container: string[] | HTMLDivElement): string {
    if (Array.isArray(container)) {
        return (
            container.slice(1).findLast((translation) => {
                return !_.isEmpty(translation);
            }) ?? ""
        );
    } else {
        const children = Array.from(
            container.children as HTMLCollectionOf<HTMLTextAreaElement>,
        ).slice(2);

        const element = children.findLast((element) => {
            return !_.isEmpty(element.value);
        });

        if (element) {
            return element.value;
        } else {
            return "";
        }
    }
}

export function translationElement(container: HTMLDivElement) {
    const children: HTMLTextAreaElement[] = Array.prototype.slice.call(
        container.children,
        2,
    );

    const element = children.findLast((element) => {
        return !_.isEmpty(element.value);
    });

    if (element) {
        return element;
    } else {
        return children[0];
    }
}

export function translations(container: string[] | HTMLDivElement): string[] {
    if (Array.isArray(container)) {
        return container.slice(1);
    } else {
        return Array.prototype.slice
            .call(container.children, 2)
            .map((element: HTMLTextAreaElement) => element.value);
    }
}

export function rowNumberElement(container: HTMLDivElement): HTMLSpanElement {
    return container.children[0].firstElementChild! as HTMLSpanElement;
}

export function rowNumber(container: HTMLDivElement) {
    return Number(container.children[0].firstElementChild!.textContent);
}

export function stripSuffix(string: string, suffix: string) {
    if (string.endsWith(suffix)) {
        return string.slice(0, -suffix.length);
    }

    return string;
}

export function stripPrefix(string: string, suffix: string) {
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

export function countLines(input: string) {
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

export function count(input: string, pattern: string) {
    let count = 0;
    let pos = 0;

    while ((pos = input.indexOf(pattern, pos)) !== -1) {
        count++;
        pos += pattern.length;
    }

    return count;
}

export function dlbtoclb(input: string) {
    return input.replaceAll("\n", consts.NEW_LINE);
}

export function clbtodlb(input: string) {
    return input.replaceAll(consts.NEW_LINE, "\n");
}

export function calculateHeight(textarea: HTMLTextAreaElement) {
    const { lineHeight, paddingTop } = window.getComputedStyle(textarea);

    const newHeight =
        countLines(textarea.value) * Number.parseFloat(lineHeight) +
        Number.parseFloat(paddingTop) * 2;

    for (const child of (textarea.parentElement?.children ??
        []) as HTMLCollectionOf<HTMLElement>) {
        child.style.height = `${newHeight}px`;
    }
}

export function toggleMultiple(element: Element, ...classes: string[]) {
    for (const className of classes) {
        element.classList.toggle(className);
    }
}

export function applyTheme(themes: Themes, theme: string) {
    for (const [property, value] of Object.entries(themes[theme])) {
        document.documentElement.style.setProperty(property, value);
    }
}

export async function i18nActivate(
    window: "About" | "Main" | "Settings",
    locale: string,
) {
    const { messages } = JSON.parse(
        await readTextFile(
            await resolveResource(
                `resources/locales/${locale}/${window}/messages.json`,
            ),
        ),
    ) as { messages: Messages };
    i18n.load(locale, messages);
    i18n.activate(locale);
    retranslate();
}

export function retranslate() {
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
