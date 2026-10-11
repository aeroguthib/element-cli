/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { MatrixApi } from "../api/MatrixApi.js";
import { SessionManager } from "../auth/SessionManager.js";
import { MediaUploader } from "../media/MediaUploader.js";
import { Ansi, formatFileSize } from "../utils/format.js";
export async function sendFileCommand(options) {
    const session = SessionManager.loadSession();
    if (!session) {
        console.error(`${Ansi.red}Not logged in. Run 'element-cli login' first.${Ansi.reset}`);
        process.exit(1);
    }
    if (!options.room || !options.file) {
        console.error(`${Ansi.red}Usage: element-cli send-file --room <roomIdOrAlias> --file <path/to/file> [--type image|video|audio|file]${Ansi.reset}`);
        process.exit(1);
    }
    try {
        const api = new MatrixApi({
            homeserver: session.homeserver,
            accessToken: session.accessToken,
            userId: session.userId,
            deviceId: session.deviceId,
        });
        let targetRoomId = options.room;
        if (targetRoomId.startsWith("#")) {
            console.log(`${Ansi.dim}Resolving room alias ${targetRoomId}...${Ansi.reset}`);
            targetRoomId = await api.resolveRoomAlias(targetRoomId);
        }
        const uploader = new MediaUploader(api);
        console.log(`${Ansi.cyan}Reading and uploading ${options.file}...${Ansi.reset}`);
        const result = await uploader.uploadAndSend(targetRoomId, options.file, options.type);
        console.log(`${Ansi.brightGreen}✓ File successfully sent to ${targetRoomId}!${Ansi.reset}`);
        console.log(`  ${Ansi.bold}Filename:${Ansi.reset}    ${result.filename}`);
        console.log(`  ${Ansi.bold}Size:${Ansi.reset}        ${formatFileSize(result.size)}`);
        console.log(`  ${Ansi.bold}Type:${Ansi.reset}        ${result.msgtype} (${result.mimetype})`);
        console.log(`  ${Ansi.bold}Content URI:${Ansi.reset} ${result.contentUri}`);
        console.log(`  ${Ansi.bold}Event ID:${Ansi.reset}    ${result.eventId}`);
    }
    catch (err) {
        console.error(`${Ansi.red}Failed to send file: ${err.message}${Ansi.reset}`);
        process.exit(1);
    }
}
