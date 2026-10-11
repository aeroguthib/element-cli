import { KeyEvent } from "../Terminal.js";
export interface LoginSubmitData {
    homeserver: string;
    username?: string;
    password?: string;
    token?: string;
}
/**
 * Interactive login view rendered in terminal.
 */
export declare class LoginView {
    homeserver: string;
    username: string;
    password: string;
    token: string;
    isTokenMode: boolean;
    activeField: "homeserver" | "username" | "password" | "token" | "submit";
    statusMessage: string;
    statusType: "info" | "error" | "success";
    isSubmitting: boolean;
    private onSubmitCallback?;
    setOnSubmit(callback: (data: LoginSubmitData) => void): void;
    setStatus(message: string, type?: "info" | "error" | "success"): void;
    handleKey(key: KeyEvent): void;
    private navigateNext;
    private navigatePrev;
    private modifyActiveText;
    private submit;
    /**
     * Renders the login dialog centered on the terminal screen.
     */
    render(width: number, height: number): string[];
}
