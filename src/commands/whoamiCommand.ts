/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixApi } from "../api/MatrixApi.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi } from "../utils/format.js";

export async function whoamiCommand(): Promise<void> {
    const session = SessionManager.loadSession();
    if (!session) {
        console.error(`${Ansi.red}Not logged in. Run 'element-cli login' first.${Ansi.reset}`);
        process.exit(1);
    }

    try {
        const api = new MatrixApi({
            homeserver: session.homeserver,
            accessToken: session.accessToken,
        });
        const info = await api.whoami();

        console.log(`${Ansi.bold}User ID:${Ansi.reset}     ${Ansi.cyan}${info.user_id}${Ansi.reset}`);
        console.log(`${Ansi.bold}Homeserver:${Ansi.reset}  ${session.homeserver}`);
        console.log(`${Ansi.bold}Device ID:${Ansi.reset}   ${info.device_id || session.deviceId}`);
        console.log(`${Ansi.bold}Status:${Ansi.reset}      ${Ansi.green}Authenticated${Ansi.reset}`);
    } catch (err) {
        console.error(`${Ansi.red}Session verification failed: ${(err as Error).message}${Ansi.reset}`);
        process.exit(1);
    }
}
