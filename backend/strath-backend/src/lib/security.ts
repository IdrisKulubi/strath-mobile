import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session as sessionTable } from "@/db/schema";

type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

function safeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    if (left.length !== right.length) {
        return false;
    }

    return timingSafeEqual(left, right);
}

export async function getSessionWithBearerFallback(req: NextRequest): Promise<AppSession> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (session) {
        return session;
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return null;
    }

    const dbSession = await db.query.session.findFirst({
        where: eq(sessionTable.token, token),
        with: { user: true },
    });

    if (!dbSession || dbSession.expiresAt <= new Date()) {
        return null;
    }

    return {
        session: dbSession,
        user: dbSession.user,
    } as AppSession;
}

export function isAdminSession(session: AppSession) {
    return !!session?.user && (session.user as { role?: string }).role === "admin";
}

export async function requireAdminApiSession(req: NextRequest) {
    const session = await getSessionWithBearerFallback(req);
    if (!isAdminSession(session)) {
        return null;
    }

    return session;
}

export function isAuthorizedCronRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const vercelCronHeader = req.headers.get("x-vercel-cron");

    if (vercelCronHeader === "1") {
        return true;
    }

    if (!cronSecret) {
        return process.env.NODE_ENV !== "production";
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;
    const xCronSecret = req.headers.get("x-cron-secret");

    return (
        (!!bearer && safeEqual(bearer, cronSecret)) ||
        (!!xCronSecret && safeEqual(xCronSecret, cronSecret))
    );
}

export function isDebugRouteEnabled() {
    return process.env.NODE_ENV !== "production";
}

export function sanitizeUploadFilename(filename: string) {
    const trimmed = filename.trim();
    const basename = trimmed.split(/[\\/]/).pop() ?? "upload";

    return basename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export function isAllowedImageContentType(contentType: string) {
    return new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    ]).has(contentType.toLowerCase());
}
