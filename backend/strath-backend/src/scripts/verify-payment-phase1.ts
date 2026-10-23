/**
 * Phase 1 verification — run: npx tsx src/scripts/verify-payment-phase1.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isFeatureEnabled, APP_FEATURE_KEYS } from "@/lib/feature-flags";

async function main() {
    const flagEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false);
    console.log("payments_enabled (isFeatureEnabled):", flagEnabled);

    const flagRow = await db.execute(sql`
        SELECT key, enabled FROM app_feature_flags WHERE key = 'payments_enabled'
    `);
    console.log("payments_enabled (db row):", flagRow.rows[0] ?? "(no row — fallback false is OK)");

    const tables = await db.execute(sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('date_payments', 'user_credits')
        ORDER BY table_name
    `);
    console.log("payment tables:", tables.rows.map((r) => (r as { table_name: string }).table_name));

    const paystackCol = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'date_payments' AND column_name = 'paystack_reference'
    `);
    console.log(
        "date_payments.paystack_reference:",
        paystackCol.rows.length > 0 ? "present" : "MISSING",
    );

    const expectedDateMatchCols = [
        "payment_state",
        "payment_due_by",
        "payment_amount_cents",
        "payment_currency",
        "paid_user_count",
    ];
    const cols = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'date_matches'
          AND column_name IN (
            'payment_state',
            'payment_due_by',
            'payment_amount_cents',
            'payment_currency',
            'paid_user_count'
          )
        ORDER BY column_name
    `);
    const foundCols = cols.rows.map((r) => (r as { column_name: string }).column_name);
    console.log("date_matches payment columns:", foundCols);

    const lowIntent = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'low_intent_score'
    `);
    console.log("user.low_intent_score:", lowIntent.rows.length > 0 ? "present" : "MISSING");

    if (flagEnabled !== false) {
        console.error("FAIL: expected payments_enabled false");
        process.exit(1);
    }
    if ((tables.rows as unknown[]).length < 2) {
        console.error("FAIL: missing date_payments or user_credits");
        process.exit(1);
    }
    const missingCols = expectedDateMatchCols.filter((c) => !foundCols.includes(c));
    if (missingCols.length > 0) {
        console.error("FAIL: missing date_matches columns:", missingCols.join(", "));
        process.exit(1);
    }
    if (lowIntent.rows.length === 0) {
        console.error("FAIL: low_intent_score missing on user");
        process.exit(1);
    }
    if (paystackCol.rows.length === 0) {
        console.error("FAIL: paystack_reference missing on date_payments");
        process.exit(1);
    }

    console.log("Phase 1 verification: OK");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
