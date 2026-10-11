/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { Ansi } from "../utils/format.js";
/**
 * Visual styling theme inspired by Element Web / Compound design tokens.
 */
export const Theme = {
    // Brand colors
    brandGreen: "\x1b[38;2;13;189;139m", // Element Green #0DBD8B
    brandGreenBg: "\x1b[48;2;13;189;139m",
    brandDarkGreen: "\x1b[38;2;9;130;96m",
    // UI Accents
    primary: Ansi.brightGreen,
    accent: Ansi.brightCyan,
    highlight: Ansi.yellow,
    error: Ansi.brightRed,
    warning: Ansi.yellow,
    success: Ansi.brightGreen,
    info: Ansi.cyan,
    // Text hierarchy
    textNormal: Ansi.white,
    textMuted: Ansi.gray,
    textBold: Ansi.bold,
    textDim: Ansi.dim,
    // Borders & UI elements
    border: Ansi.gray,
    borderActive: Ansi.brightGreen,
    selectedBg: "\x1b[48;5;236m",
    selectedFg: Ansi.brightGreen + Ansi.bold,
    // Status indicators
    statusOnline: Ansi.brightGreen + "●" + Ansi.reset,
    statusSyncing: Ansi.brightCyan + "●" + Ansi.reset,
    statusReconnecting: Ansi.yellow + "●" + Ansi.reset,
    statusOffline: Ansi.gray + "○" + Ansi.reset,
    // Box drawing characters (rounded corners)
    box: {
        topLeft: "╭",
        topRight: "╮",
        bottomLeft: "╰",
        bottomRight: "╯",
        horizontal: "─",
        vertical: "│",
        teeRight: "├",
        teeLeft: "┤",
        teeDown: "┬",
        teeUp: "┴",
        cross: "┼",
    },
};
