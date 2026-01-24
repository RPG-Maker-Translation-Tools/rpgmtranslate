import { ProjectSettings } from "@lib/classes";
import { Saver } from "@windows/main/components";
import { expect, Mock, test, vi } from "vitest";

const firstRow = {
    source: "source 1",
    firstTranslation: "translation 1",
};

const secondRow = {
    source: "source 2",
    firstTranslation: "translation 2",
};

const rowsData = [firstRow, secondRow];

const rowsHTML = document.createElement("tbody");
rowsHTML.innerHTML = rowsData
    .map(
        (row) => `
            <tr>
                <td></td>
                <td>${row.source}</td>
                <td><textarea>${row.firstTranslation}</textarea></td>
            </tr>
        `,
    )
    .join("");

vi.mock(import("@tauri-apps/plugin-fs"), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        readDir: vi.fn(),
        readTextFile: vi.fn(),
        writeTextFile: vi.fn(),
    };
});

import {
    DirEntry,
    readDir,
    readTextFile,
    writeTextFile,
} from "@tauri-apps/plugin-fs";

test("saveSingle", async () => {
    const saver = new Saver();
    saver.init({} as ProjectSettings, "");

    await saver.saveCurrentTab("whatever", rowsHTML.children as TabRows);

    expect(writeTextFile).lastCalledWith(
        expect.any(String),
        "source 1<#>translation 1\nsource 2<#>translation 2",
        undefined,
    );
});

test("saveAll", async () => {
    (readDir as Mock<typeof readDir>).mockResolvedValue([
        { name: "1" },
        { name: "2" },
    ] as DirEntry[]);

    (readTextFile as Mock<typeof readTextFile>).mockImplementation((path) => {
        if (path === "/1") {
            return Promise.resolve("source 1<#>translation 1");
        } else {
            return Promise.resolve("source 2<#>translation 2");
        }
    });

    const saver = new Saver();
    saver.init({ tempMapsPath: "" } as ProjectSettings, "");

    await saver.saveAll("", rowsHTML.children as TabRows);

    expect(writeTextFile).lastCalledWith(
        expect.any(String),
        "source 1<#>translation 1\nsource 2<#>translation 2",
        undefined,
    );
});
