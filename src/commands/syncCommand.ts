/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixApi } from "../api/MatrixApi.js";
import { MatrixSyncEngine } from "../api/MatrixSyncEngine.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi, formatTime, getUserColor } from "../utils/format.js";

export interface SyncOptions {
    room?: string;
    limit?: number;
    follow?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
    const session = SessionManager.loadSession();
    if (!session) {
        console.error(`${Ansi.red}Not logged in. Run 'element-cli login' first.${Ansi.reset}`);
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
        if (targetRoomId && targetRoomId.startsWith("#")) {
            targetRoomId = await api.resolveRoomAlias(targetRoomId);
        }

        const engine = new MatrixSyncEngine(api, session.lastSyncToken);

        engine.on("message:new", ({ roomId, message }) => {
            if (targetRoomId && roomId !== targetRoomId) {
                return;
            }
            const time = `${Ansi.dim}[${formatTime(message.timestamp)}]${Ansi.reset}`;
            const userCol = getUserColor(message.senderId);
            const user = `${userCol}<${message.senderName}>${Ansi.reset}`;
            const roomTag = targetRoomId ? "" : `${Ansi.cyan}[${roomId}]${Ansi.reset} `;

            if (message.msgtype === "m.emote") {
                console.log(`${roomTag}${time} * ${message.senderName} ${message.body}`);
            } else if (message.mediaUrl) {
                console.log(`${roomTag}${time} ${user} [${message.msgtype}] ${message.body} (${message.mediaUrl})`);
            } else {
                console.log(`${roomTag}${time} ${user} ${message.body}`);
            }
        });

        console.log(`${Ansi.cyan}Connecting to ${session.homeserver} as ${session.userId}...${Ansi.reset}`);
        if (options.follow) {
            console.log(`${Ansi.dim}Listening for real-time messages (Ctrl+C to stop)...${Ansi.reset}\n`);
            await engine.start();
        } else {
            const syncRes = await api.sync(undefined, 0);
            engine.processSyncResponse(syncRes);
            console.log(`${Ansi.green}✓ Sync complete.${Ansi.reset}`);
        }
    } catch (err) {
        console.error(`${Ansi.red}Sync error: ${(err as Error).message}${Ansi.reset}`);
        process.exit(1);
    }
}
