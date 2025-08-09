import * as consts from "@utils/constants";
import * as utils from "@utils/functions";

export class LeftPanel {
    #leftPanel: HTMLDivElement;

    public constructor(private readonly tabInfo: TabInfo) {
        this.#leftPanel = document.getElementById(
            "left-panel",
        ) as HTMLDivElement;

        this.#leftPanel.addEventListener("click", async (event) => {
            await this.#handleClick(event);
        });
    }

    async #handleClick(event: MouseEvent) {
        let target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        while (target.parentElement !== this.#leftPanel) {
            target = target.parentElement!;
        }

        await this.tabInfo.changeTab(
            target.firstElementChild!.textContent,
            Number(target.id),
        );
    }

    public toggle() {
        utils.toggleMultiple(
            this.#leftPanel,
            "translate-x-0",
            "-translate-x-full",
        );
    }

    public clear() {
        this.#leftPanel.innerHTML = "";
    }

    public addTab(name: string, rows: string[]) {
        if (name === "system") {
            // Remove the game title row
            rows = rows.slice(0, -1);
        }

        let total = rows.length;
        let translated = 0;

        if (total <= 0) {
            return;
        }

        for (const line of rows) {
            if (line.startsWith(consts.COMMENT_PREFIX)) {
                total--;
            } else if (!line.endsWith(consts.SEPARATOR)) {
                translated++;
            }
        }

        if (total <= 0) {
            return;
        }

        const percentage = Math.floor(
            (translated / total) * consts.PERCENT_MULTIPLIER,
        );

        this.tabInfo.total.push(total);
        this.tabInfo.translated.push(translated);

        const tabButton = document.createElement("button");
        tabButton.className = utils.tw`bg-primary hover-bg-primary flex h-8 w-full cursor-pointer flex-row justify-center p-1`;
        tabButton.id = this.tabInfo.tabCount.toString();

        const stateSpan = document.createElement("span");
        stateSpan.innerHTML = name;
        stateSpan.className = "pr-1";
        tabButton.appendChild(stateSpan);

        const progressBar = document.createElement("div");
        const progressMeter = document.createElement("div");

        progressBar.className = utils.tw`backgroundSecond w-full rounded-xs`;
        progressMeter.className = utils.tw`backgroundThird textPrimary rounded-xs p-0.5 text-center text-xs leading-none font-medium`;
        progressMeter.style.width =
            progressMeter.textContent = `${percentage}%`;

        if (percentage === consts.PERCENT_MULTIPLIER) {
            progressMeter.classList.replace("backgroundThird", "bg-green-600");
        }

        progressBar.appendChild(progressMeter);
        tabButton.appendChild(progressBar);

        this.#leftPanel.appendChild(tabButton);
        this.tabInfo.tabs[name] = this.tabInfo.tabCount;
        this.tabInfo.tabCount += 1;
    }

    public activeTab(): HTMLDivElement {
        return this.#leftPanel.children[
            this.tabInfo.currentTab.index
        ] as HTMLDivElement;
    }

    public tab(index: number) {
        return this.#leftPanel.children[index];
    }

    public tabs(): HTMLCollectionOf<HTMLDivElement> {
        return this.#leftPanel.children as HTMLCollectionOf<HTMLDivElement>;
    }
}
