/**
 * File logger for Element CLI debugging without interfering with TUI screen.
 */
export declare class Logger {
    private static logFile;
    private static isDebug;
    static init(debug?: boolean): void;
    static debug(message: string, ...args: unknown[]): void;
    static info(message: string, ...args: unknown[]): void;
    static warn(message: string, ...args: unknown[]): void;
    static error(message: string, ...args: unknown[]): void;
    private static write;
}
