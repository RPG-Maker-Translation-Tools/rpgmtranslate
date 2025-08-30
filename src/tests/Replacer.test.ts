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
        rowsData
            .map(
                (r) =>
                    `${r.source}<#>${r.firstTranslation}<#>${r.secondTranslation}`,
            )
            .join("\n"),
    ),
);

const rows = rowsHTML.children as Rows;

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
            expect(rows[0].children[2].value).toBe(
                rowsData[0].firstTranslation.replace(
                    "translation",
                    replaceText,
                ),
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
                `${rowsData[0].source}<#>${rowsData[0].firstTranslation.replace("translation", replaceText)}<#>${rowsData[0].secondTranslation}
${rowsData[1].source}<#>${rowsData[1].firstTranslation}<#>${rowsData[1].secondTranslation}
${rowsData[2].source}<#>${rowsData[2].firstTranslation}<#>${rowsData[2].secondTranslation}`,
            );
        },
    },
    {
        name: "put in current tab",
        replaceText,
        regexp: new RegExp(`^${rowsData[targetRow].firstTranslation}$`),
        tabName: "tab",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Put,
        expectFn: (): void => {
            expect(rows[0].children[2].value).toBe(replaceText);
        },
    },
    {
        name: "put in external file",
        replaceText,
        regexp: new RegExp(`^${rowsData[targetRow].firstTranslation}$`),
        tabName: "",
        columnIndex: 0,
        rowIndex: 0,
        action: SearchAction.Put,
        expectFn: (): void => {
            expect(fs.writeTextFile).lastCalledWith(
                expect.any(String),
                `${rowsData[0].source}<#>${replaceText}<#>${rowsData[0].secondTranslation}
${rowsData[1].source}<#>${rowsData[1].firstTranslation}<#>${rowsData[1].secondTranslation}
${rowsData[2].source}<#>${rowsData[2].firstTranslation}<#>${rowsData[2].secondTranslation}`,
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
