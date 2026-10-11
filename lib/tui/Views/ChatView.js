/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { Theme } from "../Theme.js";
import { Ansi, formatFileSize, formatTime, getUserColor, stripAnsi, truncate, wrapText } from "../../utils/format.js";
/**
 * Main chat screen featuring room list sidebar, timeline view, input bar, and status indicators.
 */
export class ChatView {
    focus = "input";
    activeRoomId = null;
    selectedRoomIndex = 0;
    scrollOffset = 0; // 0 = at bottom (auto-scroll)
    inputText = "";
    inputCursorPos = 0;
    inputHistory = [];
    historyIndex = -1;
    syncStatus = "online";
    statusToast = null;
    toastTimer = null;
    userId;
    homeserver;
    callbacks;
    constructor(userId, homeserver, callbacks) {
        this.userId = userId;
        this.homeserver = homeserver;
        this.callbacks = callbacks;
    }
    setSyncStatus(status) {
        this.syncStatus = status;
    }
    showToast(message, durationMs = 4000) {
        this.statusToast = message;
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }
        this.toastTimer = setTimeout(() => {
            this.statusToast = null;
        }, durationMs);
    }
    handleKey(key, rooms) {
        // Toggle Help
        if (key.name === "f1" || (key.name === "?" && this.focus === "rooms")) {
            this.callbacks.onToggleHelp();
            return;
        }
        // Switch focus with Tab
        if (key.name === "tab") {
            this.focus = this.focus === "rooms" ? "input" : "rooms";
            return;
        }
        // Timeline scrolling with PageUp / PageDown
        if (key.name === "pageup") {
            this.scrollOffset += 10;
            return;
        }
        if (key.name === "pagedown") {
            this.scrollOffset = Math.max(0, this.scrollOffset - 10);
            return;
        }
        if (this.focus === "rooms") {
            this.handleRoomsKey(key, rooms);
        }
        else {
            this.handleInputKey(key, rooms);
        }
    }
    handleRoomsKey(key, rooms) {
        if (rooms.length === 0) {
            return;
        }
        if (key.name === "up") {
            this.selectedRoomIndex = Math.max(0, this.selectedRoomIndex - 1);
            this.activeRoomId = rooms[this.selectedRoomIndex].id;
            this.scrollOffset = 0;
            return;
        }
        if (key.name === "down") {
            this.selectedRoomIndex = Math.min(rooms.length - 1, this.selectedRoomIndex + 1);
            this.activeRoomId = rooms[this.selectedRoomIndex].id;
            this.scrollOffset = 0;
            return;
        }
        if (key.name === "enter") {
            this.activeRoomId = rooms[this.selectedRoomIndex].id;
            this.focus = "input";
            this.scrollOffset = 0;
            return;
        }
    }
    handleInputKey(key, rooms) {
        if (key.name === "enter") {
            this.submitInput(rooms);
            return;
        }
        // Command history navigation
        if (key.name === "up") {
            if (this.inputHistory.length > 0) {
                if (this.historyIndex === -1) {
                    this.historyIndex = this.inputHistory.length - 1;
                }
                else if (this.historyIndex > 0) {
                    this.historyIndex -= 1;
                }
                this.inputText = this.inputHistory[this.historyIndex];
                this.inputCursorPos = this.inputText.length;
            }
            return;
        }
        if (key.name === "down") {
            if (this.historyIndex !== -1) {
                if (this.historyIndex < this.inputHistory.length - 1) {
                    this.historyIndex += 1;
                    this.inputText = this.inputHistory[this.historyIndex];
                }
                else {
                    this.historyIndex = -1;
                    this.inputText = "";
                }
                this.inputCursorPos = this.inputText.length;
            }
            return;
        }
        // Cursor movement
        if (key.name === "left") {
            this.inputCursorPos = Math.max(0, this.inputCursorPos - 1);
            return;
        }
        if (key.name === "right") {
            this.inputCursorPos = Math.min(this.inputText.length, this.inputCursorPos + 1);
            return;
        }
        if (key.name === "home") {
            this.inputCursorPos = 0;
            return;
        }
        if (key.name === "end") {
            this.inputCursorPos = this.inputText.length;
            return;
        }
        // Deletion
        if (key.name === "backspace") {
            if (this.inputCursorPos > 0) {
                this.inputText =
                    this.inputText.slice(0, this.inputCursorPos - 1) + this.inputText.slice(this.inputCursorPos);
                this.inputCursorPos -= 1;
            }
            return;
        }
        if (key.name === "delete") {
            if (this.inputCursorPos < this.inputText.length) {
                this.inputText =
                    this.inputText.slice(0, this.inputCursorPos) + this.inputText.slice(this.inputCursorPos + 1);
            }
            return;
        }
        // Normal text typing
        if (key.name.length === 1 && !key.ctrl && !key.meta) {
            this.inputText =
                this.inputText.slice(0, this.inputCursorPos) + key.name + this.inputText.slice(this.inputCursorPos);
            this.inputCursorPos += 1;
        }
    }
    submitInput(rooms) {
        const text = this.inputText.trim();
        if (!text) {
            return;
        }
        // Save to command history
        this.inputHistory.push(this.inputText);
        if (this.inputHistory.length > 100) {
            this.inputHistory.shift();
        }
        this.historyIndex = -1;
        this.inputText = "";
        this.inputCursorPos = 0;
        // Ensure an active room is selected
        if (!this.activeRoomId && rooms.length > 0) {
            this.activeRoomId = rooms[0].id;
        }
        const activeRoom = this.activeRoomId;
        // Process slash commands
        if (text.startsWith("/")) {
            const parts = text.slice(1).split(" ");
            const command = parts[0].toLowerCase();
            const args = parts.slice(1).join(" ").trim();
            switch (command) {
                case "help":
                    this.callbacks.onToggleHelp();
                    break;
                case "quit":
                case "exit":
                    this.callbacks.onQuit();
                    break;
                case "logout":
                    this.callbacks.onLogout();
                    break;
                case "whoami":
                    this.showToast(`Logged in as ${this.userId} on ${this.homeserver}`);
                    break;
                case "clear":
                    this.scrollOffset = 0;
                    this.showToast("Timeline display reset");
                    break;
                case "me":
                    if (!activeRoom) {
                        this.showToast("Select a room first!", 3000);
                        return;
                    }
                    this.callbacks.onSendEmote(activeRoom, args).catch((err) => {
                        this.showToast(`Failed to send emote: ${err.message}`, 4000);
                    });
                    break;
                case "file":
                case "upload":
                case "image":
                    if (!activeRoom) {
                        this.showToast("Select a room first!", 3000);
                        return;
                    }
                    if (!args) {
                        this.showToast("Usage: /file <path/to/file>", 3000);
                        return;
                    }
                    this.showToast(`Uploading ${args}...`, 10000);
                    this.callbacks
                        .onSendFile(activeRoom, args)
                        .then(() => {
                        this.showToast(`Sent file: ${args}`, 4000);
                    })
                        .catch((err) => {
                        this.showToast(`Failed to send file: ${err.message}`, 5000);
                    });
                    break;
                case "join":
                    if (!args) {
                        this.showToast("Usage: /join <#room-alias:server>", 3000);
                        return;
                    }
                    this.showToast(`Joining ${args}...`, 5000);
                    this.callbacks
                        .onJoinRoom(args)
                        .then(() => {
                        this.showToast(`Joined ${args}`, 4000);
                    })
                        .catch((err) => {
                        this.showToast(`Failed to join: ${err.message}`, 5000);
                    });
                    break;
                case "leave":
                    if (!activeRoom) {
                        this.showToast("Select a room first!", 3000);
                        return;
                    }
                    this.showToast(`Leaving room...`, 3000);
                    this.callbacks
                        .onLeaveRoom(activeRoom)
                        .then(() => {
                        this.activeRoomId = null;
                        this.showToast("Left room", 3000);
                    })
                        .catch((err) => {
                        this.showToast(`Failed to leave: ${err.message}`, 4000);
                    });
                    break;
                default:
                    this.showToast(`Unknown command: /${command} (type /help for commands)`, 4000);
                    break;
            }
            return;
        }
        // Normal text message
        if (!activeRoom) {
            this.showToast("No room selected. Select a room to start chatting!", 3000);
            return;
        }
        this.scrollOffset = 0; // reset scroll to bottom when sending
        this.callbacks.onSendMessage(activeRoom, text).catch((err) => {
            this.showToast(`Failed to send message: ${err.message}`, 4000);
        });
    }
    /**
     * Renders the complete TUI layout for the chat screen.
     */
    render(width, height, rooms) {
        const lines = [];
        const b = Theme.box;
        // Auto-select first room if none selected
        if (!this.activeRoomId && rooms.length > 0) {
            this.activeRoomId = rooms[0].id;
            this.selectedRoomIndex = 0;
        }
        const activeRoom = rooms.find((r) => r.id === this.activeRoomId);
        // Calculate pane dimensions
        const sidebarWidth = Math.max(24, Math.min(32, Math.floor(width * 0.28)));
        const chatWidth = width - sidebarWidth - 1; // 1 for vertical separator
        const headerHeight = 1;
        const inputHeight = 3;
        const footerHeight = 1;
        const bodyHeight = Math.max(5, height - headerHeight - inputHeight - footerHeight);
        // 1. Render Header Bar
        lines.push(this.renderHeader(width));
        // 2. Render Sidebar + Timeline Body
        const sidebarLines = this.renderSidebar(rooms, sidebarWidth, bodyHeight);
        const chatLines = this.renderTimeline(activeRoom, chatWidth, bodyHeight);
        for (let i = 0; i < bodyHeight; i++) {
            const side = sidebarLines[i] || " ".repeat(sidebarWidth);
            const sep = `${Theme.border}${b.vertical}${Ansi.reset}`;
            const main = chatLines[i] || "";
            lines.push(side + sep + main);
        }
        // 3. Render Input Area
        const inputLines = this.renderInput(activeRoom, width, inputHeight);
        for (const il of inputLines) {
            lines.push(il);
        }
        // 4. Render Footer Status Bar
        lines.push(this.renderFooter(width));
        return lines;
    }
    renderHeader(width) {
        const logo = `${Theme.brandGreen}${Ansi.bold}[E] Element CLI${Ansi.reset}`;
        const user = `${Theme.textMuted}user:${Ansi.reset} ${Ansi.cyan}${truncate(this.userId, 28)}${Ansi.reset}`;
        const serverHost = this.homeserver.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
        const server = `${Theme.textMuted}server:${Ansi.reset} ${Ansi.white}${truncate(serverHost, 22)}${Ansi.reset}`;
        let statusBadge = `${Theme.statusOnline} Online`;
        if (this.syncStatus === "syncing") {
            statusBadge = `${Theme.statusSyncing} Syncing`;
        }
        else if (this.syncStatus === "reconnecting") {
            statusBadge = `${Theme.statusReconnecting} Reconnecting`;
        }
        else if (this.syncStatus === "offline") {
            statusBadge = `${Theme.statusOffline} Offline`;
        }
        const left = ` ${logo}  ${Theme.border}│${Ansi.reset}  ${user}  ${Theme.border}│${Ansi.reset}  ${server}`;
        const right = `${statusBadge} `;
        const visibleLeft = stripAnsi(left).length;
        const visibleRight = stripAnsi(right).length;
        const pad = Math.max(0, width - visibleLeft - visibleRight);
        return `${Ansi.bgBlack}${left}${" ".repeat(pad)}${right}${Ansi.reset}`;
    }
    renderSidebar(rooms, width, height) {
        const lines = [];
        const isFocused = this.focus === "rooms";
        const titleColor = isFocused ? Theme.brandGreen : Theme.textNormal;
        // Title row
        const title = ` ${titleColor}${Ansi.bold}ROOMS (${rooms.length})${Ansi.reset}`;
        lines.push(title.padEnd(width + (title.length - stripAnsi(title).length), " "));
        const availableRows = height - 1;
        const scrollStart = Math.max(0, Math.min(this.selectedRoomIndex - Math.floor(availableRows / 2), rooms.length - availableRows));
        for (let i = 0; i < availableRows; i++) {
            const roomIdx = scrollStart + i;
            if (roomIdx < rooms.length) {
                const room = rooms[roomIdx];
                const isSelected = room.id === this.activeRoomId;
                let prefix = "  ";
                if (isSelected) {
                    prefix = isFocused ? "► " : "> ";
                }
                let badge = "";
                if (room.unreadCount > 0) {
                    badge = ` ${Ansi.bgGreen}${Ansi.black}${Ansi.bold} ${room.unreadCount} ${Ansi.reset}`;
                }
                const maxNameWidth = width - stripAnsi(prefix).length - stripAnsi(badge).length - 1;
                const displayName = truncate(room.name, Math.max(6, maxNameWidth));
                let lineContent = "";
                if (isSelected) {
                    const rowText = `${prefix}${displayName}`;
                    const padCount = Math.max(0, width - stripAnsi(rowText).length - stripAnsi(badge).length);
                    lineContent = `${Theme.selectedBg}${Theme.selectedFg}${rowText}${" ".repeat(padCount)}${badge}${Ansi.reset}`;
                }
                else {
                    const rowText = `${Theme.textMuted}${prefix}${Ansi.reset}${displayName}`;
                    const padCount = Math.max(0, width - stripAnsi(rowText).length - stripAnsi(badge).length);
                    lineContent = `${rowText}${" ".repeat(padCount)}${badge}`;
                }
                lines.push(lineContent);
            }
            else {
                lines.push(" ".repeat(width));
            }
        }
        return lines;
    }
    renderTimeline(room, width, height) {
        const lines = [];
        const b = Theme.box;
        if (!room) {
            lines.push(` ${Theme.textMuted}No room selected. Join or select a room from the sidebar.${Ansi.reset}`);
            for (let i = 1; i < height; i++) {
                lines.push("");
            }
            return lines;
        }
        // Room Header row
        const roomName = `${Ansi.bold}${Theme.brandGreen}${truncate(room.name, Math.floor(width * 0.45))}${Ansi.reset}`;
        const memberInfo = room.memberCount > 0 ? `${Theme.textMuted}(${room.memberCount} members)${Ansi.reset} ` : "";
        const topic = room.topic
            ? `${Theme.textDim}— ${truncate(room.topic, Math.floor(width * 0.35))}${Ansi.reset}`
            : "";
        lines.push(` ${roomName} ${memberInfo}${topic}`);
        // Horizontal separator under room header
        lines.push(`${Theme.border}${b.horizontal.repeat(width)}${Ansi.reset}`);
        const messageAreaHeight = height - 2;
        const formattedRows = [];
        // Format timeline messages
        for (const msg of room.timeline) {
            const time = `${Theme.textMuted}[${formatTime(msg.timestamp)}]${Ansi.reset}`;
            const userCol = getUserColor(msg.senderId);
            const sender = `${userCol}<${truncate(msg.senderName, 18)}>${Ansi.reset}`;
            if (msg.msgtype === "m.emote") {
                const emoteText = `${time} ${Theme.accent}* ${msg.senderName} ${msg.body}${Ansi.reset}`;
                formattedRows.push(...wrapText(emoteText, width - 2));
            }
            else if (msg.msgtype === "m.image" ||
                msg.msgtype === "m.video" ||
                msg.msgtype === "m.audio" ||
                msg.msgtype === "m.file") {
                let icon = "📎 [FILE]";
                if (msg.msgtype === "m.image") {
                    icon = "📷 [IMAGE]";
                }
                else if (msg.msgtype === "m.video") {
                    icon = "🎥 [VIDEO]";
                }
                else if (msg.msgtype === "m.audio") {
                    icon = "🎵 [AUDIO]";
                }
                const sizeStr = msg.mediaInfo?.size ? ` (${formatFileSize(msg.mediaInfo.size)})` : "";
                const headerLine = `${time} ${sender} ${Theme.accent}${icon} ${Ansi.bold}${msg.body}${sizeStr}${Ansi.reset}`;
                formattedRows.push(...wrapText(headerLine, width - 2));
                if (msg.mediaUrl) {
                    const urlLine = `    ${Theme.textDim}URL: ${msg.mediaUrl}${Ansi.reset}`;
                    formattedRows.push(urlLine);
                }
            }
            else {
                // Standard text message
                const prefix = `${time} ${sender} `;
                const prefixLen = stripAnsi(prefix).length;
                const wrapped = wrapText(msg.body, width - prefixLen - 3);
                if (wrapped.length === 0) {
                    formattedRows.push(prefix);
                }
                else {
                    formattedRows.push(`${prefix}${wrapped[0]}`);
                    const indent = " ".repeat(prefixLen);
                    for (let j = 1; j < wrapped.length; j++) {
                        formattedRows.push(`${indent}${wrapped[j]}`);
                    }
                }
            }
        }
        // Apply scroll offset
        const totalRows = formattedRows.length;
        let startIdx = Math.max(0, totalRows - messageAreaHeight - this.scrollOffset);
        if (this.scrollOffset > 0 && totalRows <= messageAreaHeight) {
            startIdx = 0;
            this.scrollOffset = 0;
        }
        const visibleRows = formattedRows.slice(startIdx, startIdx + messageAreaHeight);
        for (const row of visibleRows) {
            lines.push(` ${row}`);
        }
        // Pad remaining empty lines
        while (lines.length < height) {
            lines.push("");
        }
        return lines;
    }
    renderInput(room, width, height) {
        const lines = [];
        const b = Theme.box;
        const isFocused = this.focus === "input";
        const borderColor = isFocused ? Theme.brandGreen : Theme.border;
        // Separator line with focus indicator
        const focusHint = isFocused
            ? `${Theme.brandGreen} INPUT (Active) ${Theme.border}`
            : `${Theme.textMuted} [Tab] to focus input ${Theme.border}`;
        const sepLine = `${borderColor}${b.horizontal.repeat(2)}${focusHint}${b.horizontal.repeat(Math.max(0, width - 4 - stripAnsi(focusHint).length))}${Ansi.reset}`;
        lines.push(sepLine);
        // Input prompt & text
        const roomPrompt = room ? `[${truncate(room.name, 16)}] > ` : `[chat] > `;
        const cursor = isFocused ? `${Ansi.inverse} ${Ansi.reset}` : " ";
        const beforeCursor = this.inputText.slice(0, this.inputCursorPos);
        const atCursor = this.inputText.slice(this.inputCursorPos, this.inputCursorPos + 1) || " ";
        const afterCursor = this.inputText.slice(this.inputCursorPos + 1);
        const promptFormatted = `${Theme.brandGreen}${Ansi.bold}${roomPrompt}${Ansi.reset}`;
        const inputDisplay = isFocused
            ? `${beforeCursor}${Ansi.inverse}${atCursor}${Ansi.reset}${afterCursor}`
            : this.inputText;
        lines.push(` ${promptFormatted}${inputDisplay}`);
        // Empty row padding if needed
        for (let i = 2; i < height; i++) {
            lines.push("");
        }
        return lines;
    }
    renderFooter(width) {
        if (this.statusToast) {
            const toast = ` ℹ  ${this.statusToast} `;
            const pad = Math.max(0, width - stripAnsi(toast).length);
            return `${Ansi.bgCyan}${Ansi.black}${Ansi.bold}${toast}${" ".repeat(pad)}${Ansi.reset}`;
        }
        const shortcuts = [
            `${Ansi.cyan}[Tab]${Ansi.reset} Focus`,
            `${Ansi.cyan}[↑/↓]${Ansi.reset} Rooms/History`,
            `${Ansi.cyan}[PgUp/PgDn]${Ansi.reset} Scroll`,
            `${Ansi.cyan}[/file]${Ansi.reset} Upload`,
            `${Ansi.cyan}[/help]${Ansi.reset} Help`,
            `${Ansi.cyan}[Ctrl+C]${Ansi.reset} Quit`,
        ].join("  ");
        const visibleLen = stripAnsi(shortcuts).length;
        const pad = Math.max(0, width - visibleLen - 2);
        return ` ${shortcuts}${" ".repeat(pad)}`;
    }
}
