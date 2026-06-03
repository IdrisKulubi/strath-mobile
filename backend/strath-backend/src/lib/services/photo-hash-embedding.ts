import { createHash } from "crypto";

import type { PhotoEmbeddingResponse } from "@/lib/services/photo-embedding-client";

/** Must match services/photo-intelligence-worker/main.py (_hash_embedding). */
const EMBEDDING_DIM = 768;
export const HASH_EMBEDDING_PROVIDER = "clip-hash";
export const HASH_EMBEDDING_MODEL = "hash-v1";

export function computeHashPhotoEmbedding(imageBytes: Buffer | Uint8Array): PhotoEmbeddingResponse {
    let seed = createHash("sha256").update(imageBytes).digest();
    const values: number[] = [];

    while (values.length < EMBEDDING_DIM) {
        for (let index = 0; index < seed.length; index++) {
            values.push((seed[index]! / 255) * 2 - 1);
            if (values.length >= EMBEDDING_DIM) {
                break;
            }
        }
        seed = createHash("sha256").update(seed).digest();
    }

    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;

    return {
        embedding: values.map((value) => value / norm),
        provider: HASH_EMBEDDING_PROVIDER,
        model: HASH_EMBEDDING_MODEL,
    };
}
