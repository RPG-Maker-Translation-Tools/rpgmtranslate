import { ProjectSettings } from "@lib/classes";
import * as fs from "@tauri-apps/plugin-fs";
import * as invokes from "@utils/invokes";
import { BatchMenu } from "@windows/main/components";
import { describe, expect, Mock, test, vi } from "vitest";

document.body.innerHTML = `
<div
    class="bg-primary text-primary outline-primary border-second fixed z-50 hidden max-h-4/6 w-7/12 flex-col gap-1 border-2 p-2 text-base"
    id="batch-menu"
>
    <div
        class="flex h-8 flex-row items-center justify-center text-lg"
        data-i18n="Select files (You can hold LMB and drag to select multiple files)"
    ></div>

    <div class="h-fit columns-8 gap-2 overflow-y-auto" id="body"></div>

    <div class="flex flex-row items-center justify-center gap-4">
        <button
            class="button border-primary hover-bg-primary bg-primary h-8 w-32 rounded-md border-2 p-1"
            id="select-all-button"
            data-i18n="Select All"
        ></button>
        <button
            class="button border-primary hover-bg-primary bg-primary h-8 w-32 rounded-md border-2 p-1"
            id="deselect-all-button"
            data-i18n="Deselect All"
        ></button>
    </div>

    <div class="flex flex-row items-center justify-center gap-4">
        <button
            class="button border-primary hover-bg-primary bg-primary h-8 w-32 rounded-md border-2 p-1"
            id="apply-button"
            data-i18n="Apply"
        ></button>
        <button
            class="button border-primary hover-bg-primary bg-primary h-8 w-32 rounded-md border-2 p-1"
            id="cancel-button"
            data-i18n="Cancel"
        ></button>
    </div>

    <div
        class="flex flex-row items-center justify-center gap-2"
        id="batch-menu-footer"
    >
        <select class="bg-second w-64" id="batch-action-select">
            <option value="0" data-i18n="-Select Action-"></option>
            <option value="1" data-i18n="Trim"></option>
            <option value="2" data-i18n="Translate"></option>
            <option value="3" data-i18n="Wrap"></option>
        </select>

        <select class="bg-second w-64" id="translation-column-select">
            <option value="-1" data-i18n="-Select Column-"></option>
        </select>

        <input
            class="input bg-second hidden h-6 text-base"
            id="wrap-limit-input"
            type="number"
        />
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
    return { ...actual, translate: vi.fn() };
});

describe.sequential("", () => {
    test("trim", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            "aboba<#>badwkoawdko   ",
        );

        const batchMenu = new BatchMenu();
        batchMenu.init(
            {} as TabInfo,
            new ProjectSettings({ tempMapsPath: "./", translationPath: "./" }),
            tabs,
        );

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
        (invokes.translate as Mock<typeof invokes.translate>).mockResolvedValue(
            "примерный текст для перевода",
        );

        const batchMenu = new BatchMenu();
        batchMenu.init(
            {} as TabInfo,
            new ProjectSettings({ tempMapsPath: "./", translationPath: "./" }),
            tabs,
        );

        batchMenu.sourceLanguage = "en";
        batchMenu.translationLanguage = "ru";

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
        batchMenu.init(
            {} as TabInfo,
            new ProjectSettings({ tempMapsPath: "./", translationPath: "./" }),
            tabs,
        );

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
