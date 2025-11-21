import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, reports } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session || session.user.role !== "admin") {
            return errorResponse(new Error("Unauthorized: Admin only"), 403);
        }

        const allUsers = await db.query.users.findMany({
            limit: 100,
        });

        return successResponse(allUsers);
    } catch (error) {
        return errorResponse(error);
    }
}
