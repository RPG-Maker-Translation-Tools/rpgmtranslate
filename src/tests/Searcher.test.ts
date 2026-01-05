import { ProjectSettings } from "@lib/classes";
import { SearchAction, SearchFlags, SearchMode } from "@lib/enums";
import { i18n } from "@lingui/core";
import * as fs from "@tauri-apps/plugin-fs";
import { DEFAULT_COLUMN_WIDTH } from "@utils/constants";
import { Searcher } from "@windows/main/components";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

const firstRow = {
    source: "source 1",
    firstTranslation: "translation 1",
    secondTranslation: "translation 1 1",
};

const secondRow = {
    source: "source 2",
    firstTranslation: "translation 2",
    secondTranslation: "translation 2 2",
};

const thirdRow = {
    source: "source 3",
    firstTranslation: "translation 3",
    secondTranslation: "translation 3 3",
};

const predicate = "1";

const rowsData = [firstRow, secondRow, thirdRow];

const rowsHTML = document.createElement("div");
rowsHTML.innerHTML = rowsData
    .map(
        (row) => `
            <div>
                <div></div>
                <div>${row.source}</div>
                <textarea>${row.firstTranslation}</textarea>
                <textarea>${row.secondTranslation}</textarea>
            </div>
        `,
    )
    .join("");

vi.mock(import("@utils/invokes"), async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual };
});

vi.mock(import("@tauri-apps/plugin-fs"), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        readTextFile: vi.fn(),
        writeTextFile: vi.fn(),
        readDir: vi.fn(),
    };
});

interface Scenario {
    label: string;
    mode: SearchMode;
    index: number;
}

const scenarios: Scenario[] = [
    {
        label: "source with rightmost translation",
        mode: SearchMode.Source,
        index: -1,
    },
    {
        label: "source with first translation",
        mode: SearchMode.Source,
        index: 0,
    },
    {
        label: "source with second translation",
        mode: SearchMode.Source,
        index: 1,
    },
    {
        label: "rightmost translation",
        mode: SearchMode.Translation,
        index: -1,
    },
    {
        label: "first translation",
        mode: SearchMode.Translation,
        index: 0,
    },
    {
        label: "second translation",
        mode: SearchMode.Translation,
        index: 1,
    },
];

function adjustReplaceKeys(
    expected: Record<string, number[]>,
    external: boolean,
): Record<string, number[]> {
    if (!external) {
        return expected;
    }

    const adjusted: Record<string, number[]> = {};

    for (const [key, val] of Object.entries(expected)) {
        adjusted[key.replace(/^tab-/, "tab.txt-")] = val;
    }

    return adjusted;
}

function buildExpected(
    mode: SearchMode,
    action: SearchAction,
    index: number,
    predicate: string,
): {
    search: string | null;
    replace: Record<string, number[]>;
    put: Record<string, number[]>;
} {
    const rows = rowsHTML.children as Rows;
    const results: string[][][] = [];
    const replace: Record<string, number[]> = {};
    const put: Record<string, number[]> = {};

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];

        const source = row.children[1].textContent;
        const translations = [row.children[2].value, row.children[3].value];

        if (action === SearchAction.Put) {
            if (mode === SearchMode.Translation) {
                break;
            }

            if (source === predicate) {
                put["tab-undefined-0"] = [rowIndex + 1];
            }

            continue;
        }

        if (mode === SearchMode.Source && source.includes(predicate)) {
            const highlighted = source.replace(
                new RegExp(predicate, "g"),
                `<span class="bg-third">${predicate}</span>`,
            );

            results.push([
                [
                    `tab - undefined - source - Source (0) - ${rowIndex + 1}`,
                    highlighted,
                ],
            ]);

            if (index === -1) {
                results[0].push([
                    `tab - undefined - translation - Translation (${translations.length}) - ${rowIndex + 1}`,
                    translations.at(-1)!,
                ]);
            } else {
                for (
                    let columnIndex = 0;
                    columnIndex < translations.length;
                    columnIndex++
                ) {
                    const translation = translations[columnIndex];

                    if (index !== columnIndex) {
                        continue;
                    }

                    if (translation.includes(predicate)) {
                        results[0].push([
                            `tab - undefined - translation - Translation (${columnIndex + 1}) - ${rowIndex + 1}`,
                            translation,
                        ]);
                    }
                }
            }
        }

        if (mode === SearchMode.Translation) {
            for (
                let columnIndex = 0;
                columnIndex < translations.length;
                columnIndex++
            ) {
                const translation = translations[columnIndex];

                if (index !== -1 && index !== columnIndex) {
                    continue;
                }

                if (translation.includes(predicate)) {
                    const highlighted = translation.replace(
                        new RegExp(predicate, "g"),
                        `<span class="bg-third">${predicate}</span>`,
                    );

                    results.push([
                        [
                            `tab - undefined - translation - Translation (${columnIndex + 1}) - ${rowIndex + 1}`,
                            highlighted,
                        ],
                        [
                            `tab - undefined - source - Source (0) - ${rowIndex + 1}`,
                            source,
                        ],
                    ]);

                    const key = `tab-undefined-${columnIndex + 1}`;

                    if (!(key in replace)) {
                        replace[key] = [];
                    }

                    replace[key].push(rowIndex + 1);
                }
            }
        }
    }

    return {
        search: results.length ? JSON.stringify(results) : null,
        replace,
        put,
    };
}

