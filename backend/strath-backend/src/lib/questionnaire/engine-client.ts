import { z } from "zod";

import { ALGORITHM, scoreSchema, type EnginePerson, type Score } from "./contracts";

const MAX_CANDIDATES_PER_REQUEST = 25;
const MAX_PAYLOAD_BYTES = 4_000_000;
const TIMEOUT_MS = 5_000;

type EngineClientOptions = {
    baseUrl?: string;
    secret?: string;
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
};

function configuration(options: EngineClientOptions) {
    const baseUrl = options.baseUrl ?? process.env.MATCHING_SERVICE_URL;
    const secret = options.secret ?? process.env.MATCHING_SERVICE_SECRET;
    if (!baseUrl || !secret) throw new Error("Matching service unavailable");
    const url = new URL(baseUrl);
    const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) throw new Error("Matching service requires HTTPS");
    return { url, secret };
}

export async function rank(viewer: EnginePerson, candidates: EnginePerson[], options: EngineClientOptions = {}): Promise<Score[]> {
    if (candidates.length > MAX_CANDIDATES_PER_REQUEST) throw new Error("Matching batch exceeds service limit");
    const { url, secret } = configuration(options);
    const payload = JSON.stringify({ viewer, candidates });
    if (Buffer.byteLength(payload) > MAX_PAYLOAD_BYTES) throw new Error("Matching payload exceeds service limit");
    const fetchImplementation = options.fetchImplementation ?? fetch;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await fetchImplementation(new URL("/v1/rank", url), {
                method: "POST",
                headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
                body: payload,
                signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
                cache: "no-store",
            });
            if (!response.ok) {
                if (response.status < 500) throw new EngineContractError("Matching service rejected the request");
                throw new Error("Matching service unavailable");
            }
            const data = z.object({ results: z.array(scoreSchema) }).strict().parse(await response.json());
            if (data.results.length !== candidates.length || new Set(data.results.map((result) => result.candidateId)).size !== candidates.length) {
                throw new EngineContractError("Invalid engine response");
            }
            for (const result of data.results) {
                const candidate = candidates.find((item) => item.id === result.candidateId);
                if (!candidate
                    || result.viewerRevision !== viewer.revision
                    || result.candidateRevision !== candidate.revision
                    || result.algorithmVersion !== ALGORITHM) {
                    throw new EngineContractError("Invalid engine response");
                }
            }
            return data.results;
        } catch (error) {
            if (error instanceof EngineContractError || attempt === 1) throw error;
        }
    }
    throw new Error("Matching service unavailable");
}

export async function health(options: EngineClientOptions = {}) {
    const { url, secret } = configuration(options);
    const response = await (options.fetchImplementation ?? fetch)(new URL("/health", url), {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
        cache: "no-store",
    });
    if (!response.ok) throw new Error("Matching service unavailable");
    return z.object({ status: z.literal("ok"), algorithmVersion: z.literal(ALGORITHM) }).strict().parse(await response.json());
}

class EngineContractError extends Error {}
