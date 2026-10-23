/**
 * Print a local /payments URL for testing Phase 4.
 * Run: npx tsx src/scripts/print-payment-page-url.ts <dateMatchId> <userId>
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { signPaymentToken } from "@/lib/payments/payment-token";

const dateMatchId = process.argv[2];
const userId = process.argv[3];

if (!dateMatchId || !userId) {
    console.error("Usage: npx tsx src/scripts/print-payment-page-url.ts <dateMatchId> <userId>");
    process.exit(1);
}

const token = signPaymentToken({ dateMatchId, userId });
const base = process.env.WEB_PAYMENT_URL?.replace(/\/$/, "") || "http://localhost:3000/payments";
const url = `${base}?token=${encodeURIComponent(token)}`;

console.log(url);
