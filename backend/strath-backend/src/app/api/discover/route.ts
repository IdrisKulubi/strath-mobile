import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRecommendations } from "@/lib/matching";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        let session = await auth.api.getSession({ headers: req.headers });

        // Fallback: Manual token check for Bearer token auth (mobile clients)
        if (!session) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];

                // Import session table dynamically to avoid circular deps
                const { session: sessionTable } = await import("@/db/schema");

                const dbSession = await db.query.session.findFirst({
                    where: eq(sessionTable.token, token),
                    with: { user: true }
                });

                if (dbSession) {
                    const now = new Date();
                    if (dbSession.expiresAt > now) {
                        session = {
                            session: dbSession,
                            user: dbSession.user
                        } as any;
                    }
                }
            }
        }

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        // Pagination & Vibe params
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const offset = parseInt(searchParams.get("offset") || "0");
        const vibe = searchParams.get("vibe") || "all";

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const recommendations = await getRecommendations(session.user.id, limit, offset, vibe);

        return successResponse({
            profiles: recommendations,
            hasMore: recommendations.length === limit,
            nextOffset: offset + recommendations.length,
        });
    } catch (error) {
        console.error("Discover API error:", error);
        return errorResponse(error);
    }
}

