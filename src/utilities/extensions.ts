import { NEW_LINE } from "./constants";

HTMLElement.prototype.toggleMultiple = function (...classes) {
    for (const className of classes) {
        this.classList.toggle(className);
    }
};

HTMLTextAreaElement.prototype.calculateHeight = function () {
    const lineCount = this.value.count("\n") + 1;
    const { lineHeight, paddingTop } = window.getComputedStyle(this);

    const newHeight =
        lineCount * Number.parseFloat(lineHeight) +
        Number.parseFloat(paddingTop) * 2;

    for (const child of (this.parentElement?.children ??
        []) as HTMLCollectionOf<HTMLElement>) {
        child.style.height = `${newHeight}px`;
    }
};

Math.clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

String.prototype.count = function (char) {
    let count = 0;

    for (let i = 0; i < this.length; i++) {
        if (char === this[i]) {
            count++;
        }
    }

    return count;
};

String.prototype.countLines = function () {
    let count = 0;

    for (let i = 0; i < this.length; i++) {
        if (this[i] === "\r") {
            count++;

            if (this[i + 1] === "\n") {
                // Skip, because already accounted.
                // eslint-disable-next-line sonarjs/updated-loop-counter
                i++;
            }
        } else if (this[i] === "\n") {
            count++;
        }
    }
    return count;
};

String.prototype.lines = function () {
    if (this.length === 0) {
        return [];
    }

    return this.split(/\r\n|\n|\r/);
};

String.prototype.stripSuffix = function (this: string, suffix: string) {
    if (this.endsWith(suffix)) {
        return this.slice(0, -suffix.length);
    }

    return this;
};

String.prototype.nnormalize = function () {
    return this.replaceAll("\n", NEW_LINE);
};

String.prototype.denormalize = function () {
    return this.replaceAll(NEW_LINE, "\n");
};

String.prototype.empty = function () {
    return this.length === 0;
};
