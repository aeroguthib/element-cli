/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { Theme } from "../Theme.js";
import { Ansi, stripAnsi } from "../../utils/format.js";
/**
 * Help modal overlay with keyboard shortcuts and command reference.
 */
export class HelpModal {
    static render(width, height) {
        const boxWidth = Math.min(76, width - 4);
        const innerWidth = boxWidth - 4;
        const b = Theme.box;
        const bColor = Theme.brandGreen;
        const lines = [];
        const contentLines = [
            `${bColor}${b.topLeft}${b.horizontal.repeat(boxWidth - 2)}${b.topRight}${Ansi.reset}`,
            this.formatRow(` ${Theme.brandGreen}${Ansi.bold}[E] ELEMENT CLI - HELP & COMMAND REFERENCE${Ansi.reset}`, innerWidth),
            `${bColor}${b.teeRight}${b.horizontal.repeat(boxWidth - 2)}${b.teeLeft}${Ansi.reset}`,
            this.formatRow(` ${Ansi.bold}KEYBOARD SHORTCUTS${Ansi.reset}`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}Tab / Shift+Tab${Ansi.reset}    Switch pane (Rooms List <-> Chat Input)`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}↑ / ↓${Ansi.reset}              Navigate rooms (Sidebar) or Command History (Input)`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}PgUp / PgDn${Ansi.reset}        Scroll message timeline up and down`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}Enter${Ansi.reset}              Select room or send typed message`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}Esc${Ansi.reset}                Dismiss modal or blur current pane`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}Ctrl+L${Ansi.reset}             Repaint screen`, innerWidth),
            this.formatRow(`  ${Ansi.cyan}Ctrl+C${Ansi.reset}             Quit Element CLI`, innerWidth),
            this.formatRow(``, innerWidth),
            this.formatRow(` ${Ansi.bold}IN-CHAT COMMANDS${Ansi.reset}`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/file <filepath>${Ansi.reset}  Upload & send a photo, video, or file!`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/upload <path>${Ansi.reset}    Alias for /file`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/me <action>${Ansi.reset}      Send an emote action message`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/join <room>${Ansi.reset}      Join room by #alias:server or !id:server`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/leave${Ansi.reset}            Leave the currently active room`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/whoami${Ansi.reset}           Show current user ID, device, homeserver`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/logout${Ansi.reset}           Log out and return to login screen`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/clear${Ansi.reset}            Clear local timeline view`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/help${Ansi.reset}             Show this help screen`, innerWidth),
            this.formatRow(`  ${Ansi.yellow}/quit, /exit${Ansi.reset}      Exit Element CLI`, innerWidth),
            this.formatRow(``, innerWidth),
            this.formatRow(` ${Theme.textMuted}Press [Esc] or [Enter] to return to chat${Ansi.reset}`, innerWidth),
            `${bColor}${b.bottomLeft}${b.horizontal.repeat(boxWidth - 2)}${b.bottomRight}${Ansi.reset}`,
        ];
        // Center on screen
        const topPadding = Math.max(1, Math.floor((height - contentLines.length) / 2));
        for (let i = 0; i < topPadding; i++) {
            lines.push("");
        }
        const padLeft = Math.max(0, Math.floor((width - boxWidth) / 2));
        const leftIndent = " ".repeat(padLeft);
        for (const cl of contentLines) {
            lines.push(leftIndent + cl);
        }
        return lines;
    }
    static formatRow(text, innerWidth) {
        const visible = stripAnsi(text).length;
        const padRight = Math.max(0, innerWidth - visible);
        const b = Theme.box;
        const bColor = Theme.brandGreen;
        return `${bColor}${b.vertical}${Ansi.reset}  ${text}${" ".repeat(padRight)}${bColor}${b.vertical}${Ansi.reset}`;
    }
}
