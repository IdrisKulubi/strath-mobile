import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, afterEach, test } from "node:test";
import { createTestDatabase, legacyTestSchema } from "./questionnaire/test-database";
import { setQuestionnaireDatabaseForTests, query } from "./questionnaire/db";
import { deliverPush, enqueuePush, pushTransport, sweepPushDeliveries } from "./push-delivery";
let close: () => Promise<void>;
const send = pushTransport.send;
const receipts = pushTransport.receipts;
beforeEach(async () => {
    const { database, pglite } = await createTestDatabase();
    close = () => pglite.close();
    setQuestionnaireDatabaseForTests(database);
    await database.query(legacyTestSchema);
    await database.query(readFileSync("drizzle/0041_push_delivery.sql", "utf8"));
});
afterEach(async () => {
    pushTransport.send = send; pushTransport.receipts = receipts;
    setQuestionnaireDatabaseForTests(undefined); await close();
});
const message = { to: 'ExponentPushToken[test]', body: 'A new connection', sound: 'default' as const };
test("accepted sends wait for receipts and concurrent sends use one lease", async () => {
    let sends = 0;
    pushTransport.send = async () => { sends++; return [{ status: 'ok', id: 'ticket-1' }]; };
    const queued = await enqueuePush(message);
    await Promise.all([deliverPush(queued.deliveryId), deliverPush(queued.deliveryId)]);
    assert.equal(sends, 1);
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'receipt');
    pushTransport.receipts = async () => ({ 'ticket-1': { status: 'ok' } });
    await query("UPDATE push_deliveries SET next_attempt_at = now() - interval '1 minute'");
    await sweepPushDeliveries();
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'delivered');
});
test("transport failures remain durable and a later sweep retries", async () => {
    pushTransport.send = async () => { throw new Error('offline'); };
    await enqueuePush(message);
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'pending');
    pushTransport.send = async () => [{ status: 'ok', id: 'retried' }];
    await query("UPDATE push_deliveries SET next_attempt_at = now() - interval '1 minute'");
    await sweepPushDeliveries();
    assert.equal((await query('SELECT attempts, status FROM push_deliveries'))[0].attempts, 2);
});
test("unregistered devices fail permanently and clear only the rejected token", async () => {
    await query('INSERT INTO "user"(id,name,email,push_token) VALUES($1,$1,$1,$2)', ['member', message.to]);
    pushTransport.send = async () => [{ status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }];
    await enqueuePush(message);
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'failed');
    assert.equal((await query('SELECT push_token FROM "user"'))[0].push_token, null);
});
test("receipt lookup failures never resend an accepted notification", async () => {
    let sends = 0;
    pushTransport.send = async () => { sends++; return [{ status: 'ok', id: 'ticket' }]; };
    await enqueuePush(message);
    pushTransport.receipts = async () => { throw new Error('offline'); };
    await query("UPDATE push_deliveries SET next_attempt_at = now() - interval '1 minute'");
    await sweepPushDeliveries();
    assert.equal(sends, 1);
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'receipt');
});

test("receipt rejection preserves a newly registered replacement token", async () => {
    await query('INSERT INTO "user"(id,name,email,push_token) VALUES($1,$1,$1,$2)', ['member', 'replacement-token']);
    pushTransport.send = async () => [{ status: 'ok', id: 'old-device' }];
    await enqueuePush(message);
    pushTransport.receipts = async () => ({ 'old-device': { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } } });
    await query("UPDATE push_deliveries SET next_attempt_at = now() - interval '1 minute'");
    await sweepPushDeliveries();
    assert.equal((await query('SELECT push_token FROM "user"'))[0].push_token, 'replacement-token');
    assert.equal((await query('SELECT status FROM push_deliveries'))[0].status, 'failed');
});
test("expired notifications stop retrying and migration can be safely reapplied", async () => {
    await query(readFileSync('drizzle/0041_push_delivery.sql', 'utf8'));
    pushTransport.send = async () => { throw new Error('offline'); };
    await enqueuePush(message);
    await query("UPDATE push_deliveries SET created_at = now() - interval '25 hours', next_attempt_at = now() - interval '1 minute'");
    await sweepPushDeliveries();
    assert.equal((await query('SELECT status, last_error FROM push_deliveries'))[0].last_error, 'Expired');
});
