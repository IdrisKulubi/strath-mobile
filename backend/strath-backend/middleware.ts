import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);

    // List of public paths that don't require authentication
    const publicPaths = [
        "/api/auth",
        "/api/hype/write",
        "/api/test-db",
        "/api/seed-demo",
        "/_next",
        "/favicon.ico",
        "/public",
    ];

    const isPublicPath = publicPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isPublicPath) {
        return NextResponse.next();
    }

    // Simple check for session cookie existence
    // For full validation, we'd need to call the auth server or check DB, 
    // but middleware runs on edge and might not have DB access easily.
    // BetterAuth handles the actual session validation in the API routes.
    // This middleware is just for quick redirection/blocking at the edge.

    // Allow requests with Authorization header (Bearer token) to pass through
    // The route handler will verify the token validity
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return NextResponse.next();
    }

    if (!sessionCookie) {
        // If it's an API route, return 401
        if (request.nextUrl.pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Otherwise redirect to login (if we had pages)
        // return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};
