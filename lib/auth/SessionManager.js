/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Logger } from "../utils/logger.js";
/**
 * Manages loading, storing, verifying, and clearing user sessions.
 */
export class SessionManager {
    static sessionDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "element-cli");
    static sessionFilePath = path.join(SessionManager.sessionDir, "session.json");
    /**
     * Sets a custom configuration directory (useful for testing or profile isolation).
     */
    static setConfigDir(dir) {
        this.sessionDir = dir;
        this.sessionFilePath = path.join(dir, "session.json");
    }
    /**
     * Sets a custom session file path (useful for testing or profile isolation).
     */
    static setCustomPath(filePath) {
        this.sessionFilePath = filePath;
        this.sessionDir = path.dirname(filePath);
    }
    /**
     * Returns the active session file path.
     */
    static getSessionPath() {
        return this.sessionFilePath;
    }
    /**
     * Checks if a session file currently exists on disk.
     */
    static hasSession() {
        return fs.existsSync(this.sessionFilePath);
    }
    /**
     * Loads the stored session from disk.
     */
    static loadSession() {
        try {
            if (!this.hasSession()) {
                return null;
            }
            const raw = fs.readFileSync(this.sessionFilePath, "utf8");
            const data = JSON.parse(raw);
            if (!data.homeserver || !data.userId || !data.accessToken) {
                Logger.warn("Stored session file is missing required fields");
                return null;
            }
            return data;
        }
        catch (err) {
            Logger.error("Failed to read session file:", err);
            return null;
        }
    }
    /**
     * Saves a session securely to disk with mode 0600.
     */
    static saveSession(session) {
        try {
            if (!fs.existsSync(this.sessionDir)) {
                fs.mkdirSync(this.sessionDir, { recursive: true, mode: 0o700 });
            }
            const payload = {
                ...session,
                savedAt: Date.now(),
            };
            fs.writeFileSync(this.sessionFilePath, JSON.stringify(payload, null, 2), {
                encoding: "utf8",
                mode: 0o600,
            });
            Logger.info(`Session saved for ${session.userId} at ${session.homeserver}`);
        }
        catch (err) {
            Logger.error("Failed to save session:", err);
            throw new Error(`Failed to save session: ${err.message}`);
        }
    }
    /**
     * Updates the sync token in the active session.
     */
    static updateSyncToken(token) {
        const current = this.loadSession();
        if (current) {
            current.lastSyncToken = token;
            this.saveSession(current);
        }
    }
    /**
     * Clears the current session file.
     */
    static clearSession() {
        try {
            if (this.hasSession()) {
                fs.unlinkSync(this.sessionFilePath);
                Logger.info("Session file removed");
            }
        }
        catch (err) {
            Logger.error("Failed to delete session file:", err);
        }
    }
    /**
     * Validates the session with the homeserver via /account/whoami.
     */
    static async verifySession(session) {
        try {
            const url = `${session.homeserver.replace(/\/+$/, "")}/_matrix/client/v3/account/whoami`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 7000);
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    Accept: "application/json",
                },
            });
            clearTimeout(timeout);
            if (!res.ok) {
                Logger.warn(`Session verification failed with status ${res.status}`);
                return false;
            }
            const data = (await res.json());
            return data.user_id === session.userId;
        }
        catch (err) {
            Logger.warn("Session verification network error:", err);
            return false;
        }
    }
}
