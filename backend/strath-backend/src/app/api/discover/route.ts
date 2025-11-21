import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getRecommendations } from "@/lib/matching";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const recommendations = await getRecommendations(session.user.id);

        return successResponse(recommendations);
    } catch (error) {
        return errorResponse(error);
    }
}
