import { EventEmitter } from "node:events";
/**
 * Key event payload parsed from terminal stdin.
 */
export interface KeyEvent {
    name: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    sequence: string;
}
/**
 * Low-level ANSI terminal driver with alternate buffer, raw input, and clean redrawing.
 */
export declare class Terminal extends EventEmitter {
    private isRaw;
    private inAltBuffer;
    private onResizeBound;
    private onDataBound;
    private isDestroyed;
    constructor();
    /**
     * Current terminal width in columns.
     */
    get width(): number;
    /**
     * Current terminal height in rows.
     */
    get height(): number;
    /**
     * Initializes terminal in alternate screen buffer and raw mode.
     */
    start(): void;
    /**
     * Restores the terminal to standard mode.
     */
    restore(): void;
    /**
     * Destroys terminal listeners and exits cleanly.
     */
    cleanupAndExit(code?: number): void;
    /**
     * Moves cursor to row and col (1-indexed).
     */
    setCursor(col: number, row: number, show?: boolean): void;
    /**
     * Hides the terminal cursor.
     */
    hideCursor(): void;
    /**
     * Shows the terminal cursor.
     */
    showCursor(): void;
    /**
     * Clears screen.
     */
    clear(): void;
    /**
     * Renders a full frame of lines with double-buffer style cursor home jump.
     */
    renderFrame(lines: string[]): void;
    private handleResize;
    private handleData;
}
