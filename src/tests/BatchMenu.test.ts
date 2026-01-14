// @ts-nocheck for now skip errors

import { ProjectSettings } from "@lib/classes";
import * as fs from "@tauri-apps/plugin-fs";
import { BatchMenu } from "@windows/main/components";
import { describe, expect, Mock, test, vi } from "vitest";

document.body.innerHTML = `
<div
    class="bg-primary outline-primary border-second @container fixed z-50 flex hidden size-3/6 resize flex-col justify-around gap-2 overflow-hidden border-2 p-2 text-base"
    id="batch-menu"
>
    <header
        class="flex h-8 flex-row items-center justify-center text-lg"
        id="menu-header"
        data-i18n="Hold and drag to select multiple files"
    ></header>

    <div
        class="grid max-h-4/6 items-start overflow-x-hidden overflow-y-auto @sm:grid-cols-3 @3xl:grid-cols-5 @5xl:grid-cols-7"
        id="body"
    ></div>

    <div
        class="flex hidden w-full flex-col gap-2"
        id="context-container"
    >
        <div data-i18n="Context"></div>

        <div class="flex w-full flex-row gap-2">
            <textarea
                class="w-full rounded-sm"
                id="context-input"
                data-i18n-placeholder="Define a context, surrounding selected files. It might be better to use filenames explicitly, like 'a happens before map256', or something like that."
            ></textarea>

            <select
                class="rounded-sm"
                id="use-context-select"
                multiple
            ></select>
        </div>
    </div>

    <div
        class="flex h-8 w-full flex-row items-center justify-center gap-2"
    >
        <button
            class="border-primary flex items-center justify-center rounded-md border-2"
            id="apply-button"
            data-i18n="Process"
        ></button>
        <button
            class="border-primary flex items-center justify-center rounded-md border-2"
            id="cancel-button"
            data-i18n="Cancel"
        ></button>
        <button
            class="border-primary flex items-center justify-center rounded-md border-2"
            id="select-all-button"
            data-i18n="Select All"
        ></button>
        <button
            class="border-primary flex items-center justify-center rounded-md border-2"
            id="deselect-all-button"
            data-i18n="Deselect All"
        ></button>
    </div>

    <div
        class="flex flex-row items-center justify-center gap-2"
        id="batch-menu-footer"
    >
        <select class="w-64" id="batch-action-select">
            <option value="0" data-i18n="-Select Action-"></option>
            <option value="1" data-i18n="Trim"></option>
            <option value="2" data-i18n="Translate"></option>
            <option value="3" data-i18n="Wrap"></option>
        </select>

        <select class="w-64" id="translation-column-select">
            <option value="0" data-i18n="-Select Column-"></option>
        </select>

        <input
            class="hidden rounded-sm"
            id="wrap-limit-input"
            type="number"
            data-i18n-placeholder="Line length for wrapping"
        />

        <select
            class="hidden rounded-md"
            id="translation-endpoint-select"
        >
            <option value="">None</option>
            <option value="0">Google</option>
            <option value="1">Yandex</option>
            <option value="2">DeepL</option>
            <option value="3">ChatGPT</option>
            <option value="4">Claude</option>
            <option value="5">DeepSeek</option>
            <option value="6">Gemini</option>
        </select>
    </div>
</div>
`;

const tabsHTML = document.createElement("div");
tabsHTML.innerHTML = `<div id="div">
    <button>
        <div>aboba</div>
    </button>
</div>`;

const tabs = tabsHTML.children as HTMLCollectionOf<HTMLButtonElement>;

const columnSelect = document.querySelector<HTMLSelectElement>(
    "#translation-column-select",
)!;
const batchAction = document.querySelector<HTMLSelectElement>(
    "#batch-action-select",
)!;
const applyButton = document.querySelector<HTMLButtonElement>("#apply-button")!;
const body = document.querySelector("#body")!;
const wrapLimitInput =
    document.querySelector<HTMLInputElement>("#wrap-limit-input")!;

vi.mock(import("@tauri-apps/plugin-fs"), async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, readTextFile: vi.fn(), writeTextFile: vi.fn() };
});

vi.mock(import("@utils/invokes"), async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, translate: vi.fn(), expandScope: vi.fn() };
});

// TODO: Mock translate

const projectSettings = new ProjectSettings();
await projectSettings.setProjectPath(".");

describe.sequential("", () => {
    test("trim", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            "aboba<#>badwkoawdko   ",
        );

        const batchMenu = new BatchMenu();
        batchMenu.init({} as TabInfo, projectSettings, {}, {}, tabs);

        columnSelect.value = "1";
        batchAction.value = "1";

        const checkbox = body.firstElementChild!
            .firstElementChild! as HTMLInputElement;

        checkbox.click();
        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).toBeCalledWith(
                expect.any(String),
                "aboba<#>badwkoawdko",
            );
        });
    });

    test("translate", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            "example text for translation<#>",
        );

        const batchMenu = new BatchMenu();
        batchMenu.init({} as TabInfo, projectSettings, {}, {}, tabs);

        columnSelect.value = "1";
        batchAction.value = "2";

        const checkbox = body.firstElementChild!
            .firstElementChild! as HTMLInputElement;

        checkbox.click();
        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).lastCalledWith(
                expect.any(String),
                "example text for translation<#>примерный текст для перевода",
            );
        });
    });

    test("wrap", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            "text<#>text1 text2 text3 text4 text5 text6",
        );

        const batchMenu = new BatchMenu();
        batchMenu.init({} as TabInfo, projectSettings, {}, {}, tabs);

        wrapLimitInput.value = "20";

        columnSelect.value = "1";
        batchAction.value = "3";

        const checkbox = body.firstElementChild!
            .firstElementChild! as HTMLInputElement;

        checkbox.click();
        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).lastCalledWith(
                expect.any(String),
                "text<#>text1 text2 text3\\#text4 text5 text6",
            );
        });
    });
});
