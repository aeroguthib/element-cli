/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixLoginResponse, MatrixWhoAmIResponse, MatrixSyncResponse, MatrixUploadResponse } from "./types.js";
import { Logger } from "../utils/logger.js";

/**
 * Options to configure the MatrixApi instance.
 */
export interface MatrixApiConfig {
    homeserver: string;
    accessToken?: string;
    userId?: string;
    deviceId?: string;
}

/**
 * Client-Server API implementation for Matrix homeservers.
 */
export class MatrixApi {
    private homeserver: string;
    private accessToken: string | null = null;
    private userId: string | null = null;
    private deviceId: string | null = null;
    private txnCounter = 0;

    public constructor(config: MatrixApiConfig) {
        this.homeserver = config.homeserver.replace(/\/+$/, "");
        this.accessToken = config.accessToken ?? null;
        this.userId = config.userId ?? null;
        this.deviceId = config.deviceId ?? null;
    }

    public getHomeserver(): string {
        return this.homeserver;
    }

    public getUserId(): string | null {
        return this.userId;
    }

    public getAccessToken(): string | null {
        return this.accessToken;
    }

    public getDeviceId(): string | null {
        return this.deviceId;
    }

    public setCredentials(accessToken: string, userId: string, deviceId?: string): void {
        this.accessToken = accessToken;
        this.userId = userId;
        if (deviceId) {
            this.deviceId = deviceId;
        }
    }

    /**
     * Generates a unique transaction ID for idempotent message sending.
     */
    public nextTxnId(): string {
        this.txnCounter += 1;
        return `m${Date.now()}.${this.txnCounter}`;
    }

    /**
     * Logs in with a username and password.
     */
    public async loginWithPassword(
        username: string,
        password: string,
        deviceName = "Element CLI",
    ): Promise<MatrixLoginResponse> {
        const url = `${this.homeserver}/_matrix/client/v3/login`;
        const body = {
            type: "m.login.password",
            identifier: {
                type: "m.id.user",
                user: username,
            },
            password,
            initial_device_display_name: deviceName,
        };

        const res = await this.request<MatrixLoginResponse>(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        });

        this.accessToken = res.access_token;
        this.userId = res.user_id;
        this.deviceId = res.device_id;

