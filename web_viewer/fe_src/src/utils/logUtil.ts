const getDateTimePrefix = (): string => {
    return new Date().toLocaleString();
};

export const log = (...args: unknown[]): void => {
    if (typeof args[0] === 'string') {
        console.log(`[${getDateTimePrefix()}] ` + args[0], ...args.slice(1));
    } else {
        console.log(`[${getDateTimePrefix()}]`, ...args);
    }
};

export const warn = (...args: unknown[]): void => {
    if (typeof args[0] === 'string') {
        console.warn(`[${getDateTimePrefix()}] ` + args[0], ...args.slice(1));
    } else {
        console.warn(`[${getDateTimePrefix()}]`, ...args);
    }
};

export const error = (...args: unknown[]): void => {
    if (typeof args[0] === 'string') {
        console.error(`[${getDateTimePrefix()}] ` + args[0], ...args.slice(1));
    } else {
        console.error(`[${getDateTimePrefix()}]`, ...args);
    }
};
