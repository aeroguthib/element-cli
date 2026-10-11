#!/usr/bin/env node
/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const distPath = path.join(__dirname, "..", "dist", "index.js");
    const libPath = path.join(__dirname, "..", "lib", "index.js");
    const srcPath = path.join(__dirname, "..", "src", "index.ts");

    if (fs.existsSync(distPath)) {
        const { main } = await import(distPath);
        await main();
    } else if (fs.existsSync(libPath)) {
        const { main } = await import(libPath);
        await main();
    } else {
        const { main } = await import(srcPath);
        await main();
    }
}

run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
