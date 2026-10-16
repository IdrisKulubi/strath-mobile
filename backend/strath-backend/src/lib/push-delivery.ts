import { randomUUID } from "node:crypto";
import { Expo, type ExpoPushMessage, type ExpoPushTicket, type ExpoPushReceipt } from "expo-server-sdk";
import type { QueryResultRow } from "pg";
import { query } from "./questionnaire/db";

type Delivery = QueryResultRow & { id: string; push_token: string; payload: ExpoPushMessage; attempts: number; ticket_id: string | null; status: string };
const expo = new Expo();
export const pushTransport = {
    send: (messages: ExpoPushMessage[]) => expo.sendPushNotificationsAsync(messages),
    receipts: (ids: string[]) => expo.getPushNotificationReceiptsAsync(ids),
};

export async function enqueuePush(message: ExpoPushMessage) {
    const id = randomUUID();
    // Persist before contacting Expo. The worker can recover after process termination.
    await query(`INSERT INTO push_deliveries(id, push_token, payload) VALUES($1,$2,$3)`,
        [id, message.to, JSON.stringify(message)]);
    await deliverPush(id);
    return { queued: true, deliveryId: id };
}

async function failDelivery(row: Delivery, code: string) {
    const permanent = ['DeviceNotRegistered', 'MessageTooBig', 'InvalidCredentials'].includes(code);
    if (code === 'DeviceNotRegistered') {
        // Conditional update preserves a replacement token registered since this send.
        await query(`UPDATE "user" SET push_token = NULL WHERE push_token = $1`, [row.push_token]);
    }
    await query(`UPDATE push_deliveries SET status = $2, last_error = $3,
        next_attempt_at = now() + interval '5 minutes', updated_at = now() WHERE id = $1`,
        [row.id, permanent || row.attempts >= 5 ? 'failed' : 'pending', code]);
}

export async function deliverPush(id: string) {
    // Atomic lease prevents the request and concurrent cron runs sending the same row.
    const [row] = await query<Delivery>(`UPDATE push_deliveries SET status = 'sending',
        attempts = attempts + 1, next_attempt_at = now() + interval '5 minutes', updated_at = now()
        WHERE id = $1 AND status IN ('pending','sending') AND next_attempt_at <= now()
          AND attempts < 5 AND created_at > now() - interval '24 hours'
        RETURNING *`, [id]);
    if (!row) return;
    let ticket: ExpoPushTicket | undefined;
    try {
        [ticket] = await pushTransport.send([row.payload]);
    } catch {
        await failDelivery(row, 'TransportError');
        return;
    }
    if (ticket?.status === 'ok') {
        await query(`UPDATE push_deliveries SET status = 'receipt', ticket_id = $2,
            next_attempt_at = now() + interval '15 minutes', updated_at = now() WHERE id = $1`, [id, ticket.id]);
    } else {
        await failDelivery(row, ticket?.details?.error ?? 'MissingTicket');
    }
}

export async function sweepPushDeliveries() {
    await query(`UPDATE push_deliveries SET status = 'failed', last_error = 'Expired', updated_at = now()
        WHERE status IN ('pending','sending','receipt') AND (created_at <= now() - interval '24 hours' OR
        (status IN ('pending','sending') AND attempts >= 5 AND next_attempt_at <= now()))`);
    const rows = await query<Delivery>(`SELECT * FROM push_deliveries
        WHERE status IN ('pending','sending','receipt') AND next_attempt_at <= now()
        ORDER BY next_attempt_at LIMIT 100`);
    for (const row of rows) {
        if (row.status !== 'receipt') { await deliverPush(row.id); continue; }
        if (!row.ticket_id) continue;
        const claimed = await query(`UPDATE push_deliveries SET next_attempt_at = now() + interval '5 minutes'
            WHERE id = $1 AND status = 'receipt' AND next_attempt_at <= now() RETURNING id`, [row.id]);
        if (!claimed.length) continue;
        let receipt: ExpoPushReceipt | undefined;
        try { receipt = (await pushTransport.receipts([row.ticket_id]))[row.ticket_id]; }
        catch { continue; } // Keep the accepted ticket; do not resend on a receipt lookup failure.
        if (receipt?.status === 'ok') {
            await query(`UPDATE push_deliveries SET status = 'delivered', updated_at = now() WHERE id = $1 AND status = 'receipt'`, [row.id]);
        } else if (receipt?.status === 'error') {
            await failDelivery(row, receipt.details?.error ?? 'ReceiptError');
        } else {
            await query(`UPDATE push_deliveries SET next_attempt_at = now() + interval '15 minutes' WHERE id = $1`, [row.id]);
        }
    }
    // Retain short-lived diagnostics without retaining push payloads indefinitely.
    await query(`DELETE FROM push_deliveries WHERE created_at < now() - interval '7 days'`);
    return { inspected: rows.length };
}
