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
        const translations: string[] = new Array(
            container.childElementCount - 2,
        );

        for (let i = 2; i < container.childElementCount; i++) {
            translations[i - 2] = container.children[i].value;
        }

        return translations;
    }
}

export function translationElements(
    container: RowContainer,
): HTMLTextAreaElement[] {
    const translations: HTMLTextAreaElement[] = new Array(
        container.childElementCount - 2,
    );

    for (let i = 2; i < container.childElementCount; i++) {
        translations[i - 2] = container.children[i];
    }

    return translations;
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

export function* parseBlocks(
    lines: string[],
): IterableIterator<[string, SourceBlock]> {
    let currentID: string | null = null;
    let currentName: string | null = null;
    let content: string[] = [];

    for (const line of lines) {
        if (line.startsWith("<!-- ID --><#>")) {
            if (currentID !== null && currentName !== null) {
                yield [
                    currentID,
                    {
                        name: currentName,
                        strings: content,
                    },
                ];
            }

            currentID = line.slice("<!-- ID --><#>".length).trim();
            currentName = null;
            content = [];
            continue;
        }

        if (line.startsWith("<!-- NAME --><#>")) {
            currentName = line.slice("<!-- NAME --><#>".length).trim();
            continue;
        }

        if (currentID !== null && currentName !== null) {
            content.push(line);
        }
    }

    if (currentID !== null && currentName !== null) {
        yield [
            currentID,
            {
                name: currentName,
                strings: content,
            },
        ];
    }
}

export function deepAssign(
    target: Record<string, unknown>,
    source: Record<string, unknown> | null,
): void {
    if (source == null) {
        return;
    }

    for (const key in source) {
        const sourceField = source[key];
        const targetField = target[key];

        if (targetField === undefined) {
            target[key] = sourceField;
            continue;
        }

        if (Array.isArray(sourceField)) {
            for (const [i, val] of sourceField.entries()) {
                (target[key] as unknown[])[i] = val;
            }
            continue;
        }

        if (typeof sourceField === "object") {
            deepAssign(
                target[key] as Record<string, unknown>,
                sourceField as Record<string, unknown>,
            );
            continue;
        }

        target[key] = sourceField;
    }
}
