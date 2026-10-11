/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { MatrixApi } from "../api/MatrixApi.js";
import { MatrixSyncEngine } from "../api/MatrixSyncEngine.js";
import { Discovery } from "../auth/Discovery.js";
import { SessionManager, StoredSession } from "../auth/SessionManager.js";
import { MediaUploader } from "../media/MediaUploader.js";
import { Logger } from "../utils/logger.js";
import { Terminal, KeyEvent } from "./Terminal.js";
import { ChatView } from "./Views/ChatView.js";
import { HelpModal } from "./Views/HelpModal.js";
import { LoginSubmitData, LoginView } from "./Views/LoginView.js";

/**
 * Root orchestrator for the Element CLI Terminal User Interface.
 */
export class TuiApp {
    private terminal: Terminal;
    private api: MatrixApi | null = null;
    private syncEngine: MatrixSyncEngine | null = null;
    private mediaUploader: MediaUploader | null = null;

    private currentScreen: "login" | "chat" = "login";
    private showHelp = false;

    private loginView: LoginView;
    private chatView: ChatView | null = null;

    public constructor() {
        this.terminal = new Terminal();
        this.loginView = new LoginView();
        this.setupLoginHandler();
    }

    /**
     * Initializes the TUI and launches either the chat view or login view.
     */
    public async start(): Promise<void> {
        this.terminal.start();

        this.terminal.on("key", (key: KeyEvent) => this.handleKey(key));
        this.terminal.on("resize", () => this.render());
        this.terminal.on("repaint", () => this.render());

        // Check if an existing session is stored
        const stored = SessionManager.loadSession();
        if (stored) {
            this.loginView.setStatus("Checking saved session...", "info");
            this.render();

            try {
                const isValid = await SessionManager.verifySession(stored);
                if (isValid) {
                    await this.initSession(stored);
                    return;
                } else {
                    this.loginView.setStatus("Saved session expired. Please log in again.", "error");
                }
            } catch (err) {
                this.loginView.setStatus(`Session check failed: ${(err as Error).message}. Please log in.`, "error");
            }
        }

        this.currentScreen = "login";
        this.render();
    }

    private setupLoginHandler(): void {
        this.loginView.setOnSubmit(async (data: LoginSubmitData) => {
            try {
                const resolvedHomeserver = await Discovery.resolveHomeserver(data.homeserver);
                const api = new MatrixApi({ homeserver: resolvedHomeserver });

                let session: StoredSession;

                if (data.token) {
                    const whoami = await api.loginWithToken(data.token);
                    session = {
                        homeserver: resolvedHomeserver,
                        userId: whoami.user_id,
                        deviceId: whoami.device_id || "ELEMENT_CLI",
                        accessToken: data.token,
                        savedAt: Date.now(),
                    };
                } else if (data.username && data.password) {
                    const res = await api.loginWithPassword(data.username, data.password);
                    session = {
                        homeserver: resolvedHomeserver,
                        userId: res.user_id,
                        deviceId: res.device_id,
                        accessToken: res.access_token,
                        savedAt: Date.now(),
                    };
                } else {
                    throw new Error("Missing credentials");
                }

                SessionManager.saveSession(session);
                await this.initSession(session);
            } catch (err) {
                const msg = (err as Error).message || "Login failed";
                this.loginView.setStatus(msg, "error");
                this.loginView.isSubmitting = false;
                this.render();
            }
        });
    }

    private async initSession(session: StoredSession): Promise<void> {
        this.api = new MatrixApi({
            homeserver: session.homeserver,
            accessToken: session.accessToken,
            userId: session.userId,
            deviceId: session.deviceId,
        });

        this.mediaUploader = new MediaUploader(this.api);
        this.syncEngine = new MatrixSyncEngine(this.api, session.lastSyncToken);

        this.chatView = new ChatView(session.userId, session.homeserver, {
            onSendMessage: async (roomId: string, text: string) => {
                await this.api?.sendTextMessage(roomId, text);
            },
            onSendEmote: async (roomId: string, text: string) => {
                await this.api?.sendEmoteMessage(roomId, text);
            },
            onSendFile: async (roomId: string, filePath: string) => {
                if (!this.mediaUploader) {
                    throw new Error("Media uploader not initialized");
                }
                await this.mediaUploader.uploadAndSend(roomId, filePath);
            },
            onJoinRoom: async (roomIdOrAlias: string) => {
                await this.api?.joinRoom(roomIdOrAlias);
            },
            onLeaveRoom: async (roomId: string) => {
                await this.api?.leaveRoom(roomId);
            },
            onLogout: () => {
                this.handleLogout();
            },
            onQuit: () => {
                this.stop();
            },
            onToggleHelp: () => {
                this.showHelp = !this.showHelp;
                this.render();
            },
        });

        // Set up sync engine listeners
        this.syncEngine.on("sync:start", () => {
            this.chatView?.setSyncStatus("syncing");
            this.render();
        });

        this.syncEngine.on("sync:success", ({ nextBatch }: { nextBatch: string }) => {
            SessionManager.updateSyncToken(nextBatch);
            this.chatView?.setSyncStatus("online");
            this.render();
        });

        this.syncEngine.on("sync:error", ({ error, retryInMs }: { error: Error; retryInMs: number }) => {
            this.chatView?.setSyncStatus("reconnecting");
            this.chatView?.showToast(`Sync error: ${error.message} (retrying in ${Math.round(retryInMs / 1000)}s)`);
            this.render();
        });

        this.syncEngine.on("message:new", () => {
            this.render();
        });

        this.syncEngine.on("room:update", () => {
            this.render();
        });

        this.currentScreen = "chat";
        this.render();

        // Start background sync loop (non-blocking)
        this.syncEngine.start().catch((err: unknown) => {
            Logger.error("Sync engine fatal error:", err);
        });
    }

    private handleLogout(): void {
        this.syncEngine?.stop();
        this.api?.logout().catch(() => {});
        SessionManager.clearSession();
        this.currentScreen = "login";
        this.loginView.setStatus("You have been logged out", "info");
        this.loginView.isSubmitting = false;
        this.render();
    }

    private handleKey(key: KeyEvent): void {
        if (this.showHelp) {
            if (key.name === "escape" || key.name === "enter") {
                this.showHelp = false;
                this.render();
            }
            return;
        }

        if (this.currentScreen === "login") {
            this.loginView.handleKey(key);
            this.render();
        } else if (this.currentScreen === "chat" && this.chatView) {
            const rooms = this.syncEngine ? this.syncEngine.getRooms() : [];
            this.chatView.handleKey(key, rooms);
            this.render();
        }
    }

    private render(): void {
        const w = this.terminal.width;
        const h = this.terminal.height;

        let frame: string[] = [];

        if (this.showHelp) {
            frame = HelpModal.render(w, h);
        } else if (this.currentScreen === "login") {
            frame = this.loginView.render(w, h);
        } else if (this.currentScreen === "chat" && this.chatView) {
            const rooms = this.syncEngine ? this.syncEngine.getRooms() : [];
            frame = this.chatView.render(w, h, rooms);
        }

        this.terminal.renderFrame(frame);
    }

    /**
     * Stops the TUI and restores the terminal.
     */
    public stop(): void {
        this.syncEngine?.stop();
        this.terminal.cleanupAndExit(0);
    }
}
