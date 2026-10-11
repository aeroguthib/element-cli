/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixVersionsResponse, MatrixWellKnownResponse } from "../api/types.js";
import { Logger } from "../utils/logger.js";

/**
 * Resolves and verifies Matrix homeserver URLs and handles .well-known resolution.
 */
export class Discovery {
    /**
     * Normalizes a homeserver URL by adding default protocol and trimming slashes.
     */
    public static normalizeUrl(input: string): string {
        let trimmed = input.trim();
        if (!trimmed) {
            trimmed = "https://matrix.org";
        }

        if (!/^https?:\/\//i.test(trimmed)) {
            trimmed = `https://${trimmed}`;
        }

        return trimmed.replace(/\/+$/, "");
    }

    /**
     * Resolves a user-provided server address (e.g. "matrix.org" or "https://matrix.org")
     * to a fully qualified, verified Matrix homeserver base URL.
     */
    public static async resolveHomeserver(input: string): Promise<string> {
        let targetUrl = Discovery.normalizeUrl(input);

        // Step 1: Try .well-known resolution
        try {
            const parsed = new URL(targetUrl);
            const wellKnownUrl = `${parsed.protocol}//${parsed.host}/.well-known/matrix/client`;
            Logger.debug(`Probing .well-known at ${wellKnownUrl}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(wellKnownUrl, {
                signal: controller.signal,
                headers: { Accept: "application/json" },
            });
            clearTimeout(timeout);

            if (res.ok) {
                const data = (await res.json()) as MatrixWellKnownResponse;
                if (data["m.homeserver"] && typeof data["m.homeserver"].base_url === "string") {
                    const resolved = data["m.homeserver"].base_url.replace(/\/+$/, "");
                    Logger.info(`Resolved ${targetUrl} via .well-known to ${resolved}`);
                    targetUrl = resolved;
                }
            }
        } catch (err) {
            Logger.debug(`.well-known resolution failed for ${targetUrl}:`, err);
            // Fall back to targetUrl directly
        }

        // Step 2: Validate homeserver by querying /_matrix/client/versions
        const versionsUrl = `${targetUrl}/_matrix/client/versions`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(versionsUrl, {
                signal: controller.signal,
                headers: { Accept: "application/json" },
            });
            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`Homeserver responded with HTTP ${res.status}`);
            }

            const data = (await res.json()) as MatrixVersionsResponse;
            if (!Array.isArray(data.versions)) {
                throw new Error("Invalid response format: missing 'versions' array");
            }

            Logger.info(`Connected to homeserver ${targetUrl}, supported versions: ${data.versions.join(", ")}`);
            return targetUrl;
        } catch (err) {
            throw new Error(`Failed to connect to Matrix homeserver at ${targetUrl}: ${(err as Error).message}`);
        }
    }
}
