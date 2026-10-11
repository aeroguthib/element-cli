/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { loginCommand } from "./commands/loginCommand.js";
import { logoutCommand } from "./commands/logoutCommand.js";
import { roomsCommand } from "./commands/roomsCommand.js";
import { sendCommand } from "./commands/sendCommand.js";
import { sendFileCommand } from "./commands/sendFileCommand.js";
import { syncCommand } from "./commands/syncCommand.js";
import { whoamiCommand } from "./commands/whoamiCommand.js";
import { TuiApp } from "./tui/TuiApp.js";
import { Ansi } from "./utils/format.js";
import { Logger } from "./utils/logger.js";

export const VERSION = "1.0.0";

function printHelp(): void {
    console.log(`
${Ansi.bold}${Ansi.brightGreen}[E] Element CLI${Ansi.reset} - Secure Matrix Client & TUI (v${VERSION})

${Ansi.bold}USAGE:${Ansi.reset}
  element-cli [command] [options]

${Ansi.bold}COMMANDS:${Ansi.reset}
  ${Ansi.cyan}(default)${Ansi.reset}               Launch the interactive Terminal User Interface (TUI)
  ${Ansi.cyan}login${Ansi.reset}                   Log in to a Matrix homeserver
  ${Ansi.cyan}logout${Ansi.reset}                  Log out and clear stored session
  ${Ansi.cyan}whoami${Ansi.reset}                  Display currently authenticated user and homeserver
  ${Ansi.cyan}rooms${Ansi.reset}                   List joined rooms and metadata
  ${Ansi.cyan}send${Ansi.reset}                    Send a text message to a room
  ${Ansi.cyan}send-file${Ansi.reset}               Upload and send a photo, video, audio or file
  ${Ansi.cyan}sync${Ansi.reset}                    Sync or follow real-time room events
  ${Ansi.cyan}help${Ansi.reset}                    Show this help message

${Ansi.bold}OPTIONS FOR 'login':${Ansi.reset}
  --homeserver <url>      Matrix homeserver address (default: https://matrix.org)
  --username <user>       Matrix ID or username
  --password <pass>       Account password
  --token <token>         Login directly with an existing Matrix access token

${Ansi.bold}OPTIONS FOR 'send':${Ansi.reset}
  --room <roomIdOrAlias>  Target room (e.g. '!abc:server' or '#general:server')
  --message <text>        Message content to send

${Ansi.bold}OPTIONS FOR 'send-file':${Ansi.reset}
  --room <roomIdOrAlias>  Target room
  --file <filepath>       Path to local photo, video, audio or file to send
  --type <type>           Override type: image, video, audio, or file

${Ansi.bold}OPTIONS FOR 'rooms':${Ansi.reset}
  --json                  Output rooms list as JSON

${Ansi.bold}OPTIONS FOR 'sync':${Ansi.reset}
  --room <roomIdOrAlias>  Filter events for specific room
  --follow                Keep running and stream real-time events

${Ansi.bold}GLOBAL OPTIONS:${Ansi.reset}
  -v, --version           Print version information
  -h, --help              Print help documentation
  --debug                 Enable debug logging (~/.config/element-cli/debug.log)

${Ansi.bold}EXAMPLES:${Ansi.reset}
  element-cli                                 # Start interactive TUI
  element-cli login --homeserver matrix.org   # Log in
  element-cli send --room "#chat:matrix.org" --message "Hello from CLI!"
  element-cli send-file --room "!abc:server" --file "./photo.png"
`);
}

/**
 * Parses simple CLI flags: --flag value, --flag=value, --boolean-flag.
 */
function parseArgs(args: string[]): { command: string; options: Record<string, string | boolean> } {
    let command = "";
    const options: Record<string, string | boolean> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const eqIdx = arg.indexOf("=");
            if (eqIdx !== -1) {
                const key = arg.slice(2, eqIdx);
                const val = arg.slice(eqIdx + 1);
                options[key] = val;
            } else {
                const key = arg.slice(2);
                if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                    options[key] = args[i + 1];
                    i++;
                } else {
                    options[key] = true;
                }
            }
        } else if (arg.startsWith("-")) {
            const flag = arg.slice(1);
            if (flag === "v") {
                options.version = true;
            } else if (flag === "h") {
                options.help = true;
            } else {
                options[flag] = true;
            }
        } else if (!command) {
            command = arg;
        }
    }

    return { command, options };
}

/**
 * Main application entrypoint.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
    const { command, options } = parseArgs(argv);

    if (options.debug) {
        Logger.init(true);
    } else {
        Logger.init(false);
    }

    if (options.help || command === "help") {
        printHelp();
        return;
    }

    if (options.version) {
        console.log(`Element CLI v${VERSION}`);
        return;
    }

    switch (command) {
        case "login":
            await loginCommand({
                homeserver: typeof options.homeserver === "string" ? options.homeserver : undefined,
                username: typeof options.username === "string" ? options.username : undefined,
                password: typeof options.password === "string" ? options.password : undefined,
                token: typeof options.token === "string" ? options.token : undefined,
            });
            break;

        case "logout":
            await logoutCommand();
            break;

        case "whoami":
            await whoamiCommand();
            break;

        case "rooms":
            await roomsCommand({
                json: Boolean(options.json),
            });
            break;

        case "send": {
            const room = (options.room as string) || (argv[1] && !argv[1].startsWith("-") ? argv[1] : "");
            const message = (options.message as string) || (argv[2] && !argv[2].startsWith("-") ? argv[2] : "");
            await sendCommand({ room, message });
            break;
        }

        case "send-file": {
            const room = (options.room as string) || (argv[1] && !argv[1].startsWith("-") ? argv[1] : "");
            const file = (options.file as string) || (argv[2] && !argv[2].startsWith("-") ? argv[2] : "");
            const type =
                typeof options.type === "string"
                    ? (options.type as "m.image" | "m.video" | "m.audio" | "m.file")
                    : undefined;
            await sendFileCommand({ room, file, type });
            break;
        }

        case "sync":
            await syncCommand({
                room: typeof options.room === "string" ? options.room : undefined,
                follow: Boolean(options.follow),
            });
            break;

        case "tui":
        case "": {
            // Default action: Launch TUI
            const app = new TuiApp();
            await app.start();
            break;
        }

        default:
            console.error(`${Ansi.red}Unknown command: '${command}'${Ansi.reset}`);
            printHelp();
            process.exit(1);
    }
}
