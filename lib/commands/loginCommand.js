/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { MatrixApi } from "../api/MatrixApi.js";
import { Discovery } from "../auth/Discovery.js";
import { SessionManager } from "../auth/SessionManager.js";
import { Ansi } from "../utils/format.js";
export async function loginCommand(options) {
    const rl = readline.createInterface({ input, output });
    try {
        let homeserver = options.homeserver;
        if (!homeserver) {
            homeserver = await rl.question(`Matrix Homeserver [https://matrix.org]: `);
            if (!homeserver.trim()) {
                homeserver = "https://matrix.org";
            }
        }
        console.log(`${Ansi.cyan}Resolving homeserver ${homeserver}...${Ansi.reset}`);
        const resolvedHomeserver = await Discovery.resolveHomeserver(homeserver);
        console.log(`${Ansi.green}Connected to ${resolvedHomeserver}${Ansi.reset}`);
        const api = new MatrixApi({ homeserver: resolvedHomeserver });
        let session;
        if (options.token) {
            console.log(`${Ansi.cyan}Validating access token...${Ansi.reset}`);
            const whoami = await api.loginWithToken(options.token);
            session = {
                homeserver: resolvedHomeserver,
                userId: whoami.user_id,
                deviceId: whoami.device_id || "ELEMENT_CLI",
                accessToken: options.token,
                savedAt: Date.now(),
            };
        }
        else {
            let username = options.username;
            if (!username) {
                username = await rl.question(`Username (or Matrix ID): `);
            }
            let password = options.password;
            if (!password) {
                password = await rl.question(`Password: `);
            }
            if (!username || !password) {
                console.error(`${Ansi.red}Error: Username and password are required.${Ansi.reset}`);
                process.exit(1);
            }
            console.log(`${Ansi.cyan}Logging in as ${username}...${Ansi.reset}`);
            const res = await api.loginWithPassword(username, password);
            session = {
                homeserver: resolvedHomeserver,
                userId: res.user_id,
                deviceId: res.device_id,
                accessToken: res.access_token,
                savedAt: Date.now(),
            };
        }
        SessionManager.saveSession(session);
        console.log(`${Ansi.brightGreen}✓ Successfully logged in as ${session.userId}${Ansi.reset}`);
        console.log(`Session saved to ${SessionManager.getSessionPath()}`);
    }
    catch (err) {
        console.error(`${Ansi.red}Login failed: ${err.message}${Ansi.reset}`);
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
