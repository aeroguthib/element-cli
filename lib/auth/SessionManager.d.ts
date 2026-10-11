/**
 * Persisted session data format.
 */
export interface StoredSession {
    homeserver: string;
    userId: string;
    deviceId: string;
    accessToken: string;
    lastSyncToken?: string;
    savedAt: number;
}
/**
 * Manages loading, storing, verifying, and clearing user sessions.
 */
export declare class SessionManager {
    private static sessionDir;
    private static sessionFilePath;
    /**
     * Sets a custom configuration directory (useful for testing or profile isolation).
     */
    static setConfigDir(dir: string): void;
    /**
     * Sets a custom session file path (useful for testing or profile isolation).
     */
    static setCustomPath(filePath: string): void;
    /**
     * Returns the active session file path.
     */
    static getSessionPath(): string;
    /**
     * Checks if a session file currently exists on disk.
     */
    static hasSession(): boolean;
    /**
     * Loads the stored session from disk.
     */
    static loadSession(): StoredSession | null;
    /**
     * Saves a session securely to disk with mode 0600.
     */
    static saveSession(session: Omit<StoredSession, "savedAt">): void;
    /**
     * Updates the sync token in the active session.
     */
    static updateSyncToken(token: string): void;
    /**
     * Clears the current session file.
     */
    static clearSession(): void;
    /**
     * Validates the session with the homeserver via /account/whoami.
     */
    static verifySession(session: StoredSession): Promise<boolean>;
}
