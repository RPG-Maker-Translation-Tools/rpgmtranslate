Array.prototype.filterMap = function <T, U>(this: T[], callback: (value: T, index: number) => U | undefined): U[] {
    const result: U[] = [];

    for (let i = 0; i < this.length; i++) {
        const mappedValue = callback(this[i], i);

        if (mappedValue !== undefined) {
            result.push(mappedValue);
        }
    }

    return result;
};
