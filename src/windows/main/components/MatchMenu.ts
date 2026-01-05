import { Component } from "./Component";

import { emittery } from "@lib/classes/emittery";

import { AppEvent, MouseButton, TokenizerAlgorithm } from "@lib/enums";

import { tw } from "@utils/functions";
import { findAllMatches, isErr } from "@utils/invokes";

import { t } from "@lingui/core/macro";

import { error } from "@tauri-apps/plugin-log";

export class MatchMenu extends Component {
    #startX = 0;
    #startY = 0;

    #tableBody: HTMLDivElement;

    public constructor() {
        super("match-menu");

        this.#tableBody = this.element.querySelector("#table-body")!;

        this.element.onmousedown = (e): void => {
            if (
                ((e.target as HTMLElement).tagName === "THEAD" ||
                    (e.target as HTMLElement).closest("thead")) &&
                (e.button as MouseButton) === MouseButton.Left
            ) {
                this.element.style.cursor = "grabbing";

                this.#startX = e.clientX - this.x;
                this.#startY = e.clientY - this.y;

                this.element.onmousemove = (e): void => {
                    this.x = e.clientX - this.#startX;
                    this.y = e.clientY - this.#startY;

                    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

                    this.element.onmouseup = (): void => {
                        this.element.style.cursor = "auto";
                        this.element.onmouseup = null;
                        this.element.onmousemove = null;
                    };
                };
            }
        };

        this.element.onclick = async (e): Promise<void> => {
            const target = e.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (target.tagName === "TH") {
                if (target.classList.contains("font-material")) {
                    this.hide();
                }

                return;
            }

            const row = target.closest("tr");

            if (!row) {
                return;
            }

            const file = row.firstElementChild!.textContent;
            const line = row.children[1].textContent;

            await emittery.emit(AppEvent.ChangeTab, file);
            void emittery.emit(AppEvent.ScrollIntoRow, Number(line) - 1);
        };

        this.element.oncontextmenu = (e): void => {
            this.#oncontextmenu(e);
        };
    }

    public clear(): void {
        this.#tableBody.innerHTML = "";
    }

