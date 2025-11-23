import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const pushTokenSchema = z.object({
    pushToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const { pushToken } = pushTokenSchema.parse(body);

        await db
            .update(user)
            .set({ pushToken })
            .where(eq(user.id, session.user.id));

        return successResponse({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
