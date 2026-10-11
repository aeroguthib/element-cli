/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MatrixApi } from "../src/api/MatrixApi.js";
import { MediaUploader } from "../src/media/MediaUploader.js";

describe("MediaUploader", () => {
    const tempDir = path.join(os.tmpdir(), "media-test-" + Date.now());

    beforeEach(async () => {
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });

    it("inspects file extensions to determine appropriate MIME and Matrix message type", () => {
        expect(MediaUploader.inspectFile("vacation.png")).toEqual({
            mime: "image/png",
            msgtype: "m.image",
        });

        expect(MediaUploader.inspectFile("recording.mp4")).toEqual({
            mime: "video/mp4",
            msgtype: "m.video",
        });

        expect(MediaUploader.inspectFile("podcast.mp3")).toEqual({
            mime: "audio/mpeg",
            msgtype: "m.audio",
        });

        expect(MediaUploader.inspectFile("report.pdf")).toEqual({
            mime: "application/pdf",
            msgtype: "m.file",
        });

        expect(MediaUploader.inspectFile("archive.customext")).toEqual({
            mime: "application/octet-stream",
            msgtype: "m.file",
        });
    });

    it("resolves tilde paths correctly", () => {
        const home = os.homedir();
        expect(MediaUploader.resolvePath("~/photos/cat.jpg")).toBe(path.join(home, "photos", "cat.jpg"));
    });

    it("reads local file and uploads and dispatches to Matrix room", async () => {
        const testFilePath = path.join(tempDir, "avatar.png");
        const fileBytes = Buffer.from("mock png file data content");
        await fs.writeFile(testFilePath, fileBytes);

        const mockApi = new MatrixApi({ homeserver: "https://matrix.org", accessToken: "token_xyz" });

        vi.spyOn(mockApi, "uploadMedia").mockResolvedValue({
            content_uri: "mxc://matrix.org/upload999",
        });

        vi.spyOn(mockApi, "sendMediaMessage").mockResolvedValue({
            event_id: "$event_upload_777",
        });

        const uploader = new MediaUploader(mockApi);
        const result = await uploader.uploadAndSend("!room:matrix.org", testFilePath);

        expect(result.eventId).toBe("$event_upload_777");
        expect(result.contentUri).toBe("mxc://matrix.org/upload999");
        expect(result.filename).toBe("avatar.png");
        expect(result.mimetype).toBe("image/png");
        expect(result.msgtype).toBe("m.image");
        expect(result.size).toBe(fileBytes.length);

        expect(mockApi.uploadMedia).toHaveBeenCalledWith(expect.any(Uint8Array), "avatar.png", "image/png");
        expect(mockApi.sendMediaMessage).toHaveBeenCalledWith(
            "!room:matrix.org",
            "mxc://matrix.org/upload999",
            "avatar.png",
            "m.image",
            {
                mimetype: "image/png",
                size: fileBytes.length,
            },
        );
    });

    it("throws clear error when target file does not exist", async () => {
        const mockApi = new MatrixApi({ homeserver: "https://matrix.org", accessToken: "token_xyz" });
        const uploader = new MediaUploader(mockApi);

        await expect(uploader.uploadAndSend("!room:matrix.org", "/path/to/nonexistent.png")).rejects.toThrow(
            /File not found/,
        );
    });
});
