/**
 * Standard ANSI color and styling escape codes.
 */
export declare const Ansi: {
    reset: string;
    bold: string;
    dim: string;
    italic: string;
    underline: string;
    inverse: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    gray: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
    bgBlack: string;
    bgRed: string;
    bgGreen: string;
    bgYellow: string;
    bgBlue: string;
    bgMagenta: string;
    bgCyan: string;
    bgWhite: string;
    bgGray: string;
    color256: (n: number) => string;
    bgColor256: (n: number) => string;
    rgb: (r: number, g: number, b: number) => string;
    bgRgb: (r: number, g: number, b: number) => string;
};
/**
 * Computes a deterministic color for a given Matrix user ID.
 */
export declare function getUserColor(userId: string): string;
/**
 * Formats a UNIX timestamp (milliseconds) to a standard HH:MM time string.
 */
export declare function formatTime(timestamp: number): string;
/**
 * Formats a byte size into human readable format (KB, MB, GB).
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Converts an MXC URI (mxc://server.name/mediaId) into an HTTP download URL.
 */
export declare function mxcToHttpUrl(mxcUri: string, homeserver: string): string;
/**
 * Strips ANSI escape sequences from a string to measure its visible width.
 */
export declare function stripAnsi(text: string): string;
/**
 * Wraps text to fit within a given column width.
 */
export declare function wrapText(text: string, maxWidth: number): string[];
/**
 * Truncates text with an ellipsis if it exceeds the specified maximum width.
 */
export declare function truncate(text: string, maxWidth: number, ellipsis?: string): string;
