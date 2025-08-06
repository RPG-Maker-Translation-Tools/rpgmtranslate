import { NEW_LINE, SEPARATOR } from "./constants";

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

String.prototype.count = function (pattern) {
    let count = 0;
    let pos = 0;

    while ((pos = this.indexOf(pattern, pos)) !== -1) {
        count++;
        pos += pattern.length;
    }

    return count;
};

String.prototype.countLines = function () {
    let count = 1;

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

String.prototype.stripSuffix = function (suffix: string) {
    if (this.endsWith(suffix)) {
        return this.slice(0, -suffix.length);
    }

    return this;
};

String.prototype.dlbtoclb = function () {
    return this.replaceAll("\n", NEW_LINE);
};

String.prototype.clbtodlb = function () {
    return this.replaceAll(NEW_LINE, "\n");
};

String.prototype.isEmpty = function () {
    return this.length === 0;
};

String.prototype.basename = function () {
    return this.slice(0, this.lastIndexOf("."));
};

String.prototype.parts = function () {
    const split = this.split(SEPARATOR);

    if (split.length < 2) {
        return null;
    }

    return split;
};

Array.prototype.translation = function () {
    return (
        this.slice(1).findLast((translation) => {
            return !translation.isEmpty();
        }) ?? ""
    );
};

Array.prototype.source = function () {
    return this[0];
};

Array.prototype.translations = function () {
    return this.slice(1);
};

HTMLDivElement.prototype.rowNumberElement = function () {
    return this.children[0].firstElementChild! as HTMLSpanElement;
};

HTMLDivElement.prototype.rowNumber = function () {
    return Number(this.children[0].firstElementChild!.textContent);
};

HTMLDivElement.prototype.source = function () {
    return this.children[1].textContent;
};

HTMLDivElement.prototype.sourceElement = function () {
    return this.children[1] as HTMLDivElement;
};

HTMLDivElement.prototype.translation = function () {
    const children = Array.from(
        this.children as HTMLCollectionOf<HTMLTextAreaElement>,
    ).slice(2);

    const element = children.findLast((element) => {
        return !element.value.isEmpty();
    });

    if (element) {
        return element.value;
    } else {
        return "";
    }
};

HTMLDivElement.prototype.translationElement = function () {
    const children = Array.from(
        this.children as HTMLCollectionOf<HTMLTextAreaElement>,
    ).slice(2);

    const element = children.findLast((element) => {
        return !element.value.isEmpty();
    });

    if (element) {
        return element;
    } else {
        return children[0];
    }
};

HTMLDivElement.prototype.translations = function () {
    return Array.from(this.children as HTMLCollectionOf<HTMLTextAreaElement>)
        .slice(2)
        .map((element) => element.value);
};

Element.prototype.getElementById = function (id: string) {
    return this.querySelector(`#${id}`);
};

Array.prototype.filterMap = function <T, U>(
    this: T[],
    fn: (value: T) => U | null,
) {
    const result: U[] = [];

    for (let i = 0; i < this.length; i++) {
        const mapped = fn(this[i]);

        if (mapped !== null) {
            result.push(mapped);
        }
    }

    return result;
};
