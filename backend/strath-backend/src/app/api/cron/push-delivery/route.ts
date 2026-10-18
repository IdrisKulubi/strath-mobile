import { NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/security";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sweepPushDeliveries } from "@/lib/push-delivery";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) return errorResponse(new Error("Unauthorized"), 401);
    try { return successResponse(await sweepPushDeliveries()); }
    catch (error) { return errorResponse(error); }
}
