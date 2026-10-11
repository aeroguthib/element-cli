/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it, expect, vi } from "vitest";
import { MatrixApi } from "../src/api/MatrixApi.js";
import { MatrixSyncEngine } from "../src/api/MatrixSyncEngine.js";
import { MatrixSyncResponse } from "../src/api/types.js";

describe("MatrixSyncEngine", () => {
    it("processes sync responses and updates room metadata and timeline", () => {
        const mockApi = new MatrixApi({
            homeserver: "https://matrix.org",
            userId: "@alice:matrix.org",
            accessToken: "token_abc",
        });

        const engine = new MatrixSyncEngine(mockApi);

        const newMessages: unknown[] = [];
        engine.on("message:new", (data) => {
            newMessages.push(data);
        });

        const syncPayload: MatrixSyncResponse = {
            next_batch: "s_token_batch_1",
            rooms: {
                join: {
                    "!room1:matrix.org": {
                        state: {
                            events: [
                                {
                                    event_id: "$e1",
                                    type: "m.room.name",
                                    sender: "@bob:matrix.org",
                                    origin_server_ts: 1000,
                                    content: { name: "Project Discussion" },
                                },
                                {
                                    event_id: "$e2",
                                    type: "m.room.topic",
                                    sender: "@bob:matrix.org",
                                    origin_server_ts: 1001,
                                    content: { topic: "All about the new CLI" },
                                },
                                {
                                    event_id: "$e3",
                                    type: "m.room.member",
                                    state_key: "@bob:matrix.org",
                                    sender: "@bob:matrix.org",
                                    origin_server_ts: 1002,
                                    content: { membership: "join", displayname: "Bob Builder" },
                                },
                            ],
                        },
                        timeline: {
                            events: [
                                {
                                    event_id: "$msg1",
                                    type: "m.room.message",
                                    sender: "@bob:matrix.org",
                                    origin_server_ts: 2000,
                                    content: { msgtype: "m.text", body: "Welcome everyone!" },
                                },
                            ],
                            prev_batch: "p1",
                        },
                        unread_notifications: {
                            notification_count: 3,
                        },
                    },
                },
            },
        };

        engine.processSyncResponse(syncPayload);

        const rooms = engine.getRooms();
        expect(rooms.length).toBe(1);

        const room = rooms[0];
        expect(room.id).toBe("!room1:matrix.org");
        expect(room.name).toBe("Project Discussion");
        expect(room.topic).toBe("All about the new CLI");
        expect(room.unreadCount).toBe(3);
        expect(room.timeline.length).toBe(1);
        expect(room.timeline[0].body).toBe("Welcome everyone!");
        expect(room.timeline[0].senderName).toBe("Bob Builder");

        expect(newMessages.length).toBe(1);
    });

    it("calculates DM room name based on other joined member", () => {
        const mockApi = new MatrixApi({
            homeserver: "https://matrix.org",
            userId: "@alice:matrix.org",
            accessToken: "token_abc",
        });

        const engine = new MatrixSyncEngine(mockApi);

        const syncPayload: MatrixSyncResponse = {
            next_batch: "s_token_batch_2",
            rooms: {
                join: {
                    "!dm_room:matrix.org": {
                        state: {
                            events: [
                                {
                                    event_id: "$m_alice",
                                    type: "m.room.member",
                                    state_key: "@alice:matrix.org",
                                    sender: "@alice:matrix.org",
                                    origin_server_ts: 100,
                                    content: { membership: "join", displayname: "Alice" },
                                },
                                {
                                    event_id: "$m_bob",
                                    type: "m.room.member",
                                    state_key: "@charlie:matrix.org",
                                    sender: "@charlie:matrix.org",
                                    origin_server_ts: 101,
                                    content: { membership: "join", displayname: "Charlie Brown" },
                                },
                            ],
                        },
                        timeline: {
                            events: [],
                        },
                    },
                },
            },
        };

        engine.processSyncResponse(syncPayload);
        const room = engine.getRoom("!dm_room:matrix.org");
        expect(room?.name).toBe("Charlie Brown");
    });
});
