import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { getBrowseRecommendations, type BrowseFilters, type BrowseMode } from "@/lib/services/match-intelligence-service";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export const dynamic = "force-dynamic";

function parseBoolean(value: string | null) {
    if (value === null) return undefined;
    return value === "true" || value === "1";
}

function parseNumber(value: string | null) {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMode(value: string | null): BrowseMode | undefined {
    if (value === "similar" || value === "different" || value === "new" || value === "available") {
        return value;
    }
    return undefined;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        try {
            await requireMatchmakingAccess(session.user.id);
        } catch (accessError) {
            return errorResponse(accessError, accessError instanceof Error && accessError.message === "Profile not found" ? 404 : 403);
        }

        const { searchParams } = new URL(req.url);
        const filters: BrowseFilters = {
            university: searchParams.get("university") || undefined,
            course: searchParams.get("course") || undefined,
            ageMin: parseNumber(searchParams.get("age_min")),
            ageMax: parseNumber(searchParams.get("age_max")),
            activeRecently: parseBoolean(searchParams.get("active_recently")),
            verifiedOnly: parseBoolean(searchParams.get("verified_only")),
            mode: parseMode(searchParams.get("mode")),
            limit: parseNumber(searchParams.get("limit")),
            cursor: searchParams.get("cursor") || undefined,
        };

        const browse = await getBrowseRecommendations(session.user.id, filters);
        return successResponse(browse);
    } catch (error) {
        console.error("[browse] Error:", error);
        return errorResponse(error);
    }
}
