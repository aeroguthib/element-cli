import { MatrixApi } from "../api/MatrixApi.js";
/**
 * Result of uploading and sending a file to Matrix.
 */
export interface MediaSendResult {
    eventId: string;
    contentUri: string;
    filename: string;
    mimetype: string;
    size: number;
    msgtype: "m.image" | "m.video" | "m.audio" | "m.file";
}
/**
 * Service to upload local files and send them to Matrix rooms.
 */
export declare class MediaUploader {
    private api;
    constructor(api: MatrixApi);
    /**
     * Resolves local file path, handling `~` home directory expansions.
     */
    static resolvePath(filePath: string): string;
    /**
     * Inspects a file path and determines appropriate MIME and Matrix message types.
     */
    static inspectFile(filePath: string): {
        mime: string;
        msgtype: MediaSendResult["msgtype"];
    };
    /**
     * Reads a local file, uploads it to the homeserver, and sends it to the specified room.
     */
    uploadAndSend(roomId: string, rawFilePath: string, overrideMsgType?: MediaSendResult["msgtype"]): Promise<MediaSendResult>;
}
