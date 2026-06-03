const DEFAULT_PROVIDER = "clip";
const DEFAULT_MODEL = "ViT-B/32";

export interface PhotoEmbeddingResponse {
    embedding: number[];
    provider: string;
    model: string;
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

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
            photo_url: input.photoUrl,
            object_key: input.objectKey,
        }),
        signal: AbortSignal.timeout(Number(process.env.PHOTO_INTELLIGENCE_TIMEOUT_MS ?? 15000)),
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
