import { NEW_LINE } from "@utils/constants";

export function wrapText(text: string, wrapLimit: number): string {
    const lines = text.split(NEW_LINE);

    const remainder: string[] = [];
    const wrappedLines: string[] = [];

    for (let line of lines) {
        if (remainder.length) {
            // eslint-disable-next-line sonarjs/updated-loop-counter
            line = `${remainder.join(" ")} ${line}`;
            remainder.length = 0;
        }

        if (line.length > wrapLimit) {
            const words = line.split(" ");
            let wordsLength = line.length;

            while (wordsLength > wrapLimit && words.length !== 0) {
                const popped = words.pop()!;
                wordsLength -= popped.length;
                remainder.unshift(popped);
            }

            wrappedLines.push(words.join(" "));
        } else {
            wrappedLines.push(line);
        }
    }

    if (remainder.length) {
        wrappedLines.push(remainder.join(" "));
    }

    return wrappedLines.join(NEW_LINE);
}
