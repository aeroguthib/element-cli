/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

/**
 * Standard ANSI color and styling escape codes.
 */
export const Ansi = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    inverse: "\x1b[7m",

    // Foreground colors
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",

    // Bright foreground
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",

    // Background colors
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",
    bgGray: "\x1b[100m",

    // 256 / Truecolor helpers
    color256: (n: number): string => `\x1b[38;5;${n}m`,
    bgColor256: (n: number): string => `\x1b[48;5;${n}m`,
    rgb: (r: number, g: number, b: number): string => `\x1b[38;2;${r};${g};${b}m`,
    bgRgb: (r: number, g: number, b: number): string => `\x1b[48;2;${r};${g};${b}m`,
};

/**
 * Palette of pleasant foreground colors for user names in terminal.
 */
const USER_COLOR_PALETTE = [
    Ansi.cyan,
    Ansi.magenta,
    Ansi.green,
    Ansi.yellow,
    Ansi.brightBlue,
    Ansi.brightCyan,
    Ansi.brightMagenta,
    Ansi.brightGreen,
    Ansi.brightYellow,
    "\x1b[38;5;208m", // Orange
    "\x1b[38;5;141m", // Light purple
    "\x1b[38;5;176m", // Pink
    "\x1b[38;5;114m", // Lime
    "\x1b[38;5;81m", // Sky blue
];

/**
 * Computes a deterministic color for a given Matrix user ID.
 */
export function getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }
    const index = hash % USER_COLOR_PALETTE.length;
    return USER_COLOR_PALETTE[index];
}

/**
 * Formats a UNIX timestamp (milliseconds) to a standard HH:MM time string.
 */
export function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * Formats a byte size into human readable format (KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) {
        return "0 B";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Converts an MXC URI (mxc://server.name/mediaId) into an HTTP download URL.
 */
export function mxcToHttpUrl(mxcUri: string, homeserver: string): string {
    if (!mxcUri || !mxcUri.startsWith("mxc://")) {
        return mxcUri;
    }
    const withoutPrefix = mxcUri.slice(6);
    const slashIdx = withoutPrefix.indexOf("/");
    if (slashIdx === -1) {
        return mxcUri;
    }
    const serverName = withoutPrefix.slice(0, slashIdx);
    const mediaId = withoutPrefix.slice(slashIdx + 1);
    const base = homeserver.replace(/\/+$/, "");
    return `${base}/_matrix/media/v3/download/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}`;
}

/**
 * Strips ANSI escape sequences from a string to measure its visible width.
 */
export function stripAnsi(text: string): string {
    // Matches standard ANSI CSI sequences
    return text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
}

/**
 * Wraps text to fit within a given column width.
 */
export function wrapText(text: string, maxWidth: number): string[] {
    if (maxWidth <= 0) {
        return [text];
    }
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
        if (paragraph.length === 0) {
            lines.push("");
            continue;
        }

        let currentLine = "";
        const words = paragraph.split(" ");

        for (const word of words) {
            if (currentLine.length === 0) {
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= maxWidth) {
                currentLine += ` ${word}`;
            } else {
                lines.push(currentLine);
                // Handle words that exceed maxWidth on their own
                let remaining = word;
                while (remaining.length > maxWidth) {
                    lines.push(remaining.slice(0, maxWidth));
                    remaining = remaining.slice(maxWidth);
                }
                currentLine = remaining;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
    }

    return lines;
}

/**
 * Truncates text with an ellipsis if it exceeds the specified maximum width.
 */
export function truncate(text: string, maxWidth: number, ellipsis = "…"): string {
    if (text.length <= maxWidth) {
        return text;
    }
    if (maxWidth <= ellipsis.length) {
        return text.slice(0, maxWidth);
    }
    return text.slice(0, maxWidth - ellipsis.length) + ellipsis;
}
