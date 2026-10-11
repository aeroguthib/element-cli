/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { MatrixApi } from "../api/MatrixApi.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi } from "../utils/format.js";
export async function logoutCommand() {
    const session = SessionManager.loadSession();
    if (!session) {
        console.log(`${Ansi.yellow}No active session found.${Ansi.reset}`);
        return;
    }
    try {
        const api = new MatrixApi({
            homeserver: session.homeserver,
            accessToken: session.accessToken,
        });
        await api.logout();
    }
    catch {
        // Continue clearing local session even if remote logout call errors
    }
    SessionManager.clearSession();
    console.log(`${Ansi.green}✓ Successfully logged out from ${session.homeserver}.${Ansi.reset}`);
}
