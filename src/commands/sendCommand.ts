/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixApi } from "../api/MatrixApi.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi } from "../utils/format.js";

export interface SendOptions {
    room: string;
    message: string;
}

export async function sendCommand(options: SendOptions): Promise<void> {
    const session = SessionManager.loadSession();
    if (!session) {
        console.error(`${Ansi.red}Not logged in. Run 'element-cli login' first.${Ansi.reset}`);
        process.exit(1);
    }

    if (!options.room || !options.message) {
        console.error(`${Ansi.red}Usage: element-cli send --room <roomIdOrAlias> --message <text>${Ansi.reset}`);
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

        const res = await api.sendTextMessage(targetRoomId, options.message);
        console.log(`${Ansi.brightGreen}✓ Message sent to ${targetRoomId}${Ansi.reset}`);
        console.log(`${Ansi.dim}Event ID: ${res.event_id}${Ansi.reset}`);
    } catch (err) {
        console.error(`${Ansi.red}Failed to send message: ${(err as Error).message}${Ansi.reset}`);
        process.exit(1);
    }
}
