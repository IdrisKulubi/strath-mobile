import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const { purgeUnverifiedFromMatchPools } = await import("@/lib/services/purge-unverified-pools-service");
    const { pool } = await import("@/db/drizzle");

    console.log("[purge-unverified-from-pools] starting…");

    const result = await purgeUnverifiedFromMatchPools();

    console.log("[purge-unverified-from-pools] done", result);

    await pool.end();
}

main().catch((error) => {
    console.error("[purge-unverified-from-pools] failed", error);
    process.exit(1);
});
