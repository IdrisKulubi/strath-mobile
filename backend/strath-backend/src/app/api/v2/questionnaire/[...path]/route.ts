import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { handlePhase2Request } from "@/lib/questionnaire/phase2-api";
import { DomainError } from "@/lib/questionnaire/phase2-service";
import { flags } from "@/lib/questionnaire/flags";
import { getSessionWithBearerFallback } from "@/lib/security";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32_768;

async function readBoundedJson(request: NextRequest) {
    const reader = request.body?.getReader();
    if (!reader) return {};
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new DomainError("Request too large", 413);
        }
        text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
        return JSON.parse(text || "{}");
    } catch {
        throw new DomainError("Invalid JSON");
    }
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    try {
        const session = await getSessionWithBearerFallback(request);
        const userId = session?.user?.id ?? null;
        const { path } = await context.params;
        const featureFlags = userId ? flags(userId) : undefined;
        const body = ["POST", "PUT", "DELETE"].includes(request.method)
            ? await readBoundedJson(request)
            : undefined;
        const result = await handlePhase2Request({
            userId,
            collectionEnabled: featureFlags?.collection ?? false,
            featureFlags,
            method: request.method,
            path,
            body,
        });
        return NextResponse.json(result);
    } catch (error) {
        const status = error instanceof DomainError ? error.status : error instanceof ZodError ? 400 : 500;
        return NextResponse.json({
            error: error instanceof DomainError
                ? error.message
                : error instanceof ZodError
                    ? "Please check your selections."
                    : "Unable to complete the request.",
            retryable: status >= 500,
        }, { status });
    }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
