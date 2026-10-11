export interface SendOptions {
    room: string;
    message: string;
}
export declare function sendCommand(options: SendOptions): Promise<void>;
