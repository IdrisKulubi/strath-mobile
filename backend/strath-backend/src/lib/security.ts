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

    const token = authHeader.slice("Bearer ".length).trim().split(".")[0];
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
    const querySecret = req.nextUrl.searchParams.get("secret");

    return (
        (!!bearer && safeEqual(bearer, cronSecret)) ||
        (!!xCronSecret && safeEqual(xCronSecret, cronSecret)) ||
        (!!querySecret && safeEqual(querySecret, cronSecret))
    );
}

function readProvidedSecret(req: NextRequest) {
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

    return (
        bearer
        || req.headers.get("x-matchmaker-health-secret")
        || req.headers.get("x-cron-secret")
        || req.nextUrl.searchParams.get("secret")
    )?.trim() || null;
}

export function checkMatchmakerHealthAuth(req: NextRequest) {
    if (req.headers.get("x-vercel-cron") === "1") {
        return { authorized: true as const };
    }

    const configuredSecrets = [
        process.env.MATCHMAKER_HEALTH_SECRET?.trim(),
        process.env.CRON_SECRET?.trim(),
    ].filter((value): value is string => Boolean(value));

    if (configuredSecrets.length === 0) {
        if (process.env.NODE_ENV !== "production") {
            return { authorized: true as const };
        }

        return {
            authorized: false as const,
            reason: "No health secret is configured in production. Set MATCHMAKER_HEALTH_SECRET or CRON_SECRET in your host environment.",
        };
    }

    const providedSecret = readProvidedSecret(req);
    if (!providedSecret) {
        return {
            authorized: false as const,
            reason: configuredSecrets.length > 0
                ? "Missing secret in request. CRON_SECRET is configured on the server, but you must still pass it: ?secret=<value> or Authorization: Bearer <value>."
                : "Missing secret. Pass ?secret=..., Authorization: Bearer ..., x-matchmaker-health-secret, or x-cron-secret.",
        };
    }

    const authorized = configuredSecrets.some((secret) => safeEqual(providedSecret, secret));
    if (!authorized) {
        return {
            authorized: false as const,
            reason: "Secret did not match MATCHMAKER_HEALTH_SECRET or CRON_SECRET on this deployment.",
        };
    }

    return { authorized: true as const };
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