        Logger.info(`Successfully logged in as ${res.user_id}`);
        return res;
    }

    /**
     * Validates and attaches a pre-existing access token.
     */
    public async loginWithToken(token: string): Promise<MatrixWhoAmIResponse> {
        this.accessToken = token;
        const whoami = await this.whoami();
        this.userId = whoami.user_id;
        if (whoami.device_id) {
            this.deviceId = whoami.device_id;
        }
        return whoami;
    }

    /**
     * Queries /account/whoami.
     */
    public async whoami(): Promise<MatrixWhoAmIResponse> {
        const url = `${this.homeserver}/_matrix/client/v3/account/whoami`;
        return this.request<MatrixWhoAmIResponse>(url, { method: "GET" });
    }

    /**
     * Logs out the active session.
     */
    public async logout(): Promise<void> {
        if (!this.accessToken) {
            return;
        }
        const url = `${this.homeserver}/_matrix/client/v3/logout`;
        try {
            await this.request(url, { method: "POST" });
        } catch (err) {
            Logger.warn("Logout request failed:", err);
        } finally {
            this.accessToken = null;
            this.userId = null;
            this.deviceId = null;
        }
    }

    /**
     * Long-polling Matrix sync request.
     */
    public async sync(since?: string, timeoutMs = 30000, filter?: unknown): Promise<MatrixSyncResponse> {
        const params = new URLSearchParams();
        params.set("timeout", String(timeoutMs));
        if (since) {
            params.set("since", since);
        }
        if (filter) {
            params.set("filter", typeof filter === "string" ? filter : JSON.stringify(filter));
        }

        const url = `${this.homeserver}/_matrix/client/v3/sync?${params.toString()}`;
        // Network timeout slightly larger than server long-poll timeout
        return this.request<MatrixSyncResponse>(url, { method: "GET" }, timeoutMs + 10000);
    }

    /**
     * Sends a plain text message to a room.
     */
    public async sendTextMessage(roomId: string, text: string): Promise<{ event_id: string }> {
        const txnId = this.nextTxnId();
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`;
        const body = {
            msgtype: "m.text",
            body: text,
        };
        return this.request<{ event_id: string }>(url, {
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Sends an emote (/me) message to a room.
     */
    public async sendEmoteMessage(roomId: string, text: string): Promise<{ event_id: string }> {
        const txnId = this.nextTxnId();
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`;
        const body = {
            msgtype: "m.emote",
            body: text,
        };
        return this.request<{ event_id: string }>(url, {
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Uploads media to Matrix Content Repository (mxc).
     */
    public async uploadMedia(data: Uint8Array, filename: string, contentType: string): Promise<MatrixUploadResponse> {
        // Try media v3 upload first, fallback to client v3 upload
        const params = new URLSearchParams();
        params.set("filename", filename);

        const mediaUrl = `${this.homeserver}/_matrix/media/v3/upload?${params.toString()}`;
        try {
            return await this.request<MatrixUploadResponse>(
                mediaUrl,
                {
                    method: "POST",
                    body: data,
                    headers: {
                        "Content-Type": contentType || "application/octet-stream",
                    },
                },
                60000,
            );
        } catch (err) {
            Logger.debug("Media v3 upload failed, trying /_matrix/client/v3/upload fallback:", err);
            const clientUploadUrl = `${this.homeserver}/_matrix/client/v3/upload?${params.toString()}`;
            return await this.request<MatrixUploadResponse>(
                clientUploadUrl,
                {
                    method: "POST",
                    body: data,
                    headers: {
                        "Content-Type": contentType || "application/octet-stream",
                    },
                },
                60000,
            );
        }
    }

    /**
     * Sends a media message (image, video, audio, or generic file) to a room.
     */
    public async sendMediaMessage(
        roomId: string,
        contentUri: string,
        filename: string,
        msgtype: "m.image" | "m.video" | "m.audio" | "m.file",
        info?: {
            mimetype?: string;
            size?: number;
            w?: number;
            h?: number;
            duration?: number;
        },
    ): Promise<{ event_id: string }> {
        const txnId = this.nextTxnId();
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`;
        const body = {
            msgtype,
            body: filename,
            url: contentUri,
            info: info ?? {},
        };
        return this.request<{ event_id: string }>(url, {
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Fetches older messages for pagination.
     */
    public async getRoomMessages(
        roomId: string,
        fromToken: string,
        dir: "b" | "f" = "b",
        limit = 30,
    ): Promise<{ chunk: MatrixSyncResponse["rooms"]; end?: string; start: string }> {
        const params = new URLSearchParams({
            dir,
            from: fromToken,
            limit: String(limit),
        });
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?${params.toString()}`;
        return this.request(url, { method: "GET" });
    }

    /**
     * Joins a room by ID or alias.
     */
    public async joinRoom(roomIdOrAlias: string): Promise<{ room_id: string }> {
        const url = `${this.homeserver}/_matrix/client/v3/join/${encodeURIComponent(roomIdOrAlias)}`;
        return this.request<{ room_id: string }>(url, {
            method: "POST",
            body: JSON.stringify({}),
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Leaves a room by ID.
     */
    public async leaveRoom(roomId: string): Promise<void> {
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/leave`;
        await this.request(url, {
            method: "POST",
            body: JSON.stringify({}),
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Resolves a room alias (e.g. #general:matrix.org) to a room ID.
     */
    public async resolveRoomAlias(alias: string): Promise<string> {
        const url = `${this.homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`;
        const res = await this.request<{ room_id: string }>(url, { method: "GET" });
        return res.room_id;
    }

    /**
     * Retrieves joined room IDs.
     */
    public async getJoinedRooms(): Promise<string[]> {
        const url = `${this.homeserver}/_matrix/client/v3/joined_rooms`;
        const res = await this.request<{ joined_rooms: string[] }>(url, { method: "GET" });
        return res.joined_rooms;
    }

    /**
     * Helper for authorized HTTP requests.
     */
    private async request<T>(url: string, init: RequestInit, timeoutMs = 15000): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const headers = new Headers(init.headers || {});
        if (this.accessToken && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${this.accessToken}`);
        }
        if (!headers.has("Accept")) {
            headers.set("Accept", "application/json");
        }

        try {
            const res = await fetch(url, {
                ...init,
                headers,
                signal: controller.signal,
            });

            if (!res.ok) {
                let errorMsg = `HTTP ${res.status} ${res.statusText}`;
                try {
                    const errData = (await res.json()) as { error?: string; errcode?: string };
                    if (errData.error) {
                        errorMsg = `${errData.error} (${errData.errcode || res.status})`;
                    }
                } catch {
                    // Ignore JSON parse failure on error body
                }
                throw new Error(errorMsg);
            }

            // Return json if available, empty object if status 200 with no body
            const contentType = res.headers?.get ? res.headers.get("content-type") || "" : "application/json";
            if (!contentType || contentType.includes("application/json")) {
                return (await res.json()) as T;
            }
            return {} as T;
        } catch (err) {
            Logger.debug(`HTTP request error for ${url}:`, err);
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }
}
