/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
/**
 * File logger for Element CLI debugging without interfering with TUI screen.
 */
export class Logger {
    static logFile = null;
    static isDebug = false;
    static init(debug = false) {
        this.isDebug = debug;
        try {
            const dir = path.join(os.homedir(), ".config", "element-cli");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
            }
            this.logFile = path.join(dir, "debug.log");
        }
        catch {
            this.logFile = null;
        }
    }
    static debug(message, ...args) {
        if (!this.isDebug) {
            return;
        }
        this.write("DEBUG", message, args);
    }
    static info(message, ...args) {
        this.write("INFO", message, args);
    }
    static warn(message, ...args) {
        this.write("WARN", message, args);
    }
    static error(message, ...args) {
        this.write("ERROR", message, args);
    }
    static write(level, message, args) {
        if (!this.logFile) {
            return;
        }
        const time = new Date().toISOString();
        const formattedArgs = args.length > 0 ? " " + JSON.stringify(args) : "";
        const line = `[${time}] [${level}] ${message}${formattedArgs}\n`;
        try {
            fs.appendFileSync(this.logFile, line);
        }
        catch {
            // Ignore write errors to avoid crashing CLI
        }
    }
}
