import { MediaSendResult } from "../media/MediaUploader.js";
export interface SendFileOptions {
    room: string;
    file: string;
    type?: MediaSendResult["msgtype"];
}
export declare function sendFileCommand(options: SendFileOptions): Promise<void>;
