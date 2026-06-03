/**
 * Backfill profile photo analysis + embeddings for users with photos.
 *
 * Requires .env.local with DATABASE_URL, PHOTO_INTELLIGENCE_SERVICE_URL,
 * PHOTO_INTELLIGENCE_SERVICE_SECRET, and AWS/R2 vars used by photo analysis.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-photo-embeddings.ts
 *   npx tsx src/scripts/backfill-photo-embeddings.ts --limit 10 --offset 0
 *   npx tsx src/scripts/backfill-photo-embeddings.ts --all
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local before any service import (static imports run first otherwise).
config({ path: resolve(process.cwd(), ".env.local") });

function readArg(name: string) {
    const index = process.argv.indexOf(name);
    if (index === -1) {
        return undefined;
    }

    const value = process.argv[index + 1];
    return value && !value.startsWith("--") ? value : undefined;
}

async function main() {
    const { backfillPhotoEmbeddings } = await import("@/lib/services/photo-intelligence-service");

    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error("DATABASE_URL is missing from .env.local (check for a leading space on the key).");
    }

    if (!process.env.PHOTO_INTELLIGENCE_SERVICE_URL?.trim()) {
        throw new Error("PHOTO_INTELLIGENCE_SERVICE_URL is missing from .env.local");
    }

    if (!process.env.PHOTO_INTELLIGENCE_SERVICE_SECRET?.trim()) {
        throw new Error(
            "PHOTO_INTELLIGENCE_SERVICE_SECRET is empty in .env.local. Copy the exact value from Railway → your service → Variables.",
        );
    }

    const runAll = process.argv.includes("--all");
    const limit = Number(readArg("--limit") ?? 25);
    const startOffset = Number(readArg("--offset") ?? 0);
    const userId = readArg("--user-id");
    const onlyMissingEmbeddings = process.argv.includes("--only-missing");

    let offset = startOffset;
    let totalProcessed = 0;
    let totalEmbeddings = 0;

    do {
        const result = await backfillPhotoEmbeddings({
            limit,
            offset,
            userId,
            onlyMissingEmbeddings,
        });

        totalProcessed += result.processed;
        totalEmbeddings += result.embeddingsCreated;

        console.log(
            JSON.stringify(
                {
                    offset,
                    processed: result.processed,
                    succeeded: result.succeeded,
                    failed: result.failed,
                    embeddingsCreated: result.embeddingsCreated,
                    nextOffset: result.nextOffset,
                    totalCandidates: result.totalCandidates,
                },
                null,
                2,
            ),
        );

        if (result.failed > 0) {
            console.error(
                "Failures:",
                result.results.filter((row) => row.status === "error"),
            );
        }

        offset = result.nextOffset ?? offset + result.processed;
        if (!runAll || result.nextOffset === null) {
            break;
        }
    } while (true);

    console.log(`Done. usersProcessed=${totalProcessed} embeddingsCreated=${totalEmbeddings}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
