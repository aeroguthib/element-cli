/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/
import { Theme } from "../Theme.js";
import { Ansi, stripAnsi } from "../../utils/format.js";
/**
 * Interactive login view rendered in terminal.
 */
export class LoginView {
    homeserver = "https://matrix.org";
    username = "";
    password = "";
    token = "";
    isTokenMode = false;
    activeField = "homeserver";
    statusMessage = "";
    statusType = "info";
    isSubmitting = false;
    onSubmitCallback;
    setOnSubmit(callback) {
        this.onSubmitCallback = callback;
    }
    setStatus(message, type = "info") {
        this.statusMessage = message;
        this.statusType = type;
    }
    handleKey(key) {
        if (this.isSubmitting) {
            return;
        }
        // Switch to/from token mode with Ctrl+T
        if (key.ctrl && key.name === "t") {
            this.isTokenMode = !this.isTokenMode;
            this.activeField = this.isTokenMode ? "token" : "username";
            return;
        }
        // Field navigation
        if (key.name === "tab" || key.name === "down") {
            this.navigateNext();
            return;
        }
        if ((key.name === "tab" && key.shift) || key.name === "up") {
            this.navigatePrev();
            return;
        }
        // Submit on Enter
        if (key.name === "enter") {
            if (this.activeField === "submit" || this.activeField === "password" || this.activeField === "token") {
                this.submit();
            }
            else {
                this.navigateNext();
            }
            return;
        }
        // Text editing for active field
        if (key.name === "backspace") {
            this.modifyActiveText((val) => val.slice(0, -1));
            return;
        }
        // Regular printable characters
        if (key.name.length === 1 && !key.ctrl && !key.meta) {
            this.modifyActiveText((val) => val + key.name);
        }
    }
    navigateNext() {
        if (this.isTokenMode) {
            const order = ["homeserver", "token", "submit"];
            const idx = order.indexOf(this.activeField);
            this.activeField = order[(idx + 1) % order.length];
        }
        else {
            const order = [
                "homeserver",
                "username",
                "password",
                "submit",
            ];
            const idx = order.indexOf(this.activeField);
            this.activeField = order[(idx + 1) % order.length];
        }
    }
    navigatePrev() {
        if (this.isTokenMode) {
            const order = ["homeserver", "token", "submit"];
            const idx = order.indexOf(this.activeField);
            this.activeField = order[(idx - 1 + order.length) % order.length];
        }
        else {
            const order = [
                "homeserver",
                "username",
                "password",
                "submit",
            ];
            const idx = order.indexOf(this.activeField);
            this.activeField = order[(idx - 1 + order.length) % order.length];
        }
    }
    modifyActiveText(fn) {
        switch (this.activeField) {
            case "homeserver":
                this.homeserver = fn(this.homeserver);
                break;
            case "username":
                this.username = fn(this.username);
                break;
            case "password":
                this.password = fn(this.password);
                break;
            case "token":
                this.token = fn(this.token);
                break;
        }
    }
    submit() {
        if (!this.homeserver.trim()) {
            this.setStatus("Please enter a homeserver address", "error");
            return;
        }
        if (this.isTokenMode) {
            if (!this.token.trim()) {
                this.setStatus("Please enter an access token", "error");
                return;
            }
            this.isSubmitting = true;
            this.setStatus("Verifying token with homeserver...", "info");
            this.onSubmitCallback?.({
                homeserver: this.homeserver.trim(),
                token: this.token.trim(),
            });
        }
        else {
            if (!this.username.trim() || !this.password) {
                this.setStatus("Please enter both username and password", "error");
                return;
            }
            this.isSubmitting = true;
            this.setStatus("Connecting & authenticating...", "info");
            this.onSubmitCallback?.({
                homeserver: this.homeserver.trim(),
                username: this.username.trim(),
                password: this.password,
            });
        }
    }
    /**
     * Renders the login dialog centered on the terminal screen.
     */
    render(width, height) {
        const lines = [];
        const boxWidth = Math.min(64, width - 4);
        const innerWidth = boxWidth - 4;
        const padLine = (content, visibleLength = stripAnsi(content).length) => {
            const padTotal = Math.max(0, width - visibleLength);
            const padLeft = Math.floor(padTotal / 2);
            return " ".repeat(padLeft) + content;
        };
        const renderField = (label, value, isActive, isMasked = false) => {
            const displayVal = isMasked ? "*".repeat(value.length) : value;
            const cursor = isActive ? Ansi.inverse + " " + Ansi.reset : " ";
            const labelStr = label.padEnd(12, " ");
            const borderCol = isActive ? Theme.brandGreen : Theme.textMuted;
            const textCol = isActive ? Ansi.brightWhite : Ansi.white;
            const inputMax = innerWidth - 16;
            const trimmed = displayVal.length > inputMax ? "…" + displayVal.slice(-(inputMax - 1)) : displayVal;
            const valPadded = (trimmed + cursor).padEnd(inputMax + 1, " ");
            return `${Theme.box.vertical}  ${Theme.textDim}${labelStr}${Ansi.reset}${borderCol}[${Ansi.reset} ${textCol}${valPadded}${borderCol}]${Ansi.reset} ${Theme.box.vertical}`;
        };
        const dialogLines = [];
        const b = Theme.box;
        const bColor = Theme.brandGreen;
        dialogLines.push(`${bColor}${b.topLeft}${b.horizontal.repeat(boxWidth - 2)}${b.topRight}${Ansi.reset}`);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(boxWidth - 2)}${bColor}${b.vertical}${Ansi.reset}`);
        // Header Title
        const title = `${Theme.brandGreen}${Ansi.bold}[E]  E L E M E N T   C L I${Ansi.reset}`;
        const titleVisible = stripAnsi(title).length;
        const titlePad = Math.max(0, boxWidth - 2 - titleVisible);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(Math.floor(titlePad / 2))}${title}${" ".repeat(Math.ceil(titlePad / 2))}${bColor}${b.vertical}${Ansi.reset}`);
        const subtitle = `${Theme.textMuted}Secure decentralized communication for your terminal${Ansi.reset}`;
        const subPad = Math.max(0, boxWidth - 2 - stripAnsi(subtitle).length);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(Math.floor(subPad / 2))}${subtitle}${" ".repeat(Math.ceil(subPad / 2))}${bColor}${b.vertical}${Ansi.reset}`);
        dialogLines.push(`${bColor}${b.teeRight}${b.horizontal.repeat(boxWidth - 2)}${b.teeLeft}${Ansi.reset}`);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(boxWidth - 2)}${bColor}${b.vertical}${Ansi.reset}`);
        // Fields
        dialogLines.push(renderField("Homeserver", this.homeserver, this.activeField === "homeserver"));
        if (this.isTokenMode) {
            dialogLines.push(renderField("Access Token", this.token, this.activeField === "token"));
        }
        else {
            dialogLines.push(renderField("Username", this.username, this.activeField === "username"));
            dialogLines.push(renderField("Password", this.password, this.activeField === "password", true));
        }
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(boxWidth - 2)}${bColor}${b.vertical}${Ansi.reset}`);
        // Submit Button & Mode hint
        const btnActive = this.activeField === "submit";
        const btnStyle = btnActive ? Ansi.bgGreen + Ansi.black + Ansi.bold : Ansi.bgGray + Ansi.white;
        const submitBtn = `${btnStyle} [ Log In ] ${Ansi.reset}`;
        const modeHint = `${Theme.textMuted}(Ctrl+T: ${this.isTokenMode ? "Switch to Password" : "Use Access Token"})${Ansi.reset}`;
        const actionRow = `  ${submitBtn}   ${modeHint}`;
        const actionPad = Math.max(0, boxWidth - 2 - stripAnsi(actionRow).length);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${actionRow}${" ".repeat(actionPad)}${bColor}${b.vertical}${Ansi.reset}`);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${" ".repeat(boxWidth - 2)}${bColor}${b.vertical}${Ansi.reset}`);
        // Status row
        let statusColor = Theme.textMuted;
        if (this.statusType === "error") {
            statusColor = Theme.error;
        }
        else if (this.statusType === "success") {
            statusColor = Theme.success;
        }
        const statusRow = `  ${statusColor}${this.statusMessage || "Press Tab to switch fields, Enter to submit"}${Ansi.reset}`;
        const statusPad = Math.max(0, boxWidth - 2 - stripAnsi(statusRow).length);
        dialogLines.push(`${bColor}${b.vertical}${Ansi.reset}${statusRow}${" ".repeat(statusPad)}${bColor}${b.vertical}${Ansi.reset}`);
        dialogLines.push(`${bColor}${b.bottomLeft}${b.horizontal.repeat(boxWidth - 2)}${b.bottomRight}${Ansi.reset}`);
        // Center vertically on screen
        const topPadding = Math.max(1, Math.floor((height - dialogLines.length) / 2));
        for (let i = 0; i < topPadding; i++) {
            lines.push("");
        }
        for (const dl of dialogLines) {
            lines.push(padLine(dl));
        }
        return lines;
    }
}
