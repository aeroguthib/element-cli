/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it, expect } from "vitest";
import {
    Ansi,
    formatFileSize,
    formatTime,
    getUserColor,
    mxcToHttpUrl,
    stripAnsi,
    truncate,
    wrapText,
} from "../src/utils/format.js";

describe("format utils", () => {
    it("strips ANSI escape codes accurately", () => {
        const text = `${Ansi.bold}${Ansi.green}Hello ${Ansi.cyan}World!${Ansi.reset}`;
        expect(stripAnsi(text)).toBe("Hello World!");
    });

    it("truncates strings with ellipsis when exceeding length", () => {
        expect(truncate("Hello World", 8)).toBe("Hello W…");
        expect(truncate("Short", 10)).toBe("Short");
        expect(truncate("Exact", 5)).toBe("Exact");
    });

    it("formats file sizes cleanly", () => {
        expect(formatFileSize(500)).toBe("500 B");
        expect(formatFileSize(1024)).toBe("1.0 KB");
        expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
        expect(formatFileSize(1024 * 1024 * 1024 * 1.2)).toBe("1.2 GB");
    });

    it("formats epoch timestamps to HH:MM format", () => {
        const ts = new Date(2026, 0, 1, 14, 25, 0).getTime();
        expect(formatTime(ts)).toBe("14:25");
    });

    it("converts mxc:// URLs to HTTP media endpoints", () => {
        const mxc = "mxc://matrix.org/abc123xyz";
        const http = mxcToHttpUrl(mxc, "https://matrix.org");
        expect(http).toBe("https://matrix.org/_matrix/media/v3/download/matrix.org/abc123xyz");

        // Non-mxc URLs returned as-is
        expect(mxcToHttpUrl("https://example.com/image.png", "https://matrix.org")).toBe(
            "https://example.com/image.png",
        );
    });

    it("generates deterministic ANSI user colors based on user ID", () => {
        const color1 = getUserColor("@alice:matrix.org");
        const color2 = getUserColor("@alice:matrix.org");
        const color3 = getUserColor("@bob:matrix.org");

        expect(color1).toBe(color2);
        expect(typeof color1).toBe("string");
        expect(color1.startsWith("\x1b[")).toBe(true);
    });

    it("wraps long lines respecting words", () => {
        const text = "This is a sentence that should wrap nicely across multiple terminal lines.";
        const wrapped = wrapText(text, 25);
        expect(wrapped.length).toBeGreaterThan(1);
        for (const line of wrapped) {
            expect(stripAnsi(line).length).toBeLessThanOrEqual(25);
        }
    });
});
