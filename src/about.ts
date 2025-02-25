import { open as openLink } from "@tauri-apps/plugin-shell";
import { loadWindow } from "./extensions/functions";

document.addEventListener("DOMContentLoaded", async () => {
    await loadWindow("about");

    const links = new Map([
        [document.getElementById("vk-link") as HTMLAnchorElement, "https://vk.com/stivhuis228"],
        [document.getElementById("tg-link") as HTMLAnchorElement, "https://t.me/Arsen1337Curduke"],
        [document.getElementById("repo-link") as HTMLAnchorElement, "https://github.com/savannstm/rpgmtranslate"],
        [document.getElementById("license-link") as HTMLAnchorElement, "http://www.wtfpl.net/about"],
        [document.getElementById("wtfpl-link") as HTMLAnchorElement, "http://www.wtfpl.net"],
    ]);

    document.addEventListener("click", async (event) => {
        const url = links.get(event.target as HTMLAnchorElement);

        if (url) {
            await openLink(url);
        }
    });
});
