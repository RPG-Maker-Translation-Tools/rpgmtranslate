import { getVersion } from "@tauri-apps/api/app";
import { open as openLink } from "@tauri-apps/plugin-shell";
import { loadWindow } from "./utilities/functions";

document.addEventListener("DOMContentLoaded", async () => {
    await loadWindow("about");
    document.getElementById("version-number")!.innerHTML = await getVersion();

    const links = new Map([
        [
            document.getElementById("vk-link") as HTMLAnchorElement,
            "https://vk.com/stivhuis228",
        ],
        [
            document.getElementById("tg-link") as HTMLAnchorElement,
            "https://t.me/Arsen1337Curduke",
        ],
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

        if (url) {
            await openLink(url);
        }
    });
});