    public async appendMatches(
        source: string,
        translation: string,
        sourceAlgorithm: TokenizerAlgorithm,
        translationAlgorithm: TokenizerAlgorithm,
        term: Term,
        file: string,
        line: number,
    ): Promise<void> {
        const matches = await findAllMatches({
            sourceHaystack: source,
            sourceNeedle: term.source,
            sourceMode: term.sourceMatchMode,
            trHaystack: translation,
            trNeedle: term.translation,
            trMode: term.translationMatchMode,
            sourceAlgorithm,
            trAlgorithm: translationAlgorithm,
        });

        if (isErr(matches)) {
            void error(matches[0]!);
            return;
        } else if (matches[1] === null) {
            return;
        }

        const [sourceMatches, translationMatches] = matches[1]!;

        if (sourceMatches.length === 0) {
            return;
        }

        this.#createMatchContainer(
            term.source,
            term.translation,
            source,
            sourceMatches,
            translation,
            translationMatches,
            file,
            line,
        );
    }

    #createMatchContainer(
        sourceTerm: string,
        translationTerm: string,
        source: string,
        sourceMatches: MatchResult[],
        translation: string,
        translationMatches: MatchResult[],
        file: string,
        line: number,
    ): void {
        const match = sourceMatches.length <= translationMatches.length;

        const row = document.createElement("tr");
        row.classList.add("h-8", "cursor-pointer");

        const buildHighlightedText = (
            text: string,
            matches: MatchResult[],
        ): string => {
            const result: string[] = [];
            let pos = 0;

            for (const [start, len] of matches) {
                result.push(text.slice(pos, start));
                pos = start + len;

                const highlighted = text.slice(start, pos);
                if (highlighted.length > 0) {
                    result.push(
                        '<span class="bg-third">',
                        highlighted,
                        "</span>",
                    );
                }
            }

            result.push(text.slice(pos));
            return result.join("");
        };

        const highlightedSource = buildHighlightedText(source, sourceMatches);
        const highlightedTranslation = buildHighlightedText(
            translation,
            translationMatches,
        );

        const fileCell = document.createElement("td");
        fileCell.textContent = file;

        const lineCell = document.createElement("td");
        lineCell.innerHTML = line.toString();

        const sourceOccurrences = sourceMatches.length;
        const translationOccurrences = translationMatches.length;

        const sourceResults = [];

        for (const match of sourceMatches) {
            const score = match[2];
            const string = score !== undefined ? t`Fuzzy (${score})` : t`Exact`;
            sourceResults.push(string);
        }

        const sourceResultsString =
            `${sourceOccurrences} occurrences: ` + sourceResults.join();

        const translationResults = [];

        for (const match of translationMatches) {
            const score = match[2];
            const string = score !== undefined ? t`Fuzzy (${score})` : t`Exact`;
            translationResults.push(string);
        }

        let translationResultsString = `${translationOccurrences} occurrences`;

        if (translationResults.length !== 0) {
            translationResultsString += ": " + translationResults.join();
        }

        const termCell = document.createElement("td");

        {
            const container = document.createElement("div");
            container.className = "flex flex-row gap-2";

            const sourceContainer = document.createElement("span");
            sourceContainer.className = "whitespace-pre-wrap";

            const sourceText = document.createElement("div");
            sourceText.textContent = sourceTerm;

            const sourceResultsContainer = document.createElement("div");
            sourceResultsContainer.className = tw`text-third text-xs`;
            sourceResultsContainer.innerHTML = sourceResultsString;

            sourceContainer.append(sourceText, sourceResultsContainer);

            const arrowElement = document.createElement("span");
            arrowElement.innerHTML = "→";

            const translationContainer = document.createElement("span");
            translationContainer.className = "whitespace-pre-wrap";

            const translationText = document.createElement("div");
            translationText.textContent = translationTerm;

            const translationResultsContainer = document.createElement("div");
            translationResultsContainer.className = tw`text-third text-xs`;
            translationResultsContainer.innerHTML = translationResultsString;

            translationContainer.append(
                translationText,
                translationResultsContainer,
            );

            container.append(
                sourceContainer,
                arrowElement,
                translationContainer,
            );

            termCell.appendChild(container);
        }

        const textCell = document.createElement("td");

        {
            const container = document.createElement("div");
            container.className = "flex flex-row gap-2";

            const sourceContainer = document.createElement("span");
            sourceContainer.className = "whitespace-pre-wrap";
            sourceContainer.innerHTML = highlightedSource;

            const arrowElement = document.createElement("span");
            arrowElement.innerHTML = "→";

            const translationContainer = document.createElement("span");
            translationContainer.className = "whitespace-pre-wrap";
            translationContainer.innerHTML = highlightedTranslation;

            container.append(
                sourceContainer,
                arrowElement,
                translationContainer,
            );

            textCell.appendChild(container);
        }

        const commentCell = document.createElement("td");

        if (translation.length === 0) {
            commentCell.textContent = t`Translation is empty.`;
            row.classList.add("bg-yellow-800");
        } else if (translationMatches.length === 0) {
            commentCell.textContent = t`Term translation is not present.`;
            row.classList.add("bg-red-800");
        } else if (!match) {
            commentCell.textContent = t`Number of term occurrences doesn't match the number of translation occurrences.`;
            row.classList.add("bg-red-800");
        } else {
            commentCell.textContent = t`Match.`;
            row.classList.add("bg-second");
        }

        row.append(fileCell, lineCell, termCell, textCell, commentCell);
        this.#tableBody.appendChild(row);
    }

    #oncontextmenu(e: MouseEvent): void {
        e.preventDefault();

        const target = e.target as HTMLElement;

        if (
            target.tagName !== "THEAD" &&
            !(e.target as HTMLElement).closest("thead")
        ) {
            return;
        }

        this.contextMenu = document.createElement("div");
        this.contextMenu.className = tw`bg-primary outline-third fixed z-50 w-32 rounded-lg text-sm outline-2`;

        for (const [id, label] of [t`Restore Position`].entries()) {
            const button = document.createElement("button");
            button.className = tw`h-fit w-full p-1`;
            button.innerHTML = label;
            button.id = id.toString();
            this.contextMenu.appendChild(button);
        }

        this.contextMenu.style.top = `${e.y}px`;
        this.contextMenu.style.left = `${e.x}px`;

        this.contextMenu.onclick = (e): void => {
            const target = e.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (target.id === "0") {
                this.move(0, 0);
            }
        };

        document.body.appendChild(this.contextMenu);

        void emittery.emit(AppEvent.ContextMenuChanged, this.contextMenu);
    }
}
