import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session || session.user.role !== "admin") {
            return errorResponse(new Error("Unauthorized: Admin only"), 403);
        }

        const allReports = await db.query.reports.findMany({
            with: {
                reporter: true,
                reportedUser: true,
            },
            limit: 100,
        });

        return successResponse(allReports);
    } catch (error) {
        return errorResponse(error);
    }
}
