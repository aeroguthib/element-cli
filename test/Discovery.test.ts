/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Discovery } from "../src/auth/Discovery.js";

describe("Discovery", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("normalizes homeserver URLs cleanly", () => {
        expect(Discovery.normalizeUrl("matrix.org")).toBe("https://matrix.org");
        expect(Discovery.normalizeUrl("http://localhost:8008/")).toBe("http://localhost:8008");
        expect(Discovery.normalizeUrl("https://example.com///")).toBe("https://example.com");
    });

    it("resolves homeserver via .well-known when available", async () => {
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url === "https://mychat.org/.well-known/matrix/client") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        "m.homeserver": {
                            base_url: "https://matrix.mychat.org",
                        },
                    }),
                });
            }
            if (url === "https://matrix.mychat.org/_matrix/client/versions") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        versions: ["v1.1", "v1.2", "v1.11"],
                    }),
                });
            }
            return Promise.reject(new Error("Unexpected URL: " + url));
        });

        const resolved = await Discovery.resolveHomeserver("mychat.org");
        expect(resolved).toBe("https://matrix.mychat.org");
    });

    it("falls back to direct URL if .well-known is not found", async () => {
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url === "https://custom-matrix.org/.well-known/matrix/client") {
                return Promise.resolve({ ok: false, status: 404 });
            }
            if (url === "https://custom-matrix.org/_matrix/client/versions") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        versions: ["v1.5", "v1.6"],
                    }),
                });
            }
            return Promise.reject(new Error("Unexpected URL: " + url));
        });

        const resolved = await Discovery.resolveHomeserver("custom-matrix.org");
        expect(resolved).toBe("https://custom-matrix.org");
    });

    it("throws helpful error when server does not speak Matrix", async () => {
        globalThis.fetch = vi.fn().mockImplementation(() => {
            return Promise.resolve({ ok: false, status: 404 });
        });

        await expect(Discovery.resolveHomeserver("invalid-site.com")).rejects.toThrow(
            /Failed to connect to Matrix homeserver/i,
        );
    });
});
