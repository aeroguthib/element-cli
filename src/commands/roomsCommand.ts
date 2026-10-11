/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixApi } from "../api/MatrixApi.js";
import { MatrixSyncEngine } from "../api/MatrixSyncEngine.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi } from "../utils/format.js";

export interface RoomsOptions {
    json?: boolean;
}

export async function roomsCommand(options: RoomsOptions): Promise<void> {
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

        // Perform initial sync to populate room metadata
        const syncRes = await api.sync(undefined, 0);
        const engine = new MatrixSyncEngine(api);
        engine.processSyncResponse(syncRes);

        const rooms = engine.getRooms();

        if (options.json) {
            console.log(
                JSON.stringify(
                    rooms.map((r) => ({
                        id: r.id,
                        name: r.name,
                        alias: r.canonicalAlias,
                        topic: r.topic,
                        memberCount: r.memberCount,
                        unreadCount: r.unreadCount,
                    })),
                    null,
                    2,
                ),
            );
            return;
        }

        console.log(`\n${Ansi.bold}${Ansi.green}JOINED ROOMS (${rooms.length}):${Ansi.reset}\n`);
        for (const room of rooms) {
            const alias = room.canonicalAlias ? ` (${room.canonicalAlias})` : "";
            const members = room.memberCount > 0 ? ` [${room.memberCount} members]` : "";
            console.log(`  ${Ansi.cyan}${room.name}${Ansi.reset}${alias}${members}`);
            console.log(`    ${Ansi.dim}ID: ${room.id}${Ansi.reset}`);
            if (room.topic) {
                console.log(`    ${Ansi.dim}Topic: ${room.topic}${Ansi.reset}`);
            }
        }
        console.log("");
    } catch (err) {
        console.error(`${Ansi.red}Failed to fetch rooms: ${(err as Error).message}${Ansi.reset}`);
        process.exit(1);
    }
}
