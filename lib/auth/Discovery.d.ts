/**
 * Resolves and verifies Matrix homeserver URLs and handles .well-known resolution.
 */
export declare class Discovery {
    /**
     * Normalizes a homeserver URL by adding default protocol and trimming slashes.
     */
    static normalizeUrl(input: string): string;
    /**
     * Resolves a user-provided server address (e.g. "matrix.org" or "https://matrix.org")
     * to a fully qualified, verified Matrix homeserver base URL.
     */
    static resolveHomeserver(input: string): Promise<string>;
}
