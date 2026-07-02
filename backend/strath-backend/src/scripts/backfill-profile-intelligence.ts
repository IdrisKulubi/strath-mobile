/**
 * Backfill cached profile intelligence for completed, visible profiles.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-profile-intelligence.ts --limit 10
 *   npx tsx src/scripts/backfill-profile-intelligence.ts --all --limit 25
 *   npx tsx src/scripts/backfill-profile-intelligence.ts --enqueue-only --only-stale
 *   npx tsx src/scripts/backfill-profile-intelligence.ts --user-id user_123
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

function readArg(name: string) {
    const index = process.argv.indexOf(name);
    if (index === -1) return undefined;
    const value = process.argv[index + 1];
    return value && !value.startsWith("--") ? value : undefined;
}

function logBatchResult(
    batchNumber: number,
    offset: number,
    result: {
        totalCandidates: number;
        processed: number;
        succeeded: number;
        failed: number;
        queued: number;
        hasMore: boolean;
        nextOffset: number | null;
        results: Array<{ status: string }>;
    },
) {
    console.log(
        JSON.stringify(
            {
                batch: batchNumber,
                offset,
                totalCandidates: result.totalCandidates,
                processed: result.processed,
                succeeded: result.succeeded,
                failed: result.failed,
                queued: result.queued,
                hasMore: result.hasMore,
                nextOffset: result.nextOffset,
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
    const {
        backfillAllProfileIntelligence,
        backfillProfileIntelligence,
    } = await import("@/lib/services/profile-intelligence-service");

    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error("DATABASE_URL is missing from .env.local.");
    }

    const runAll = process.argv.includes("--all");
    const enqueueOnly = process.argv.includes("--enqueue-only");
    const includePaused = process.argv.includes("--include-paused");
    const onlyStale = process.argv.includes("--only-stale");
    const limit = Number(readArg("--limit") ?? 25);
    const startOffset = Number(readArg("--offset") ?? 0);
    const staleAfterDays = Number(readArg("--stale-after-days") ?? 7);
    const userId = readArg("--user-id");

    const sharedOptions = {
        limit,
        userId,
        enqueueOnly,
        includePaused,
        onlyStale,
        staleAfterDays,
    };

    if (runAll) {
        const summary = await backfillAllProfileIntelligence({
            ...sharedOptions,
            offset: startOffset,
            onBatchComplete: (result, batchNumber, offset) => {
                logBatchResult(batchNumber, offset, result);
            },
        });

        console.log(
            `Done. batches=${summary.batches} processed=${summary.totalProcessed} succeeded=${summary.totalSucceeded} queued=${summary.totalQueued} failed=${summary.totalFailed}`,
        );
        return;
    }

    const result = await backfillProfileIntelligence({
        ...sharedOptions,
        offset: startOffset,
    });

    logBatchResult(1, startOffset, result);
    console.log(
        `Done. processed=${result.processed} succeeded=${result.succeeded} queued=${result.queued} failed=${result.failed}${result.hasMore ? ` (more remain, rerun with --offset ${result.nextOffset ?? startOffset + result.processed} or use --all)` : ""}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
