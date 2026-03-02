import { ProjectSettings, TranslationSettings } from "@lib/classes";
import {
    TokenizerAlgorithm,
    TranslationEndpoint,
    TranslationEndpointFlags,
} from "@lib/enums";
import * as fs from "@tauri-apps/plugin-fs";
import { DEFAULT_TEMPERATURE, DEFAULT_TOKEN_LIMIT } from "@utils/constants";
import * as invokes from "@utils/invokes";
import { BatchMenu, FileSelectMenu } from "@windows/main/components";
import { describe, expect, Mock, test, vi } from "vitest";

document.body.innerHTML = `
<div
    class="bg-primary border-second fixed z-50 flex hidden flex-col justify-around gap-2 border-2 p-2 text-base"
    id="batch-menu"
>
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

<div
    class="bg-primary fixed z-50 flex hidden h-auto max-h-4/6 w-auto max-w-2/6 flex-col gap-2 p-2 text-sm"
    id="file-select-menu"
>
    <header class="h-8" id="menu-header">
        Hold and drag to select multiple files.
    </header>

    <main
        class="grid grid-cols-3 items-start gap-2 overflow-x-hidden overflow-y-auto"
    ></main>

    <div class="flex flex-row items-center justify-center gap-2">
        <button class="bg-second rounded-sm" id="select-all-button">
            Select All
        </button>
        <button class="bg-second rounded-sm" id="deselect-all-button">
            Deselect All
        </button>
    </div>
</div>
`;

const columnSelect = document.querySelector<HTMLSelectElement>(
    "#translation-column-select",
)!;
const batchActionSelect = document.querySelector<HTMLSelectElement>(
    "#batch-action-select",
)!;
const translationEndpointSelect = document.querySelector<HTMLSelectElement>(
    "#translation-endpoint-select",
)!;
const applyButton = document.querySelector<HTMLButtonElement>("#apply-button")!;
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

(invokes.translate as Mock<typeof invokes.translate>).mockResolvedValue([
    undefined,
    { aboba: { 1: { strings: ["примерный текст для перевода"] } } },
]);

const projectSettings = new ProjectSettings();
await projectSettings.setProjectPath(".");
projectSettings.translationLanguages = {
    sourceLanguage: TokenizerAlgorithm.English,
    translationLanguage: TokenizerAlgorithm.Russian,
};

const tabInfo: TabInfo = {
    tabName: "",
    tabs: {
        tab: { index: 0, sourceLineCount: 0, translatedLineCount: 0 },
    },
};

const translationSettings: TranslationSettings = {
    endpoints: [
        {
            endpoint: TranslationEndpoint.Google,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: false,
            thinking: false,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.Yandex,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: false,
            thinking: false,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.DeepL,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: false,
            thinking: false,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.OpenAI,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: true,
            thinking: true,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.Anthropic,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: true,
            thinking: true,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.DeepSeek,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: true,
            thinking: true,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
        {
            endpoint: TranslationEndpoint.Gemini,
            apiKey: "",
            model: "",
            systemPrompt: "",
            yandexFolderId: "",
            useGlossary: true,
            thinking: true,
            temperature: DEFAULT_TEMPERATURE,
            tokenLimit: DEFAULT_TOKEN_LIMIT,
        },
    ],
    enabledTranslations: TranslationEndpointFlags.Google,
};

const fileSelectMenu = new FileSelectMenu();
const batchMenu = new BatchMenu(fileSelectMenu);

fileSelectMenu.init(tabInfo.tabs);
batchMenu.init(tabInfo, projectSettings, translationSettings, []);

describe.sequential("", () => {
    test("trim", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            `<!-- ID --><#>1\n<!-- NAME --><#>name\naboba<#>badwkoawdko   `,
        );

        columnSelect.value = "1";
        batchActionSelect.value = "1";

        columnSelect.dispatchEvent(new Event("change", { bubbles: true }));
        batchActionSelect.dispatchEvent(new Event("change", { bubbles: true }));

        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).lastCalledWith(
                "./.rpgmtranslate/translation/aboba.txt",
                "<!-- ID --><#>1\n<!-- NAME --><#>name\naboba<#>badwkoawdko",
                undefined,
            );
        });
    });

    test("translate", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            `<!-- ID --><#>1\n<!-- NAME --><#>name\nexample text for translation<#>`,
        );

        columnSelect.value = "1";
        batchActionSelect.value = "2";
        translationEndpointSelect.value = "0";

        columnSelect.dispatchEvent(new Event("change", { bubbles: true }));
        batchActionSelect.dispatchEvent(new Event("change", { bubbles: true }));
        translationEndpointSelect.dispatchEvent(
            new Event("change", { bubbles: true }),
        );

        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).lastCalledWith(
                "./.rpgmtranslate/translation/aboba.txt",
                "<!-- ID --><#>1\n<!-- NAME --><#>name\nexample text for translation<#>примерный текст для перевода",
                undefined,
            );
        });
    });

    test("wrap", async () => {
        (fs.readTextFile as Mock<typeof fs.readTextFile>).mockResolvedValue(
            "<!-- ID --><#>1\n<!-- NAME --><#>name\ntext<#>text1 text2 text3 text4 text5 text6",
        );

        wrapLimitInput.value = "20";

        columnSelect.value = "1";
        batchActionSelect.value = "3";

        columnSelect.dispatchEvent(new Event("change", { bubbles: true }));
        batchActionSelect.dispatchEvent(new Event("change", { bubbles: true }));

        applyButton.click();

        await vi.waitFor(() => {
            expect(fs.writeTextFile).lastCalledWith(
                "./.rpgmtranslate/translation/aboba.txt",
                "<!-- ID --><#>1\n<!-- NAME --><#>name\ntext<#>text1 text2 text3\\#text4 text5 text6",
                undefined,
            );
        });
    });
});
