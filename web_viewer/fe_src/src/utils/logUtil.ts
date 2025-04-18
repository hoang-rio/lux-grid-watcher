const getDateTimePrefix = (): string => {
    return new Date().toLocaleString();
};

export const log = (...args: unknown[]): void => {
    console.log(`[${getDateTimePrefix()}]`, ...args);
};

export const warn = (...args: unknown[]): void => {
    console.warn(`[${getDateTimePrefix()}]`, ...args);
};

export const error = (...args: unknown[]): void => {
    console.error(`[${getDateTimePrefix()}]`, ...args);
};
