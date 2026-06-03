const DEFAULT_PROVIDER = "clip";
const DEFAULT_MODEL = "ViT-B/32";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 2_000;

export interface PhotoEmbeddingResponse {
    embedding: number[];
    provider: string;
    model: string;
}

function getTimeoutMs() {
    const value = Number(process.env.PHOTO_INTELLIGENCE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    return Number.isFinite(value) && value >= 5_000 ? value : DEFAULT_TIMEOUT_MS;
}

function getMaxAttempts() {
    const value = Number(process.env.PHOTO_INTELLIGENCE_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
    return Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 5) : DEFAULT_MAX_ATTEMPTS;
}

function getRetryDelayMs() {
    const value = Number(process.env.PHOTO_INTELLIGENCE_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_RETRY_DELAY_MS;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableEmbeddingError(error: unknown) {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (error.name === "TimeoutError" || message.includes("timeout") || message.includes("aborted")) {
            return true;
        }
        if (message.includes("(502)") || message.includes("(503)") || message.includes("(504)")) {
            return true;
        }
    }
    return false;
}

async function fetchEmbeddingOnce(input: {
    photoUrl: string;
    objectKey: string;
    baseUrl: string;
    secret: string;
}) {
    const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/embed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.secret}`,
        },
        body: JSON.stringify({
            photo_url: input.photoUrl,
            object_key: input.objectKey,
        }),
        signal: AbortSignal.timeout(getTimeoutMs()),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Photo embedding service failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
        embedding?: number[];
        provider?: string;
        model?: string;
    };

    if (!Array.isArray(payload.embedding) || payload.embedding.length === 0) {
        throw new Error("Photo embedding service returned an empty embedding.");
    }

    return {
        embedding: payload.embedding,
        provider: payload.provider ?? DEFAULT_PROVIDER,
        model: payload.model ?? DEFAULT_MODEL,
    };
}

export async function requestPhotoEmbedding(input: {
    photoUrl: string;
    objectKey: string;
}): Promise<PhotoEmbeddingResponse | null> {
    const baseUrl = process.env.PHOTO_INTELLIGENCE_SERVICE_URL?.trim();
    const secret = process.env.PHOTO_INTELLIGENCE_SERVICE_SECRET?.trim();

    if (!baseUrl) {
        return null;
    }

    if (!secret) {
        throw new Error(
            "PHOTO_INTELLIGENCE_SERVICE_SECRET is required when PHOTO_INTELLIGENCE_SERVICE_URL is set. Use the same value as on Railway.",
        );
    }

    const maxAttempts = getMaxAttempts();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fetchEmbeddingOnce({
                photoUrl: input.photoUrl,
                objectKey: input.objectKey,
                baseUrl,
                secret,
            });
        } catch (error) {
            lastError = error;
            const shouldRetry = attempt < maxAttempts && isRetryableEmbeddingError(error);
            if (!shouldRetry) {
                throw error;
            }

            const delayMs = getRetryDelayMs() * attempt;
            console.warn(
                `[photo-embedding] attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms`,
                error instanceof Error ? error.message : error,
            );
            await sleep(delayMs);
        }
    }

    throw lastError instanceof Error ? lastError : new Error("Photo embedding request failed.");
}
