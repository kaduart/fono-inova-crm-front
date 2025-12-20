// src/utils/logger.ts
/* Simple logger that is silent in production */
type LogArgs = unknown[];

const isDev =
    // Vite
    (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.DEV) ||
    // fallback (non-vite)
    (typeof process !== "undefined" && (process as any).env && (process as any).env.NODE_ENV !== "production");

export const logger = {
    debug: (...args: LogArgs) => { if (isDev) console.debug(...args); },
    info: (...args: LogArgs) => { if (isDev) console.info(...args); },
    warn: (...args: LogArgs) => { if (isDev) console.warn(...args); },
    error: (...args: LogArgs) => { console.error(...args); },
};
