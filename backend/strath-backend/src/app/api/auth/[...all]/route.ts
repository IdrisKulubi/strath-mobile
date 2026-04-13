import { auth } from "@/lib/auth";
import { isCorsAllowedOrigin } from "@/lib/web-cors-origins";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth);

const CORS_ALLOW_HEADERS =
    "Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With, Accept, Origin, Referer, User-Agent, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform";

function applyCors(request: NextRequest, response: Response): NextResponse {
    const origin = request.headers.get("origin");
    const headers = new Headers(response.headers);

    if (origin && isCorsAllowedOrigin(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
    }
    headers.append("Vary", "Origin");

    return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    const headers = new Headers();

    if (origin && isCorsAllowedOrigin(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
    }
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
    headers.set("Access-Control-Max-Age", "86400");
    headers.append("Vary", "Origin");

    return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest) {
    const response = await baseGET(request);
    return applyCors(request, response);
}

export async function POST(request: NextRequest) {
    const response = await basePOST(request);
    return applyCors(request, response);
}
