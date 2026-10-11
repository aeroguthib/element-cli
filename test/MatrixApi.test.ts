/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MatrixApi } from "../src/api/MatrixApi.js";

describe("MatrixApi", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("logs in with username and password", async () => {
        globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
            expect(url).toBe("https://matrix.org/_matrix/client/v3/login");
            expect(init?.method).toBe("POST");
            const body = JSON.parse(init?.body as string);
            expect(body.type).toBe("m.login.password");
            expect(body.identifier.user).toBe("alice");
            expect(body.password).toBe("secret");

            return Promise.resolve({
                ok: true,
                json: async () => ({
                    user_id: "@alice:matrix.org",
                    access_token: "syt_token_123",
                    device_id: "DEVICE_XYZ",
                    home_server: "matrix.org",
                }),
            });
        });

        const api = new MatrixApi({ homeserver: "https://matrix.org" });
        const res = await api.loginWithPassword("alice", "secret");

        expect(res.user_id).toBe("@alice:matrix.org");
        expect(res.access_token).toBe("syt_token_123");
        expect(api.getAccessToken()).toBe("syt_token_123");
    });

    it("sends text messages with transaction ID", async () => {
        let sentUrl = "";
        let sentBody: Record<string, unknown> = {};

        globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
            sentUrl = url;
            sentBody = JSON.parse(init?.body as string);
            return Promise.resolve({
                ok: true,
                json: async () => ({ event_id: "$event123" }),
            });
        });

        const api = new MatrixApi({
            homeserver: "https://matrix.org",
            accessToken: "token_123",
        });

        const res = await api.sendTextMessage("!room1:matrix.org", "Hello Matrix!");

        expect(res.event_id).toBe("$event123");
        expect(sentUrl).toContain("/send/m.room.message/");
        expect(sentUrl).toContain(encodeURIComponent("!room1:matrix.org"));
        expect(sentBody.msgtype).toBe("m.text");
        expect(sentBody.body).toBe("Hello Matrix!");
    });

    it("uploads media binaries with correct headers", async () => {
        let uploadContentType = "";
        let uploadFilename = "";

        globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
            const parsed = new URL(url);
            uploadFilename = parsed.searchParams.get("filename") || "";
            const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
            uploadContentType = headers.get("content-type") || "";

            return Promise.resolve({
                ok: true,
                json: async () => ({ content_uri: "mxc://matrix.org/media123" }),
            });
        });

        const api = new MatrixApi({
            homeserver: "https://matrix.org",
            accessToken: "token_123",
        });

        const data = new Uint8Array([1, 2, 3, 4]);
        const res = await api.uploadMedia(data, "photo.jpg", "image/jpeg");

        expect(res.content_uri).toBe("mxc://matrix.org/media123");
        expect(uploadFilename).toBe("photo.jpg");
        expect(uploadContentType).toBe("image/jpeg");
    });

    it("sends media messages with mxc URL and metadata", async () => {
        let sentBody: Record<string, unknown> = {};

        globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
            sentBody = JSON.parse(init?.body as string);
            return Promise.resolve({
                ok: true,
                json: async () => ({ event_id: "$media_event_456" }),
            });
        });

        const api = new MatrixApi({
            homeserver: "https://matrix.org",
            accessToken: "token_123",
        });

        const res = await api.sendMediaMessage(
            "!room1:matrix.org",
            "mxc://matrix.org/media123",
            "video.mp4",
            "m.video",
            { mimetype: "video/mp4", size: 1048576 },
        );

        expect(res.event_id).toBe("$media_event_456");
        expect(sentBody.msgtype).toBe("m.video");
        expect(sentBody.url).toBe("mxc://matrix.org/media123");
        expect(sentBody.body).toBe("video.mp4");
        expect((sentBody.info as Record<string, unknown>).mimetype).toBe("video/mp4");
    });

    it("resolves room alias to room ID", async () => {
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            expect(url).toContain("/_matrix/client/v3/directory/room/%23chat%3Amatrix.org");
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    room_id: "!realroom:matrix.org",
                    servers: ["matrix.org"],
                }),
            });
        });

        const api = new MatrixApi({ homeserver: "https://matrix.org", accessToken: "tok" });
        const roomId = await api.resolveRoomAlias("#chat:matrix.org");
        expect(roomId).toBe("!realroom:matrix.org");
    });

    it("handles Matrix error responses cleanly", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({
                errcode: "M_FORBIDDEN",
                error: "You are not a member of this room",
            }),
        });

        const api = new MatrixApi({ homeserver: "https://matrix.org", accessToken: "tok" });
        await expect(api.sendTextMessage("!forbidden:matrix.org", "test")).rejects.toThrow(
            /You are not a member of this room/,
        );
    });
});
