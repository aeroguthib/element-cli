/**
 * Root orchestrator for the Element CLI Terminal User Interface.
 */
export declare class TuiApp {
    private terminal;
    private api;
    private syncEngine;
    private mediaUploader;
    private currentScreen;
    private showHelp;
    private loginView;
    private chatView;
    constructor();
    /**
     * Initializes the TUI and launches either the chat view or login view.
     */
    start(): Promise<void>;
    private setupLoginHandler;
    private initSession;
    private handleLogout;
    private handleKey;
    private render;
    /**
     * Stops the TUI and restores the terminal.
     */
    stop(): void;
}
