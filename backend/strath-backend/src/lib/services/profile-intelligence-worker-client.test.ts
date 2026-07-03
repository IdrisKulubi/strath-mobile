import test from "node:test";
import assert from "node:assert/strict";

import {
    requestProfileAnalysis,
    requestProfileBatchAnalysis,
    requestProfileSummary,
} from "@/lib/services/profile-intelligence-worker-client";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
type CapturedRequest = { url: string; init: RequestInit };

function restore() {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
}

test.afterEach(restore);

test("requestProfileSummary returns null when worker URL is not configured", async () => {
    delete process.env.PROFILE_INTELLIGENCE_SERVICE_URL;
    delete process.env.PHOTO_INTELLIGENCE_SERVICE_URL;

    const result = await requestProfileSummary({ userId: "u1", firstName: "Amina" });
    assert.equal(result, null);
});

test("requestProfileSummary posts snake_case profile payload with bearer auth", async () => {
    process.env.PROFILE_INTELLIGENCE_SERVICE_URL = "https://worker.test/";
    process.env.PROFILE_INTELLIGENCE_SERVICE_SECRET = "secret";

    let captured: CapturedRequest | undefined;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        captured = { url: String(url), init: init ?? {} };
        return new Response(
            JSON.stringify({
                profileSummary: "Amina seems calm.",
                searchText: "name: Amina",
                summaryVersion: "profile_summary_v1",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    }) as typeof fetch;

    const result = await requestProfileSummary({
        userId: "u1",
        firstName: "Amina",
        yearOfStudy: 3,
        aboutMe: "Calm and focused",
    });

    assert.ok(captured);
    const request = captured;
    assert.equal(result?.profileSummary, "Amina seems calm.");
    assert.equal(request.url, "https://worker.test/profiles/summarize");
    assert.equal((request.init.headers as Record<string, string>).Authorization, "Bearer secret");
    assert.deepEqual(JSON.parse(String(request.init.body)).profile, {
        user_id: "u1",
        first_name: "Amina",
        year_of_study: 3,
        about_me: "Calm and focused",
        interests: [],
        qualities: [],
        prompts: [],
        personality_answers: {},
        lifestyle_answers: {},
        photos: [],
    });
});

test("requestProfileAnalysis retries retryable worker errors", async () => {
    process.env.PROFILE_INTELLIGENCE_SERVICE_URL = "https://worker.test";
    process.env.PROFILE_INTELLIGENCE_SERVICE_SECRET = "secret";
    process.env.PROFILE_INTELLIGENCE_MAX_ATTEMPTS = "2";
    process.env.PROFILE_INTELLIGENCE_RETRY_DELAY_MS = "0";

    let calls = 0;
    globalThis.fetch = (async () => {
        calls += 1;
        if (calls === 1) {
            return new Response("temporary", { status: 503 });
        }
        return new Response(
            JSON.stringify({
                profileSummary: "Brian seems social.",
                searchText: "name: Brian",
                textEmbedding: Array.from({ length: 768 }, () => 0),
                textEmbeddingProvider: "text-hash",
                textEmbeddingModel: "profile-text-hash-v1",
                photoPresentation: {
                    photoPresentationScore: 0,
                    faceVisible: false,
                    imageClear: false,
                    lightingScore: 0,
                    hasMultiplePeople: false,
                    isObjectOnly: true,
                    moderationStatus: "pending",
                    analysisVersion: "profile_photo_presentation_v1",
                },
                visualEmbedding: null,
                visualEmbeddingProvider: "clip-hash",
                visualEmbeddingModel: "hash-v1",
                analysisVersion: "profile_intelligence_worker_v1",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    }) as typeof fetch;

    const result = await requestProfileAnalysis({ userId: "u2", firstName: "Brian" });
    assert.equal(calls, 2);
    assert.equal(result?.profileSummary, "Brian seems social.");
});

test("requestProfileBatchAnalysis throws when secret is missing", async () => {
    process.env.PROFILE_INTELLIGENCE_SERVICE_URL = "https://worker.test";
    delete process.env.PROFILE_INTELLIGENCE_SERVICE_SECRET;
    delete process.env.PHOTO_INTELLIGENCE_SERVICE_SECRET;

    await assert.rejects(
        () => requestProfileBatchAnalysis([{ userId: "u1" }]),
        /SERVICE_SECRET/,
    );
});