describe.each([
    { context: "current tab", external: false },
    { context: "external file", external: true },
])("$context", ({ external }) => {
    (fs.readDir as Mock<typeof fs.readDir>).mockImplementation((dir) => {
        if (dir === "translation" && external) {
            return Promise.resolve([{ name: "tab.txt" } as fs.DirEntry]);
        }
        return Promise.resolve([] as fs.DirEntry[]);
    });

    (fs.readTextFile as Mock<typeof fs.readTextFile>).mockImplementation(() =>
        Promise.resolve(
            `${firstRow.source}<#>${firstRow.firstTranslation}<#>${firstRow.secondTranslation}
            ${secondRow.source}<#>${secondRow.firstTranslation}<#>${secondRow.secondTranslation}
            ${thirdRow.source}<#>${thirdRow.firstTranslation}<#>${thirdRow.secondTranslation}`,
        ),
    );

    i18n.activate("en");

    const searcher = new Searcher();
    const tabs = { one: {} as TabEntry };

    beforeEach(() => {
        searcher.init(
            // TODO
            new ProjectSettings({
                translationColumns: [
                    ["Translation", DEFAULT_COLUMN_WIDTH],
                    ["Translation", DEFAULT_COLUMN_WIDTH],
                ],
            }),
        );

        if (!external) {
            searcher.addSearchFlag(SearchFlags.OnlyCurrentTab);
        }
    });

    describe.each(scenarios)("$label", ({ mode, index }) => {
        test("search", async () => {
            await searcher.search(
                external ? null : "tab",
                tabs,
                external ? null : (rowsHTML.children as Rows),
                predicate,
                index,
                mode,
                SearchAction.Search,
            );

            const expected = buildExpected(
                mode,
                SearchAction.Search,
                index,
                predicate,
            ).search;
            if (expected != null) {
                expect(fs.writeTextFile).lastCalledWith(
                    expect.any(String),
                    expected,
                );
            }
        });

        test("replace", async () => {
            const results = await searcher.search(
                external ? null : "tab",
                tabs,
                external ? null : (rowsHTML.children as Rows),
                predicate,
                index,
                mode,
                SearchAction.Replace,
            );

            const expected = buildExpected(
                mode,
                SearchAction.Replace,
                index,
                predicate,
            ).replace;
            expect(results.results).toStrictEqual(
                adjustReplaceKeys(expected, external),
            );
        });

        test("put", async () => {
            const predicate = "source 1";

            const results = await searcher.search(
                external ? null : "tab",
                tabs,
                external ? null : (rowsHTML.children as Rows),
                predicate,
                index,
                mode,
                SearchAction.Put,
            );

            const expected = buildExpected(
                mode,
                SearchAction.Put,
                index,
                predicate,
            ).put;

            expect(results.results).toStrictEqual(
                adjustReplaceKeys(expected, external),
            );
        });
    });
});
