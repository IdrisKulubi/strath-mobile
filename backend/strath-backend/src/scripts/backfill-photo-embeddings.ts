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
 *   npx tsx src/scripts/backfill-photo-embeddings.ts --all --limit 20 --only-missing
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

if (process.env.PHOTO_INTELLIGENCE_PREFER_LOCAL_HASH === undefined) {
    process.env.PHOTO_INTELLIGENCE_PREFER_LOCAL_HASH = "true";
}

function readArg(name: string) {
    const index = process.argv.indexOf(name);
    if (index === -1) {
        return undefined;
    }

    const value = process.argv[index + 1];
    return value && !value.startsWith("--") ? value : undefined;
}

function logBatchResult(
    batchNumber: number,
    offset: number,
    result: {
        processed: number;
        succeeded: number;
        failed: number;
        embeddingsCreated: number;
        hasMore: boolean;
        nextOffset: number | null;
        totalCandidates: number;
        results: Array<{ status: string }>;
    },
) {
    console.log(
        JSON.stringify(
            {
                batch: batchNumber,
                offset,
                processed: result.processed,
                succeeded: result.succeeded,
                failed: result.failed,
                embeddingsCreated: result.embeddingsCreated,
                hasMore: result.hasMore,
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
}

async function main() {
    const { backfillPhotoEmbeddings, backfillAllPhotoEmbeddings } = await import(
        "@/lib/services/photo-intelligence-service"
    );

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

    const sharedOptions = {
        limit,
        userId,
        onlyMissingEmbeddings,
    };

    if (runAll) {
        const summary = await backfillAllPhotoEmbeddings({
            ...sharedOptions,
            offset: startOffset,
            onBatchComplete: (result, batchNumber, offset) => {
                logBatchResult(batchNumber, offset, result);
            },
        });

        console.log(
            `Done. batches=${summary.batches} usersProcessed=${summary.totalProcessed} embeddingsCreated=${summary.totalEmbeddings} failed=${summary.totalFailed}`,
        );
        return;
    }

    const result = await backfillPhotoEmbeddings({
        ...sharedOptions,
        offset: startOffset,
    });

    logBatchResult(1, startOffset, result);

    console.log(
        `Done. usersProcessed=${result.processed} embeddingsCreated=${result.embeddingsCreated}${result.hasMore ? ` (more remain — rerun with --offset ${result.nextOffset ?? startOffset + result.processed} or use --all)` : ""}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
