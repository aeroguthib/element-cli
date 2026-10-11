/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Logger } from "../utils/logger.js";
/**
 * Maps file extensions to MIME types and Matrix message types.
 */
const EXTENSION_MIME_MAP = {
    // Images
    ".png": { mime: "image/png", msgtype: "m.image" },
    ".jpg": { mime: "image/jpeg", msgtype: "m.image" },
    ".jpeg": { mime: "image/jpeg", msgtype: "m.image" },
    ".gif": { mime: "image/gif", msgtype: "m.image" },
    ".webp": { mime: "image/webp", msgtype: "m.image" },
    ".svg": { mime: "image/svg+xml", msgtype: "m.image" },
    ".bmp": { mime: "image/bmp", msgtype: "m.image" },
    // Videos
    ".mp4": { mime: "video/mp4", msgtype: "m.video" },
    ".webm": { mime: "video/webm", msgtype: "m.video" },
    ".mkv": { mime: "video/x-matroska", msgtype: "m.video" },
    ".mov": { mime: "video/quicktime", msgtype: "m.video" },
    ".avi": { mime: "video/x-msvideo", msgtype: "m.video" },
    // Audio
    ".mp3": { mime: "audio/mpeg", msgtype: "m.audio" },
    ".ogg": { mime: "audio/ogg", msgtype: "m.audio" },
    ".wav": { mime: "audio/wav", msgtype: "m.audio" },
    ".flac": { mime: "audio/flac", msgtype: "m.audio" },
    ".m4a": { mime: "audio/mp4", msgtype: "m.audio" },
    // Documents
    ".pdf": { mime: "application/pdf", msgtype: "m.file" },
    ".txt": { mime: "text/plain", msgtype: "m.file" },
    ".json": { mime: "application/json", msgtype: "m.file" },
    ".zip": { mime: "application/zip", msgtype: "m.file" },
    ".tar": { mime: "application/x-tar", msgtype: "m.file" },
    ".gz": { mime: "application/gzip", msgtype: "m.file" },
    ".doc": { mime: "application/msword", msgtype: "m.file" },
    ".docx": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", msgtype: "m.file" },
};
/**
 * Service to upload local files and send them to Matrix rooms.
 */
export class MediaUploader {
    api;
    constructor(api) {
        this.api = api;
    }
    /**
     * Resolves local file path, handling `~` home directory expansions.
     */
    static resolvePath(filePath) {
        if (filePath.startsWith("~/") || filePath === "~") {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return path.resolve(filePath);
    }
    /**
     * Inspects a file path and determines appropriate MIME and Matrix message types.
     */
    static inspectFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (EXTENSION_MIME_MAP[ext]) {
            return EXTENSION_MIME_MAP[ext];
        }
        return {
            mime: "application/octet-stream",
            msgtype: "m.file",
        };
    }
    /**
     * Reads a local file, uploads it to the homeserver, and sends it to the specified room.
     */
    async uploadAndSend(roomId, rawFilePath, overrideMsgType) {
        const resolvedPath = MediaUploader.resolvePath(rawFilePath);
        let stats;
        try {
            stats = await fs.stat(resolvedPath);
        }
        catch {
            throw new Error(`File not found: ${resolvedPath}`);
        }
        if (!stats.isFile()) {
            throw new Error(`Path is not a regular file: ${resolvedPath}`);
        }
        const filename = path.basename(resolvedPath);
        const { mime, msgtype: detectedType } = MediaUploader.inspectFile(resolvedPath);
        const msgtype = overrideMsgType || detectedType;
        Logger.info(`Uploading file ${filename} (${stats.size} bytes, ${mime}) to Matrix...`);
        const fileBuffer = await fs.readFile(resolvedPath);
        const uploadRes = await this.api.uploadMedia(fileBuffer, filename, mime);
        Logger.info(`File uploaded, content URI: ${uploadRes.content_uri}`);
        const sendRes = await this.api.sendMediaMessage(roomId, uploadRes.content_uri, filename, msgtype, {
            mimetype: mime,
            size: stats.size,
        });
        return {
            eventId: sendRes.event_id,
            contentUri: uploadRes.content_uri,
            filename,
            mimetype: mime,
            size: stats.size,
            msgtype,
        };
    }
}
