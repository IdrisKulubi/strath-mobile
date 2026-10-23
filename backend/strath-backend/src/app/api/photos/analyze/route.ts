import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { analyzeProfilePhoto } from "@/lib/services/photo-intelligence-service";
import { db as readDb } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    photoUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = bodySchema.parse(await req.json());
        const profile = await readDb.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

        const result = await analyzeProfilePhoto({
            userId: session.user.id,
            profileId: profile?.id,
            photoUrl: body.photoUrl,
        });

        return successResponse(result);
    } catch (error) {
        console.error("[photos/analyze] Error:", error);
        return errorResponse(error);
    }
}
