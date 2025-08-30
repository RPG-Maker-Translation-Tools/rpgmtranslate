import { ProjectSettings } from "@lib/classes";
import { Saver } from "@windows/main/components";
import { expect, Mock, test, vi } from "vitest";

document.body.innerHTML = `
<div>
    <div id="row-container">
        <div></div>
        <div>source text 1</div>
        <textarea>translation 1</textarea>
    </div>
    <div id="row-container">
        <div></div>
        <div>source text 2</div>
        <textarea>translation 2</textarea>
    </div>
</div>
`;

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

    await saver.saveSingle(
        "whatever",
        document.body.firstElementChild!.children as Rows,
    );

    expect(writeTextFile).lastCalledWith(
        expect.any(String),
        "source text 1<#>translation 1\nsource text 2<#>translation 2",
    );
});

test("saveAll", async () => {
    (readDir as Mock<typeof readDir>).mockResolvedValue([
        { name: "1" },
        { name: "2" },
    ] as DirEntry[]);

    (readTextFile as Mock<typeof readTextFile>).mockImplementation((path) => {
        if (path === "/1") {
            return Promise.resolve("source text 1<#>translation 1");
        } else {
            return Promise.resolve("source text 2<#>translation 2");
        }
    });

    const saver = new Saver();
    saver.init({ tempMapsPath: "" } as ProjectSettings, "");

    await saver.saveAll(
        null,
        document.body.firstElementChild!.children as Rows,
    );

    expect(writeTextFile).lastCalledWith(
        expect.any(String),
        "source text 1<#>translation 1\nsource text 2<#>translation 2",
    );
});
