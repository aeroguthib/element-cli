export interface SyncOptions {
    room?: string;
    limit?: number;
    follow?: boolean;
}
export declare function syncCommand(options: SyncOptions): Promise<void>;
