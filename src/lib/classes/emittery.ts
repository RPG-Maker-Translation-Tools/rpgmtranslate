import {
    AppEvent,
    DuplicateMode,
    FileFlags,
    JumpDirection,
    ReadMode,
    SearchAction,
    SearchFlags,
    SearchMode,
} from "@lib/enums";
import { BaseFlags } from "@lib/enums/BaseFlags";
import { RPGMFileType } from "@lib/enums/RPGMFileType";
import Emittery from "emittery";

export const emittery = new Emittery<{
    [AppEvent.UpdateTranslatedLineCount]: [
        number | undefined,
        string | undefined,
    ];
    [AppEvent.UpdateSourceLineCount]: [number, string | undefined];
    [AppEvent.UpdateSaved]: boolean;
    [AppEvent.ChangeTab]: string | null;
    [AppEvent.ColumnResized]: [number, number];
    [AppEvent.InvokeWrite]: [FileFlags, number[], [RPGMFileType, number[]][]];
    [AppEvent.ScrollIntoRow]: number;
    [AppEvent.UtilsButtonClick]: HTMLButtonElement;
    [AppEvent.ReplaceText]: [string, string, number, SearchMode, SearchAction];
    [AppEvent.SearchText]: [string, number, SearchMode, SearchAction];
    [AppEvent.AddBookmark]: [string | undefined, string, number];
    [AppEvent.TogglePurgeAnimation]: undefined;
    [AppEvent.Reload]: undefined;
    [AppEvent.SaveAll]: undefined;
    [AppEvent.ToggleSaveAnimation]: undefined;
    [AppEvent.AddTheme]: [string, Record<string, string>];
    [AppEvent.RemoveBookmark]: number;
    [AppEvent.ColumnAdded]: undefined;
    [AppEvent.JumpToTab]: JumpDirection;
    [AppEvent.ApplyTheme]: string;
    [AppEvent.TabAdded]: [string, number, number, number];
    [AppEvent.TranslateTextArea]: [string, HTMLTextAreaElement];
    [AppEvent.ShowThemeEditMenu]: undefined;
    [AppEvent.AddLog]: [string, string, [string, number, string, string]];
    [AppEvent.UpdateProgressMeter]: undefined;
    [AppEvent.LanguageTags]: [string, string];
    [AppEvent.ColumnRenamed]: [number, string];
    [AppEvent.TitleTranslationChanged]: string;
    [AppEvent.InvokeRead]: [
        ReadMode,
        FileFlags,
        DuplicateMode,
        BaseFlags,
        number[],
        [RPGMFileType, number[]][],
        boolean,
    ];
    [AppEvent.LogEntryReverted]: [string, string];
    [AppEvent.AdditionalColumnRequired]: undefined;
    [AppEvent.SearchFlagChanged]: SearchFlags;
    [AppEvent.ReplaceSingle]: [
        HTMLDivElement,
        string,
        string,
        number,
        number,
        SearchAction,
    ];
    [AppEvent.InvokePurge]: [
        FileFlags,
        boolean,
        number[],
        [RPGMFileType, number[]][],
    ];
    [AppEvent.FileRead]: string;
}>();
