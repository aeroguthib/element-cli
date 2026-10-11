/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { EventEmitter } from "node:events";
import { MatrixApi } from "./MatrixApi.js";
import { MatrixEvent, MatrixRoomSync, MatrixSyncResponse, RoomMember, RoomSummary, TimelineMessage } from "./types.js";
import { Logger } from "../utils/logger.js";

/**
 * Events emitted by MatrixSyncEngine.
 */
export interface SyncEngineEvents {
    "sync:start": () => void;
    "sync:success": (info: { nextBatch: string; roomCount: number }) => void;
    "sync:error": (info: { error: Error; retryInMs: number }) => void;
    "room:update": (room: RoomSummary) => void;
    "message:new": (info: { roomId: string; message: TimelineMessage }) => void;
}

/**
 * Continuous Matrix sync engine that tracks rooms, members, and real-time timeline events.
 */
export class MatrixSyncEngine extends EventEmitter {
    private api: MatrixApi;
    private userId: string;
    private rooms: Map<string, RoomSummary> = new Map();
    private nextBatchToken?: string;
    private isRunning = false;
    private shouldStop = false;
    private backoffDelayMs = 1000;
    private maxBackoffMs = 15000;

    public constructor(api: MatrixApi, initialSyncToken?: string) {
        super();
        this.api = api;
        this.userId = api.getUserId() || "";
        this.nextBatchToken = initialSyncToken;
    }

    /**
     * Returns true if the sync loop is currently running.
     */
    public getActive(): boolean {
        return this.isRunning;
    }

