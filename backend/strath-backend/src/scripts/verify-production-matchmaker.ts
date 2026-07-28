/**
 * Verify production reachability and recent matchmaker OpenAI metadata.
 *
 * Usage:
 *   npx tsx src/scripts/verify-production-matchmaker.ts
 *   MATCHMAKER_TEST_TOKEN=<bearer> npx tsx src/scripts/verify-production-matchmaker.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { desc, eq } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { db } from "@/lib/db";
import { matchmakerMessages, matchmakerSessions } from "@/db/schema";
import { MATCHMAKER_VOICE_VERSION } from "@/lib/services/matchmaker-session-service";

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.strathspace.com";
const FORBIDDEN_REPLY_PATTERNS = [
    /got it\.?\s*i will prioritize/i,
    /should i go ahead\??/i,
    /avoid people you have already passed/i,
];

async function probePublicApi() {
    const response = await fetch(`${API_URL}/api/public/feature-flags`);
    const body = await response.json();
    if (!response.ok) {
        throw new Error(`Feature flags probe failed (${response.status}): ${JSON.stringify(body)}`);
    }
    return { status: response.status, body };
}

async function probeMatchmakerAuth() {
    const response = await fetch(`${API_URL}/api/matchmaker/session`);
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
}

async function probeAuthenticatedMatchmaker(token: string) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    const sessionResponse = await fetch(`${API_URL}/api/matchmaker/session`, { headers });
    const sessionBody = await sessionResponse.json();
    if (!sessionResponse.ok) {
        throw new Error(`Authenticated session probe failed (${sessionResponse.status}): ${JSON.stringify(sessionBody)}`);
    }

    const messageResponse = await fetch(`${API_URL}/api/matchmaker/session/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            text: "I want someone calm, intentional, active today, and easy to talk to.",
        }),
    });
    const messageBody = await messageResponse.json();
    if (!messageResponse.ok) {
        throw new Error(`Authenticated message probe failed (${messageResponse.status}): ${JSON.stringify(messageBody)}`);
    }

    return { sessionBody, messageBody };
}

function readMetadata(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

async function inspectRecentProductionMessages() {
    const sessions = await db.query.matchmakerSessions.findMany({
        where: eq(matchmakerSessions.status, "active"),
        orderBy: [desc(matchmakerSessions.updatedAt)],
        limit: 5,
    });

    const messages = await db.query.matchmakerMessages.findMany({
        where: eq(matchmakerMessages.role, "assistant"),
        orderBy: [desc(matchmakerMessages.createdAt)],
        limit: 10,
    });

    const assistantSamples = messages.map((message) => {
        const metadata = readMetadata(message.metadata);
        return {
            id: message.id,
            kind: message.kind,
            textPreview: message.text.slice(0, 120),
            provider: metadata.provider ?? null,
            fallbackUsed: metadata.fallbackUsed ?? null,
            voiceVersion: metadata.voiceVersion ?? null,
            forbiddenTemplate: FORBIDDEN_REPLY_PATTERNS.some((pattern) => pattern.test(message.text)),
        };
    });

    const activeVoiceVersions = sessions.map((session) => {
        const metadata = readMetadata(session.metadata);
        return {
            sessionId: session.id,
            sessionDay: session.sessionDay,
            voiceVersion: metadata.voiceVersion ?? null,
            currentVoice: metadata.voiceVersion === MATCHMAKER_VOICE_VERSION,
        };
    });

    return { activeVoiceVersions, assistantSamples };
}

async function main() {
    console.log(`Verifying production matchmaker at ${API_URL}...`);

    const [publicApi, authProbe, recent] = await Promise.all([
        probePublicApi(),
        probeMatchmakerAuth(),
        inspectRecentProductionMessages(),
    ]);

    console.log(JSON.stringify({
        publicApi,
        authProbe,
        expectedVoiceVersion: MATCHMAKER_VOICE_VERSION,
        recent,
    }, null, 2));

    if (authProbe.status !== 401) {
        throw new Error(`Expected unauthenticated matchmaker probe to return 401, got ${authProbe.status}`);
    }

    const token = process.env.MATCHMAKER_TEST_TOKEN?.trim();
    if (token) {
        const authenticated = await probeAuthenticatedMatchmaker(token);
        const data = authenticated.messageBody?.data ?? authenticated.messageBody;
        const assistantMessages = Array.isArray(data?.messages)
            ? data.messages.filter((message: { role?: string }) => message.role === "assistant")
            : [];
        const latestAssistant = assistantMessages.at(-1);
        const metadata = readMetadata(latestAssistant?.metadata);

        console.log("Authenticated production probe:");
        console.log(JSON.stringify({
            latestAssistantText: latestAssistant?.text,
            provider: metadata.provider ?? null,
            fallbackUsed: metadata.fallbackUsed ?? null,
            voiceVersion: metadata.voiceVersion ?? null,
        }, null, 2));

        if (metadata.provider !== "openai") {
            throw new Error(`Expected provider=openai from production, got ${String(metadata.provider)}`);
        }
        if (metadata.fallbackUsed === true) {
            throw new Error("Production matchmaker used fallback prose");
        }
        if (typeof latestAssistant?.text === "string") {
            for (const pattern of FORBIDDEN_REPLY_PATTERNS) {
                if (pattern.test(latestAssistant.text)) {
                    throw new Error(`Production reply used forbidden template wording: ${latestAssistant.text}`);
                }
            }
        }
    } else {
        console.log("Skipped authenticated production probe (set MATCHMAKER_TEST_TOKEN to enable).");
    }

    const forbiddenInDb = recent.assistantSamples.filter((sample) => sample.forbiddenTemplate);
    const scriptedRecent = recent.assistantSamples.filter((sample) => sample.provider === "scripted");
    const hasCurrentVoiceSession = recent.activeVoiceVersions.some((session) => session.currentVoice);

    if (forbiddenInDb.length > 0) {
        console.warn("Warning: recent assistant messages still contain legacy template wording:");
        console.warn(JSON.stringify(forbiddenInDb, null, 2));
    }

    if (!token && scriptedRecent.length === recent.assistantSamples.length && recent.assistantSamples.length > 0) {
        throw new Error(
            "Production still appears to be serving scripted matchmaker replies. Confirm the new backend is deployed and MATCHMAKER_LLM_PROVIDER=openai is set in production.",
        );
    }

    if (!token && !hasCurrentVoiceSession && recent.activeVoiceVersions.length > 0) {
        console.warn(
            `Warning: no active sessions use voiceVersion=${MATCHMAKER_VOICE_VERSION} yet. Open matchmaker in the app to roll stale sessions forward.`,
        );
    }

    console.log("Production verification passed.");
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
