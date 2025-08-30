import { ProjectSettings, Settings } from "@lib/classes";

import * as utils from "@utils/functions";

import { getVersion } from "@tauri-apps/api/app";
import { once } from "@tauri-apps/api/event";
import { open as openLink } from "@tauri-apps/plugin-shell";

await once<[Settings, Themes, ProjectSettings]>("settings", async (event) => {
    const [settings, themes] = event.payload;

    utils.applyTheme(themes, settings.theme);
    await utils.initializeLocalization("About", settings.language);
    utils.retranslate();

    document.getElementById("version-number")!.innerHTML = await getVersion();

    const links = new Map([
        [
            document.getElementById("repo-link") as HTMLAnchorElement,
            "https://github.com/savannstm/rpgmtranslate",
        ],
        [
            document.getElementById("license-link") as HTMLAnchorElement,
            "https://www.wtfpl.net/about",
        ],
        [
            document.getElementById("wtfpl-link") as HTMLAnchorElement,
            "https://www.wtfpl.net",
        ],
    ]);

    document.addEventListener("click", async (event) => {
        const url = links.get(event.target as HTMLAnchorElement);

        if (url !== undefined) {
            await openLink(url);
        }
    });
});
