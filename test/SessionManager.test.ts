/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionManager, StoredSession } from "../src/auth/SessionManager.js";

describe("SessionManager", () => {
    const originalFetch = globalThis.fetch;
    const testDir = path.join(os.tmpdir(), "element-cli-test-" + Date.now());

    beforeEach(() => {
        vi.restoreAllMocks();
        // Override config directory for isolation
        SessionManager.setConfigDir(testDir);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    it("saves and loads session with secure file permissions", () => {
        const session: StoredSession = {
            homeserver: "https://matrix.org",
            userId: "@testuser:matrix.org",
            deviceId: "DEVICE123",
            accessToken: "syt_secret_token_123",
            savedAt: Date.now(),
        };

        SessionManager.saveSession(session);
        const loaded = SessionManager.loadSession();

        expect(loaded).toBeDefined();
        expect(loaded?.userId).toBe("@testuser:matrix.org");
        expect(loaded?.accessToken).toBe("syt_secret_token_123");

        // Verify file mode on POSIX systems (mode 0600)
        const stats = fs.statSync(SessionManager.getSessionPath());
        const modeOctal = (stats.mode & 0o777).toString(8);
        expect(modeOctal).toBe("600");
    });

    it("updates lastSyncToken seamlessly", () => {
        const session: StoredSession = {
            homeserver: "https://matrix.org",
            userId: "@testuser:matrix.org",
            deviceId: "DEVICE123",
            accessToken: "token_abc",
            savedAt: Date.now(),
        };

        SessionManager.saveSession(session);
        SessionManager.updateSyncToken("s12345_token");

        const updated = SessionManager.loadSession();
        expect(updated?.lastSyncToken).toBe("s12345_token");
    });

    it("clears session on logout", () => {
        const session: StoredSession = {
            homeserver: "https://matrix.org",
            userId: "@testuser:matrix.org",
            deviceId: "DEVICE123",
            accessToken: "token_abc",
            savedAt: Date.now(),
        };

        SessionManager.saveSession(session);
        expect(SessionManager.loadSession()).not.toBeNull();

        SessionManager.clearSession();
        expect(SessionManager.loadSession()).toBeNull();
    });

    it("verifies valid session with whoami endpoint", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ user_id: "@testuser:matrix.org", device_id: "DEVICE123" }),
        });

        const session: StoredSession = {
            homeserver: "https://matrix.org",
            userId: "@testuser:matrix.org",
            deviceId: "DEVICE123",
            accessToken: "token_valid",
            savedAt: Date.now(),
        };

        const isValid = await SessionManager.verifySession(session);
        expect(isValid).toBe(true);
    });

    it("detects expired or invalid session tokens", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ errcode: "M_UNKNOWN_TOKEN", error: "Token expired" }),
        });

        const session: StoredSession = {
            homeserver: "https://matrix.org",
            userId: "@testuser:matrix.org",
            deviceId: "DEVICE123",
            accessToken: "token_expired",
            savedAt: Date.now(),
        };

        const isValid = await SessionManager.verifySession(session);
        expect(isValid).toBe(false);
    });
});
