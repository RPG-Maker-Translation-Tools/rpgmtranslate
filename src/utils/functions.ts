import * as consts from "@utils/constants";
import { isErr, readTextFile } from "@utils/invokes";

import { i18n, Messages } from "@lingui/core";

import { resolveResource } from "@tauri-apps/api/path";
import { error } from "@tauri-apps/plugin-log";

export const join = (...strings: string[]): string => strings.join("/");

export const tw = (
    strings: TemplateStringsArray,
    ...values: string[]
): string => String.raw({ raw: strings }, ...values);

/**
 * Compares two strings with different line break styles, in this case, `\#` and `\n`.
 * @param customLBString - string with custom `\#` line breaks.
 * @param LFString - string with default `\n` line breaks.
 */
export function compareLB(customLBString: string, LFString: string): boolean {
    let i = 0,
        j = 0;

    while (i < customLBString.length && j < LFString.length) {
        const customLBChar = customLBString[i];
        const lfChar = LFString[j];

        if (customLBChar === "\\" && customLBString[i + 1] === "#") {
            if (lfChar !== "\n") {
                return false;
            }

            i += 2;
            j += 1;
        } else {
            if (customLBChar !== lfChar) {
                return false;
            }

            i += 1;
            j += 1;
        }
    }

    return i === customLBString.length && j === LFString.length;
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

export function source(container: string[] | TabRow): string {
    if (Array.isArray(container)) {
        return container[0];
    } else {
        return container.children[1].textContent;
    }
}

export function sourceElement(container: TabRow): HTMLDivElement {
    return container.children[1];
}

export function translation(container: string[] | TabRow): [string, number] {
    if (Array.isArray(container)) {
        for (let i = container.length - 1; i > 0; i--) {
            if (container[i].length) {
                return [container[i], i - 1];
            }
        }
    } else {
        const children = container.children;

        for (let i = container.childElementCount - 1; i >= 2; i--) {
            const element = children[i].querySelector("textarea")!;

            if (element.value) {
                return [element.value, i - 2];
            }
        }
    }

    return ["", -1];
}

export function translationElement(container: TabRow): HTMLTextAreaElement {
    for (let i = container.childElementCount - 1; i >= 2; i--) {
        const element = container.querySelector("textarea")!;

        if (element.value) {
            return element;
        }
    }

    return container.querySelector("textarea")!;
}

export function translations(container: string[] | TabRow): string[] {
    if (Array.isArray(container)) {
        return container.slice(1);
    } else {
        const translations: string[] = new Array(
            container.childElementCount - 2,
        );

        const children = container.children;

        for (let i = 2; i < container.childElementCount; i++) {
            translations[i - 2] = children[i].querySelector("textarea")!.value;
        }

        return translations;
    }
}

export function translationElements(container: TabRow): HTMLTextAreaElement[] {
    const translations: HTMLTextAreaElement[] = new Array(
        container.childElementCount - 2,
    );

    for (let i = 2; i < container.childElementCount; i++) {
        translations[i - 2] = container.querySelector("textarea")!;
    }

    return translations;
}

export function rowNumberElement(container: TabRow): HTMLSpanElement {
    return container.querySelector("span")!;
}

export function rowNumber(container: TabRow): number {
    return Number(container.querySelector("span")!.innerHTML);
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

export function toCustomLB(input: string): string {
    return input.replaceAll("\n", consts.NEW_LINE);
}

export function toLF(input: string): string {
    return input.replaceAll(consts.NEW_LINE, "\n");
}

export function calculateHeight(textarea: HTMLTextAreaElement): void {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
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
    window: "about" | "main" | "settings",
    locale: string,
): Promise<void> {
    const content = await readTextFile(
        await resolveResource(
            `resources/locales/${locale}/${window}/messages.json`,
        ),
    );

    if (isErr(content)) {
        void error(content[0]!);
    } else {
        const { messages } = JSON.parse(content[1]!) as { messages: Messages };
        i18n.load(locale, messages);
        i18n.activate(locale);
    }
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

export function deepAssign(
    dest: Record<string, unknown>,
    src: Record<string, unknown> | null,
): void {
    if (src == null) {
        return;
    }

    for (const key in src) {
        const srcField = src[key];
        const destField = dest[key];

        if (destField === undefined && srcField !== undefined) {
            dest[key] = srcField;
            continue;
        }

        if (Array.isArray(srcField)) {
            if (!Array.isArray(destField)) {
                dest[key] = new Array(srcField.length);
            }

            for (let i = 0; i < srcField.length; i++) {
                (dest[key] as unknown[])[i] = srcField[i];
            }
            continue;
        }

        if (typeof srcField === "object") {
            deepAssign(
                dest[key] as Record<string, unknown>,
                srcField as Record<string, unknown>,
            );
            continue;
        }

        dest[key] = srcField;
    }
}

export function rangeContains(ranges: FileRange, value: number): boolean {
    // Edge case: if range is empty, all values are valid
    if (ranges.length === 0) {
        return true;
    }

    let left = 0;
    let right = ranges.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const range = ranges[mid];

        if (value < range[0]) {
            right = mid - 1;
        } else if (value > range[1]) {
            left = mid + 1;
        } else {
            return true;
        }
    }

    return false;
}
