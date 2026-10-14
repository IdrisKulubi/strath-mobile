/**
 * Verify production reachability and recent matchmaker OpenAI metadata.
 *
 * Usage:
 *   npx tsx src/scripts/verify-production-matchmaker.ts
 *   MATCHMAKER_TEST_TOKEN=<bearer> npx tsx src/scripts/verify-production-matchmaker.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { desc, eq, gte, sql } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { db } from "@/lib/db";
import { analyticsEvents, matchmakerMessages, matchmakerSessionResults, matchmakerSessions, matchmakerShortlists } from "@/db/schema";
import { getMatchmakerV2Rollout } from "@/lib/feature-flags";
import { evaluateMatchmakerRolloutGuardrails } from "@/lib/matchmaker/rollout-guardrails";
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

async function inspectV2Readiness() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [rollout, shortlistRows, repeatRows, eventRows] = await Promise.all([
        getMatchmakerV2Rollout(),
        db.select({
            shortlists: sql<number>`count(*)::int`,
            creditMismatches: sql<number>`count(*) filter (where ${matchmakerShortlists.status} = 'presented' and ${matchmakerShortlists.creditConsumed} = false)::int`,
            sizeOne: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 1)::int`,
            sizeTwo: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 2)::int`,
            sizeThree: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 3)::int`,
        }).from(matchmakerShortlists).where(gte(matchmakerShortlists.createdAt, since)),
        db.select({
            repeatedRows: sql<number>`coalesce(sum(greatest(repeats.shown_count - 1, 0)), 0)::int`,
            totalRows: sql<number>`coalesce(sum(repeats.shown_count), 0)::int`,
            explanationFailures: sql<number>`coalesce(sum(repeats.explanation_failures), 0)::int`,
        }).from(sql`(
            select ${matchmakerSessionResults.sessionId} as session_id,
                   ${matchmakerSessionResults.candidateUserId} as candidate_user_id,
                   count(*)::int as shown_count,
                   count(*) filter (where jsonb_array_length(${matchmakerSessionResults.fitReasons}) = 0)::int as explanation_failures
            from ${matchmakerSessionResults}
            where ${matchmakerSessionResults.createdAt} >= ${since}
              and ${matchmakerSessionResults.shortlistId} is not null
            group by ${matchmakerSessionResults.sessionId}, ${matchmakerSessionResults.candidateUserId}
        ) as repeats`),
        db.select({
            requests: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_shortlist_requested')::int`,
            failures: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_shortlist_failed')::int`,
            providerFallbacks: sql<number>`count(*) filter (where ${analyticsEvents.eventType} in ('matchmaker_shortlist_generated', 'matchmaker_shortlist_partial') and ${analyticsEvents.metadata}->>'providerFallback' = 'true')::int`,
        }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, since)),
    ]);
    const shortlist = shortlistRows[0];
    const repeats = repeatRows[0];
    const events = eventRows[0];
    const totalRows = Number(repeats?.totalRows ?? 0);
    const repeatedCandidateRatePct = totalRows > 0 ? Number(repeats?.repeatedRows ?? 0) / totalRows * 100 : 0;
    const requests = Number(events?.requests ?? 0);
    const currentApiErrorRatePct = requests > 0 ? Number(events?.failures ?? 0) / requests * 100 : 0;
    const guardrails = evaluateMatchmakerRolloutGuardrails({
        baselineApiErrorRatePct: Number(process.env.MATCHMAKER_V1_API_ERROR_BASELINE_PCT ?? 0),
        currentApiErrorRatePct,
        repeatedCandidateRatePct,
        creditMismatchCount: Number(shortlist?.creditMismatches ?? 0),
        unrecoverableStateCount: Number(process.env.MATCHMAKER_V2_UNRECOVERABLE_STATE_COUNT ?? 0),
        privacyOrSafetyRegression: process.env.MATCHMAKER_V2_SAFETY_REGRESSION === "true",
    });
    return {
        migrationTablesReadable: true,
        rollout,
        last24Hours: {
            shortlists: Number(shortlist?.shortlists ?? 0),
            sizeDistribution: { one: Number(shortlist?.sizeOne ?? 0), two: Number(shortlist?.sizeTwo ?? 0), three: Number(shortlist?.sizeThree ?? 0) },
            creditMismatches: Number(shortlist?.creditMismatches ?? 0),
            repeatedCandidateRatePct: Math.round(repeatedCandidateRatePct * 100) / 100,
            explanationFailures: Number(repeats?.explanationFailures ?? 0),
            shortlistErrorRatePct: Math.round(currentApiErrorRatePct * 100) / 100,
            providerFallbacks: Number(events?.providerFallbacks ?? 0),
        },
        guardrails,
    };
}

async function main() {
    console.log(`Verifying production matchmaker at ${API_URL}...`);

    const [publicApi, authProbe, recent, v2Readiness] = await Promise.all([
        probePublicApi(),
        probeMatchmakerAuth(),
        inspectRecentProductionMessages(),
        inspectV2Readiness(),
    ]);

    console.log(JSON.stringify({
        publicApi,
        authProbe,
        expectedVoiceVersion: MATCHMAKER_VOICE_VERSION,
        recent,
        v2Readiness,
    }, null, 2));

    if (authProbe.status !== 401) {
        throw new Error(`Expected unauthenticated matchmaker probe to return 401, got ${authProbe.status}`);
    }
    if (v2Readiness.rollout.masterEnabled && !v2Readiness.rollout.config.rollbackReady) {
        throw new Error("V2 master flag is enabled without a verified rollback-ready configuration");
    }
    if (v2Readiness.guardrails.shouldPause) {
        throw new Error(`V2 rollout must pause: ${v2Readiness.guardrails.reasons.join("; ")}`);
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
