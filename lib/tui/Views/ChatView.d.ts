import { RoomSummary } from "../../api/types.js";
import { KeyEvent } from "../Terminal.js";
export type ChatFocus = "rooms" | "input";
export interface ChatViewCallbacks {
    onSendMessage: (roomId: string, text: string) => Promise<void>;
    onSendEmote: (roomId: string, text: string) => Promise<void>;
    onSendFile: (roomId: string, filePath: string) => Promise<void>;
    onJoinRoom: (roomIdOrAlias: string) => Promise<void>;
    onLeaveRoom: (roomId: string) => Promise<void>;
    onLogout: () => void;
    onQuit: () => void;
    onToggleHelp: () => void;
}
/**
 * Main chat screen featuring room list sidebar, timeline view, input bar, and status indicators.
 */
export declare class ChatView {
    focus: ChatFocus;
    activeRoomId: string | null;
    selectedRoomIndex: number;
    scrollOffset: number;
    inputText: string;
    inputCursorPos: number;
    inputHistory: string[];
    historyIndex: number;
    syncStatus: "online" | "syncing" | "reconnecting" | "offline";
    statusToast: string | null;
    private toastTimer;
    private userId;
    private homeserver;
    private callbacks;
    constructor(userId: string, homeserver: string, callbacks: ChatViewCallbacks);
    setSyncStatus(status: "online" | "syncing" | "reconnecting" | "offline"): void;
    showToast(message: string, durationMs?: number): void;
    handleKey(key: KeyEvent, rooms: RoomSummary[]): void;
    private handleRoomsKey;
    private handleInputKey;
    private submitInput;
    /**
     * Renders the complete TUI layout for the chat screen.
     */
    render(width: number, height: number, rooms: RoomSummary[]): string[];
    private renderHeader;
    private renderSidebar;
    private renderTimeline;
    private renderInput;
    private renderFooter;
}
