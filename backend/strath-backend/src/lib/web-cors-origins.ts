/**
 * Browser origins allowed to call the auth API (CORS + Better Auth trustedOrigins).
 * Next.js App Router does not emit CORS headers from trustedOrigins alone — see api/auth route wrapper.
 */
export const WEB_CORS_ORIGINS: string[] = [
    "https://www.strathspace.com",
    "https://strathspace.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://172.20.10.4:3000",
    "http://172.20.10.4:3001",
    "http://192.168.100.24:3000",
    "http://192.168.100.24:3001",
];

export function isLocalDevHttpOrigin(origin: string): boolean {
    try {
        const u = new URL(origin);
        return (
            u.protocol === "http:" &&
            (u.hostname === "localhost" || u.hostname === "127.0.0.1")
        );
    } catch {
        return false;
    }
}

export function isCorsAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    if (WEB_CORS_ORIGINS.includes(origin)) return true;
    return isLocalDevHttpOrigin(origin);
}
