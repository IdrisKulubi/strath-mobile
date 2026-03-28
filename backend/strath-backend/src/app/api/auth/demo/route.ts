import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { session as sessionTable, user } from "@/db/schema";

const DEMO_USER_ID = "demo-dates-main";
const DEMO_USER_EMAIL = "datesdemo@test.com";

export async function POST(request: NextRequest) {
    try {
        const demoUser = await db.query.user.findFirst({
            where: or(eq(user.id, DEMO_USER_ID), eq(user.email, DEMO_USER_EMAIL)),
        });

        if (!demoUser) {
            return NextResponse.json(
                { success: false, error: "Demo user is not seeded" },
                { status: 404 },
            );
        }

        const sessionToken = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.insert(sessionTable).values({
            id: randomUUID(),
            userId: demoUser.id,
            token: sessionToken,
            expiresAt,
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
            userAgent: request.headers.get("user-agent") || "strathspace-demo-login",
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({
            success: true,
            data: {
                token: sessionToken,
                user: demoUser,
                expiresAt: expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Demo auth error:", error);
        return NextResponse.json(
            { success: false, error: "Demo authentication failed" },
            { status: 500 },
        );
    }
}
