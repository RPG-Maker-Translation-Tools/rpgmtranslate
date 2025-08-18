// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { ProjectSettings } from "@lib/classes";
import { Saver } from "@windows/main/components";
import { expect, test, vi } from "vitest";

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
    writeTextFile.mockImplementation((path, content) => {
        expect(content).toBe(
            "source text 1<#>translation 1\nsource text 2<#>translation 2",
        );
    });

    const saver = new Saver();
    saver.init({} as ProjectSettings, "");

    await saver.saveSingle(
        "whatever",
        document.body.firstElementChild!.children as Rows,
    );
});

test("saveAll", async () => {
    readDir.mockResolvedValue([{ name: "1" }, { name: "2" }] as DirEntry[]);

    readTextFile.mockImplementation((path) => {
        if (path === "/1") {
            return "source text 1<#>translation 1";
        } else {
            return "source text 2<#>translation 2";
        }
    });

    writeTextFile.mockImplementation((path, content) => {
        expect(content).toBe(
            "source text 1<#>translation 1\nsource text 2<#>translation 2",
        );
    });

    const saver = new Saver();
    saver.init({ tempMapsPath: "" } as ProjectSettings, "");

    await saver.saveAll(
        null,
        document.body.firstElementChild!.children as Rows,
    );
});
