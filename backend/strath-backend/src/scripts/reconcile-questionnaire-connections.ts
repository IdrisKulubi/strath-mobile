import { getPool, transaction } from "../lib/questionnaire/db";
import { reconcileLegacyConnections } from "../lib/questionnaire/phase5-backfill";

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const apply = process.argv.includes("--apply");
    const report = await transaction((executor) => reconcileLegacyConnections(executor, apply));
    if (report.matchCountBefore !== report.matchCountAfter || report.messageCountBefore !== report.messageCountAfter) {
        throw new Error("Reconciliation changed legacy match or message counts");
    }
    console.info(apply ? "Questionnaire connection backfill applied." : "Dry run only; no connections were written.", report);
    await getPool().end();
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Connection reconciliation failed");
    process.exitCode = 1;
});
