import fs from "fs";
import path from "path";

function extractMainMessagesForWindow(windowName: string): void {
    const messages: string[] = [];
    const htmlPath = path.join(
        "./src/windows",
        windowName.toLowerCase(),
        `${windowName}Window.html`,
    );

    const tsPath = path.join(
        "./src/windows",
        windowName.toLowerCase(),
        "html.ts",
    );

    const content = fs.readFileSync(htmlPath, "utf8");

    let match;

    const dataRegex = /data-i18n="([^"]+)"/g;
    while ((match = dataRegex.exec(content)) !== null) {
        messages.push(match[1]);
    }

    const titleRegex = /data-i18n-title="([^"]+)"/g;
    while ((match = titleRegex.exec(content)) !== null) {
        messages.push(match[1]);
    }

    const placeholderRegex = /data-i18n-placeholder="([^"]+)"/g;
    while ((match = placeholderRegex.exec(content)) !== null) {
        messages.push(match[1]);
    }

    const lines = generateTs(messages);
    fs.writeFileSync(tsPath, lines.join("\n"), "utf8");

    console.log(`✅ Generated ${tsPath} with ${messages.length} messages.`);
}

function generateTs(messages: string[]): string[] {
    const lines = [
        `/* eslint-disable */`,
        `// This file is auto-generated. Do not edit directly.`,
        `// Extracted from HTML data-i18n attributes.`,
        `import { t } from "@lingui/core/macro";`,
        `export function _htmlTranslations() {`,
        `    // These calls exist purely so LinguiJS can extract them`,
        ...messages.map((msg) => `    t\`${msg}\`;`),
        `}`,
    ];

    return lines;
}

function extractAllWindows(): void {
    const windows = ["Main", "About", "Settings"];
    for (const name of windows) {
        extractMainMessagesForWindow(name);
    }
}

extractAllWindows();
