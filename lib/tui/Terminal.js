/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { EventEmitter } from "node:events";
/**
 * Low-level ANSI terminal driver with alternate buffer, raw input, and clean redrawing.
 */
export class Terminal extends EventEmitter {
    isRaw = false;
    inAltBuffer = false;
    onResizeBound;
    onDataBound;
    isDestroyed = false;
    constructor() {
        super();
        this.onResizeBound = () => this.handleResize();
        this.onDataBound = (data) => this.handleData(data);
    }
    /**
     * Current terminal width in columns.
     */
    get width() {
        return process.stdout.columns || 80;
    }
    /**
     * Current terminal height in rows.
     */
    get height() {
        return process.stdout.rows || 24;
    }
    /**
     * Initializes terminal in alternate screen buffer and raw mode.
     */
    start() {
        if (this.isDestroyed) {
            return;
        }
        // Enter alternate screen buffer & hide cursor
        process.stdout.write("\x1b[?1049h\x1b[?25l");
        this.inAltBuffer = true;
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            this.isRaw = true;
        }
        process.stdin.resume();
        process.stdin.on("data", this.onDataBound);
        process.stdout.on("resize", this.onResizeBound);
        // Ensure clean exit on interrupts
        process.on("SIGINT", () => this.cleanupAndExit(0));
        process.on("SIGTERM", () => this.cleanupAndExit(0));
        process.on("exit", () => this.restore());
    }
    /**
     * Restores the terminal to standard mode.
     */
    restore() {
        if (this.inAltBuffer) {
            // Show cursor and exit alternate buffer
            process.stdout.write("\x1b[?25h\x1b[?1049l");
            this.inAltBuffer = false;
        }
        if (this.isRaw && process.stdin.isTTY) {
            try {
                process.stdin.setRawMode(false);
            }
            catch {
                // Ignore errors during exit
            }
            this.isRaw = false;
        }
    }
    /**
     * Destroys terminal listeners and exits cleanly.
     */
    cleanupAndExit(code = 0) {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        this.restore();
        process.exit(code);
    }
    /**
     * Moves cursor to row and col (1-indexed).
     */
    setCursor(col, row, show = true) {
        process.stdout.write(`\x1b[${row};${col}H` + (show ? "\x1b[?25h" : "\x1b[?25l"));
    }
    /**
     * Hides the terminal cursor.
     */
    hideCursor() {
        process.stdout.write("\x1b[?25l");
    }
    /**
     * Shows the terminal cursor.
     */
    showCursor() {
        process.stdout.write("\x1b[?25h");
    }
    /**
     * Clears screen.
     */
    clear() {
        process.stdout.write("\x1b[2J\x1b[H");
    }
    /**
     * Renders a full frame of lines with double-buffer style cursor home jump.
     */
    renderFrame(lines) {
        const h = this.height;
        const w = this.width;
        // Truncate or pad lines to fit exact terminal height
        const outputLines = [];
        for (let i = 0; i < h; i++) {
            const line = lines[i] !== undefined ? lines[i] : "";
            // Clear to end of line \x1b[K to prevent old characters leaking
            outputLines.push(line + "\x1b[K");
        }
        // Jump cursor to top-left and write lines joined by newline
        process.stdout.write("\x1b[H" + outputLines.join("\n"));
    }
    handleResize() {
        this.emit("resize", { width: this.width, height: this.height });
    }
    handleData(data) {
        const str = data.toString("utf8");
        // Check for Ctrl+C
        if (str === "\u0003") {
            this.emit("key", { name: "c", ctrl: true, sequence: str });
            this.cleanupAndExit(0);
            return;
        }
        // Check for Ctrl+D
        if (str === "\u0004") {
            this.emit("key", { name: "d", ctrl: true, sequence: str });
            return;
        }
        // Check for Ctrl+L (repaint)
        if (str === "\u000c") {
            this.clear();
            this.emit("repaint");
            return;
        }
        // Parse ANSI escape sequences
        if (str.startsWith("\x1b[")) {
            const code = str.slice(2);
            switch (code) {
                case "A":
                    this.emit("key", { name: "up", sequence: str });
                    return;
                case "B":
                    this.emit("key", { name: "down", sequence: str });
                    return;
                case "C":
                    this.emit("key", { name: "right", sequence: str });
                    return;
                case "D":
                    this.emit("key", { name: "left", sequence: str });
                    return;
                case "5~":
                    this.emit("key", { name: "pageup", sequence: str });
                    return;
                case "6~":
                    this.emit("key", { name: "pagedown", sequence: str });
                    return;
                case "H":
                case "1~":
                    this.emit("key", { name: "home", sequence: str });
                    return;
                case "F":
                case "4~":
                    this.emit("key", { name: "end", sequence: str });
                    return;
                case "3~":
                    this.emit("key", { name: "delete", sequence: str });
                    return;
                case "Z":
                    this.emit("key", { name: "tab", shift: true, sequence: str });
                    return;
            }
        }
        // Standard keys
        if (str === "\r" || str === "\n") {
            this.emit("key", { name: "enter", sequence: str });
            return;
        }
        if (str === "\t") {
            this.emit("key", { name: "tab", sequence: str });
            return;
        }
        if (str === "\x7f" || str === "\b") {
            this.emit("key", { name: "backspace", sequence: str });
            return;
        }
        if (str === "\x1b") {
            this.emit("key", { name: "escape", sequence: str });
            return;
        }
        // Regular character or string
        this.emit("key", { name: str, sequence: str });
    }
}
