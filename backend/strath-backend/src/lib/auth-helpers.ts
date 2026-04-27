import { NextRequest } from "next/server";

import { getSessionWithBearerFallback } from "@/lib/security";

/**
 * Same session resolution everywhere: Better Auth cookie/session first, then
 * Bearer token matched against `session.token` (trimmed — important for mobile).
 */
export async function getSessionWithFallback(req: NextRequest) {
    return getSessionWithBearerFallback(req);
}
