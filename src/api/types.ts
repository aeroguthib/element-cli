/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

/**
 * Authentication response from Matrix homeserver login.
 */
export interface MatrixLoginResponse {
    user_id: string;
    access_token: string;
    home_server?: string;
    device_id: string;
    well_known?: {
        "m.homeserver"?: {
            base_url: string;
        };
    };
}

/**
 * Account whoami response.
 */
export interface MatrixWhoAmIResponse {
    user_id: string;
    device_id?: string;
    is_guest?: boolean;
}

/**
 * Matrix client versions response.
 */
export interface MatrixVersionsResponse {
    versions: string[];
    unstable_features?: Record<string, boolean>;
}

/**
 * Matrix .well-known client discovery response.
 */
export interface MatrixWellKnownResponse {
    "m.homeserver": {
        base_url: string;
    };
    "m.identity_server"?: {
        base_url: string;
    };
}

/**
 * Media upload response from content repository.
 */
export interface MatrixUploadResponse {
    content_uri: string;
    unused?: number;
}

/**
 * Generic Matrix event in sync timeline.
 */
export interface MatrixEvent {
    type: string;
    event_id: string;
    sender: string;
    origin_server_ts: number;
    // Matrix spec allows arbitrary content in JSON events
    content: Record<string, unknown>;
    state_key?: string;
    unsigned?: {
        age?: number;
        transaction_id?: string;
        prev_content?: Record<string, unknown>;
        redacted_because?: Record<string, unknown>;
    };
}

/**
 * Room sync representation.
 */
export interface MatrixRoomSync {
    state?: {
        events: MatrixEvent[];
    };
    timeline?: {
        events: MatrixEvent[];
        limited?: boolean;
        prev_batch?: string;
    };
    ephemeral?: {
        events: MatrixEvent[];
    };
    account_data?: {
        events: MatrixEvent[];
    };
    unread_notifications?: {
        highlight_count?: number;
        notification_count?: number;
    };
    summary?: {
        "m.heroes"?: string[];
        "m.joined_member_count"?: number;
        "m.invited_member_count"?: number;
    };
}

/**
 * Full /sync response from homeserver.
 */
export interface MatrixSyncResponse {
    next_batch: string;
    rooms?: {
        join?: Record<string, MatrixRoomSync>;
        invite?: Record<string, MatrixRoomSync>;
        leave?: Record<string, MatrixRoomSync>;
    };
    presence?: {
        events: MatrixEvent[];
    };
    account_data?: {
        events: MatrixEvent[];
    };
    to_device?: {
        events: MatrixEvent[];
    };
}

/**
 * Normalized room member representation.
 */
export interface RoomMember {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    membership: "join" | "invite" | "leave" | "ban";
}

/**
 * Formatted message item for chat display and history.
 */
export interface TimelineMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    type: string;
    body: string;
    formattedBody?: string;
    msgtype?: "m.text" | "m.emote" | "m.notice" | "m.image" | "m.video" | "m.audio" | "m.file";
    mediaUrl?: string;
    mediaInfo?: {
        mimetype?: string;
        size?: number;
        w?: number;
        h?: number;
        duration?: number;
    };
    isSelf: boolean;
}

/**
 * Internal state summary of a Matrix room.
 */
export interface RoomSummary {
    id: string;
    name: string;
    canonicalAlias?: string;
    topic?: string;
    avatarUrl?: string;
    memberCount: number;
    unreadCount: number;
    highlightCount: number;
    isDirect: boolean;
    directUserId?: string;
    lastEventTs?: number;
    timeline: TimelineMessage[];
    members: Map<string, RoomMember>;
    prevBatch?: string;
}
