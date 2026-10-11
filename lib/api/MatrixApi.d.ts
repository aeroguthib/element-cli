import { MatrixLoginResponse, MatrixWhoAmIResponse, MatrixSyncResponse, MatrixUploadResponse } from "./types.js";
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
export declare class MatrixApi {
    private homeserver;
    private accessToken;
    private userId;
    private deviceId;
    private txnCounter;
    constructor(config: MatrixApiConfig);
    getHomeserver(): string;
    getUserId(): string | null;
    getAccessToken(): string | null;
    getDeviceId(): string | null;
    setCredentials(accessToken: string, userId: string, deviceId?: string): void;
    /**
     * Generates a unique transaction ID for idempotent message sending.
     */
    nextTxnId(): string;
    /**
     * Logs in with a username and password.
     */
    loginWithPassword(username: string, password: string, deviceName?: string): Promise<MatrixLoginResponse>;
    /**
     * Validates and attaches a pre-existing access token.
     */
    loginWithToken(token: string): Promise<MatrixWhoAmIResponse>;
    /**
     * Queries /account/whoami.
     */
    whoami(): Promise<MatrixWhoAmIResponse>;
    /**
     * Logs out the active session.
     */
    logout(): Promise<void>;
    /**
     * Long-polling Matrix sync request.
     */
    sync(since?: string, timeoutMs?: number, filter?: unknown): Promise<MatrixSyncResponse>;
    /**
     * Sends a plain text message to a room.
     */
    sendTextMessage(roomId: string, text: string): Promise<{
        event_id: string;
    }>;
    /**
     * Sends an emote (/me) message to a room.
     */
    sendEmoteMessage(roomId: string, text: string): Promise<{
        event_id: string;
    }>;
    /**
     * Uploads media to Matrix Content Repository (mxc).
     */
    uploadMedia(data: Uint8Array, filename: string, contentType: string): Promise<MatrixUploadResponse>;
    /**
     * Sends a media message (image, video, audio, or generic file) to a room.
     */
    sendMediaMessage(roomId: string, contentUri: string, filename: string, msgtype: "m.image" | "m.video" | "m.audio" | "m.file", info?: {
        mimetype?: string;
        size?: number;
        w?: number;
        h?: number;
        duration?: number;
    }): Promise<{
        event_id: string;
    }>;
    /**
     * Fetches older messages for pagination.
     */
    getRoomMessages(roomId: string, fromToken: string, dir?: "b" | "f", limit?: number): Promise<{
        chunk: MatrixSyncResponse["rooms"];
        end?: string;
        start: string;
    }>;
    /**
     * Joins a room by ID or alias.
     */
    joinRoom(roomIdOrAlias: string): Promise<{
        room_id: string;
    }>;
    /**
     * Leaves a room by ID.
     */
    leaveRoom(roomId: string): Promise<void>;
    /**
     * Resolves a room alias (e.g. #general:matrix.org) to a room ID.
     */
    resolveRoomAlias(alias: string): Promise<string>;
    /**
     * Retrieves joined room IDs.
     */
    getJoinedRooms(): Promise<string[]>;
    /**
     * Helper for authorized HTTP requests.
     */
    private request;
}
