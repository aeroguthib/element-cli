import { EventEmitter } from "node:events";
import { MatrixApi } from "./MatrixApi.js";
import { MatrixSyncResponse, RoomSummary, TimelineMessage } from "./types.js";
/**
 * Events emitted by MatrixSyncEngine.
 */
export interface SyncEngineEvents {
    "sync:start": () => void;
    "sync:success": (info: {
        nextBatch: string;
        roomCount: number;
    }) => void;
    "sync:error": (info: {
        error: Error;
        retryInMs: number;
    }) => void;
    "room:update": (room: RoomSummary) => void;
    "message:new": (info: {
        roomId: string;
        message: TimelineMessage;
    }) => void;
}
/**
 * Continuous Matrix sync engine that tracks rooms, members, and real-time timeline events.
 */
export declare class MatrixSyncEngine extends EventEmitter {
    private api;
    private userId;
    private rooms;
    private nextBatchToken?;
    private isRunning;
    private shouldStop;
    private backoffDelayMs;
    private maxBackoffMs;
    constructor(api: MatrixApi, initialSyncToken?: string);
    /**
     * Returns true if the sync loop is currently running.
     */
    getActive(): boolean;
    /**
     * Returns all known rooms as an array.
     */
    getRooms(): RoomSummary[];
    /**
     * Returns summary for a specific room ID.
     */
    getRoom(roomId: string): RoomSummary | undefined;
    /**
     * Starts continuous background long-polling sync.
     */
    start(): Promise<void>;
    /**
     * Gracefully terminates the sync loop.
     */
    stop(): void;
    /**
     * Returns the latest next_batch token.
     */
    getNextBatchToken(): string | undefined;
    /**
     * Updates and extracts data from a /sync payload.
     */
    processSyncResponse(response: MatrixSyncResponse): void;
    /**
     * Applies state and timeline updates to an existing RoomSummary.
     */
    private applyRoomSync;
    /**
     * Applies a single state event (name, alias, topic, membership).
     */
    private applyStateEvent;
    /**
     * Determines human-readable room name (especially for DMs or rooms without explicit name).
     */
    private computeRoomDisplayName;
    /**
     * Parses a raw Matrix message event into a clean TimelineMessage object.
     */
    private parseTimelineMessage;
}