    /**
     * Returns all known rooms as an array.
     */
    public getRooms(): RoomSummary[] {
        return Array.from(this.rooms.values()).sort((a, b) => {
            // Sort by latest event timestamp descending
            const tsA = a.lastEventTs ?? 0;
            const tsB = b.lastEventTs ?? 0;
            if (tsA !== tsB) {
                return tsB - tsA;
            }
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Returns summary for a specific room ID.
     */
    public getRoom(roomId: string): RoomSummary | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Starts continuous background long-polling sync.
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.shouldStop = false;

        Logger.info(`Starting MatrixSyncEngine for ${this.userId}`);

        while (!this.shouldStop) {
            try {
                this.emit("sync:start");
                const response = await this.api.sync(this.nextBatchToken, 30000);

                this.nextBatchToken = response.next_batch;
                this.backoffDelayMs = 1000;

                this.processSyncResponse(response);

                this.emit("sync:success", {
                    nextBatch: response.next_batch,
                    roomCount: this.rooms.size,
                });
            } catch (err) {
                if (this.shouldStop) {
                    break;
                }
                const error = err instanceof Error ? err : new Error(String(err));
                Logger.warn("Sync loop error:", error.message);

                this.emit("sync:error", {
                    error,
                    retryInMs: this.backoffDelayMs,
                });

                await new Promise((resolve) => setTimeout(resolve, this.backoffDelayMs));
                this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.maxBackoffMs);
            }
        }

        this.isRunning = false;
        Logger.info("MatrixSyncEngine stopped");
    }

    /**
     * Gracefully terminates the sync loop.
     */
    public stop(): void {
        this.shouldStop = true;
    }

    /**
     * Returns the latest next_batch token.
     */
    public getNextBatchToken(): string | undefined {
        return this.nextBatchToken;
    }

    /**
     * Updates and extracts data from a /sync payload.
     */
    public processSyncResponse(response: MatrixSyncResponse): void {
        const joinRooms = response.rooms?.join;
        if (!joinRooms) {
            return;
        }

        for (const [roomId, roomSync] of Object.entries(joinRooms)) {
            let room = this.rooms.get(roomId);
            if (!room) {
                room = {
                    id: roomId,
                    name: roomId,
                    memberCount: 0,
                    unreadCount: 0,
                    highlightCount: 0,
                    isDirect: false,
                    timeline: [],
                    members: new Map(),
                };
                this.rooms.set(roomId, room);
            }

            this.applyRoomSync(room, roomSync);
            this.emit("room:update", room);
        }
    }

    /**
     * Applies state and timeline updates to an existing RoomSummary.
     */
    private applyRoomSync(room: RoomSummary, syncData: MatrixRoomSync): void {
        if (syncData.timeline?.prev_batch) {
            room.prevBatch = syncData.timeline.prev_batch;
        }

        // Apply state events
        if (syncData.state?.events) {
            for (const event of syncData.state.events) {
                this.applyStateEvent(room, event);
            }
        }

        // Apply unread notification counts
        if (syncData.unread_notifications) {
            if (typeof syncData.unread_notifications.notification_count === "number") {
                room.unreadCount = syncData.unread_notifications.notification_count;
            }
            if (typeof syncData.unread_notifications.highlight_count === "number") {
                room.highlightCount = syncData.unread_notifications.highlight_count;
            }
        }

        // Process timeline events
        if (syncData.timeline?.events) {
            for (const event of syncData.timeline.events) {
                if (event.state_key !== undefined) {
                    this.applyStateEvent(room, event);
                }

                if (event.origin_server_ts) {
                    room.lastEventTs = Math.max(room.lastEventTs ?? 0, event.origin_server_ts);
                }

                if (event.type === "m.room.message") {
                    const parsed = this.parseTimelineMessage(room, event);
                    if (parsed) {
                        // Prevent duplicate events
                        const exists = room.timeline.some((m) => m.id === parsed.id);
                        if (!exists) {
                            room.timeline.push(parsed);
                            // Cap timeline to 500 events
                            if (room.timeline.length > 500) {
                                room.timeline.shift();
                            }
                            this.emit("message:new", { roomId: room.id, message: parsed });
                        }
                    }
                }
            }
        }

        // Compute display name if room name hasn't been explicitly configured
        this.computeRoomDisplayName(room);
    }

    /**
     * Applies a single state event (name, alias, topic, membership).
     */
    private applyStateEvent(room: RoomSummary, event: MatrixEvent): void {
        switch (event.type) {
            case "m.room.name": {
                const name = event.content?.name;
                if (typeof name === "string" && name.trim()) {
                    room.name = name.trim();
                }
                break;
            }
            case "m.room.canonical_alias": {
                const alias = event.content?.alias;
                if (typeof alias === "string") {
                    room.canonicalAlias = alias;
                }
                break;
            }
            case "m.room.topic": {
                const topic = event.content?.topic;
                if (typeof topic === "string") {
                    room.topic = topic;
                }
                break;
            }
            case "m.room.avatar": {
                const url = event.content?.url;
                if (typeof url === "string") {
                    room.avatarUrl = url;
                }
                break;
            }
            case "m.room.member": {
                const userId = event.state_key;
                if (userId) {
                    const membership = (event.content?.membership as RoomMember["membership"]) || "join";
                    const displayName = (event.content?.displayname as string) || userId;
                    const avatarUrl = event.content?.avatar_url as string | undefined;

                    if (membership === "join") {
                        room.members.set(userId, {
                            userId,
                            displayName,
                            avatarUrl,
                            membership,
                        });
                    } else {
                        room.members.delete(userId);
                    }
                    room.memberCount = room.members.size;
                }
                break;
            }
        }
    }

    /**
     * Determines human-readable room name (especially for DMs or rooms without explicit name).
     */
    private computeRoomDisplayName(room: RoomSummary): void {
        if (room.name && room.name !== room.id) {
            return;
        }
        if (room.canonicalAlias) {
            room.name = room.canonicalAlias;
            return;
        }

        // Derive name from other members
        const otherMembers = Array.from(room.members.values()).filter((m) => m.userId !== this.userId);
        if (otherMembers.length === 1) {
            room.name = otherMembers[0].displayName || otherMembers[0].userId;
            room.isDirect = true;
            room.directUserId = otherMembers[0].userId;
        } else if (otherMembers.length > 1) {
            const names = otherMembers.slice(0, 3).map((m) => m.displayName || m.userId);
            room.name = names.join(", ") + (otherMembers.length > 3 ? ` and ${otherMembers.length - 3} others` : "");
        } else {
            room.name = room.canonicalAlias || room.id;
        }
    }

    /**
     * Parses a raw Matrix message event into a clean TimelineMessage object.
     */
    private parseTimelineMessage(room: RoomSummary, event: MatrixEvent): TimelineMessage | null {
        const content = event.content || {};
        const msgtype = content.msgtype as TimelineMessage["msgtype"];
        const body = typeof content.body === "string" ? content.body : "";

        // Resolve sender display name
        const member = room.members.get(event.sender);
        const senderName = member?.displayName || event.sender;

        const info = content.info as TimelineMessage["mediaInfo"];
        const mediaUrl = typeof content.url === "string" ? content.url : undefined;

        return {
            id: event.event_id,
            roomId: room.id,
            senderId: event.sender,
            senderName,
            timestamp: event.origin_server_ts,
            type: event.type,
            body,
            formattedBody: typeof content.formatted_body === "string" ? content.formatted_body : undefined,
            msgtype,
            mediaUrl,
            mediaInfo: info,
            isSelf: event.sender === this.userId,
        };
    }
}
