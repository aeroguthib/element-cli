export interface LoginOptions {
    homeserver?: string;
    username?: string;
    password?: string;
    token?: string;
}
export declare function loginCommand(options: LoginOptions): Promise<void>;
