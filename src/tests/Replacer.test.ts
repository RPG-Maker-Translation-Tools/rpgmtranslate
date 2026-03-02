import { ProjectSettings } from "@lib/classes";
import { SearchAction } from "@lib/enums";
import * as fs from "@tauri-apps/plugin-fs";
import { Replacer } from "@windows/main/components";
import { expect, Mock, test, vi } from "vitest";

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

const rows = [firstRow, secondRow, thirdRow];

const replacer = new Replacer();
replacer.init(new ProjectSettings({}));

vi.mock(import("@tauri-apps/plugin-fs"), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        readTextFile: vi.fn(),
        writeTextFile: vi.fn(),
        readDir: vi.fn(),
    };
});

(fs.readTextFile as Mock<typeof fs.readTextFile>).mockImplementation(() =>
    Promise.resolve(
        rows
            .map(
                (r) =>
                    `${r.source}<#>${r.firstTranslation}<#>${r.secondTranslation}`,
            )
            .join("\n"),
    ),
);

interface Scenario {
    name: string;
    replaceText: string;
    regexp: RegExp;
    tabName: string;
    columnIndex: number;
    rowIndex: number;
    action: SearchAction;
    expectFn: () => void;
}

const replaceText = "new text";
const targetRow = 0;

const scenarios: Scenario[] = [
    {
        name: "replace in current tab",
        replaceText,
        regexp: new RegExp("translation"),
        tabName: "tab",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Replace,
        expectFn: (): void => {
            expect(rows[0].children[2].querySelector("textarea")?.value).toBe(
                rows[0].firstTranslation.replace("translation", replaceText),
            );
        },
    },
    {
        name: "replace in external file",
        replaceText,
        regexp: new RegExp("translation"),
        tabName: "",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Replace,
        expectFn: (): void => {
            expect(fs.writeTextFile).lastCalledWith(
                expect.any(String),
                `${rows[0].source}<#>${rows[0].firstTranslation.replace("translation", replaceText)}<#>${rows[0].secondTranslation}
${rows[1].source}<#>${rows[1].firstTranslation}<#>${rows[1].secondTranslation}
${rows[2].source}<#>${rows[2].firstTranslation}<#>${rows[2].secondTranslation}`,
                undefined,
            );
        },
    },
    {
        name: "put in current tab",
        replaceText,
        regexp: new RegExp(`^${rows[targetRow].firstTranslation}$`),
        tabName: "tab",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Put,
        expectFn: (): void => {
            expect(rows[0].children[2].querySelector("textarea")?.value).toBe(
                replaceText,
            );
        },
    },
    {
        name: "put in external file",
        replaceText,
        regexp: new RegExp(`^${rows[targetRow].firstTranslation}$`),
        tabName: "",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Put,
        expectFn: (): void => {
            expect(fs.writeTextFile).lastCalledWith(
                expect.any(String),
                `${rows[0].source}<#>${replaceText}<#>${rows[0].secondTranslation}
${rows[1].source}<#>${rows[1].firstTranslation}<#>${rows[1].secondTranslation}
${rows[2].source}<#>${rows[2].firstTranslation}<#>${rows[2].secondTranslation}`,
                undefined,
            );
        },
    },
];

test.each(scenarios)(
    "$name",
    async ({
        replaceText,
        regexp,
        tabName,
        columnIndex,
        rowIndex,
        action,
        expectFn,
    }) => {
        await replacer.replaceSingle(
            rows,
            tabName,
            regexp,
            replaceText,
            "tab",
            "undefined",
            columnIndex,
            rowIndex,
            action,
        );

        expectFn();
    },
);
