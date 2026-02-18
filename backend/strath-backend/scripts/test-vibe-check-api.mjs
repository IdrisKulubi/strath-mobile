#!/usr/bin/env node
/**
 * test-vibe-check-api.mjs
 *
 * End-to-end test for all 5 Vibe Check API routes against a
 * RUNNING local or deployed backend.
 *
 * Prerequisites:
 *   1. Backend is running  →  npx next dev  (or deployed)
 *   2. You have a valid Bearer token for TWO users
 *      (get them from the Strathspace login flow)
 *   3. You have a valid matchId between those two users
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   TOKEN_A=<bearer_token_user_A> \
 *   TOKEN_B=<bearer_token_user_B> \
 *   MATCH_ID=<match_id> \
 *   node scripts/test-vibe-check-api.mjs
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TOKEN_A = process.env.TOKEN_A;
const TOKEN_B = process.env.TOKEN_B;
const MATCH_ID = process.env.MATCH_ID;

// ─── helpers ──────────────────────────────────────────────────────────────

function header(label) {
    console.log(`\n${"─".repeat(55)}`);
    console.log(`  ${label}`);
    console.log(`${"─".repeat(55)}`);
}
function ok(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  FAIL: ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }
function dump(obj) { console.log("      " + JSON.stringify(obj, null, 2).replace(/\n/g, "\n      ")); }

async function api(method, path, token, body) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
}

function assert(condition, msg) {
    if (!condition) { fail(msg); process.exit(1); }
}

// ─── Pre-flight checks ─────────────────────────────────────────────────────

header("0 / 6  Pre-flight checks");

if (!TOKEN_A || !TOKEN_B) {
    fail("TOKEN_A and TOKEN_B must be set. Get them from the app's login flow.");
    console.log("\n  How to get tokens:");
    console.log("    1. Open the Strathspace app on your phone/simulator");
    console.log("    2. Log in as User A → copy the token from SecureStore or network tab");
    console.log("    3. Log in as User B on another device/simulator → copy token");
    console.log("    4. Use a matchId that exists between both users\n");
    process.exit(1);
}
if (!MATCH_ID) {
    fail("MATCH_ID must be set. Use a real matched pair from your DB.");
    process.exit(1);
}

ok(`Base URL:  ${BASE}`);
ok(`TOKEN_A:   ${TOKEN_A.slice(0, 10)}…`);
ok(`TOKEN_B:   ${TOKEN_B.slice(0, 10)}…`);
ok(`Match ID:  ${MATCH_ID}`);

// ─── Step 1: GET status (should be empty) ─────────────────────────────────

header("1 / 6  GET /api/vibe-check?matchId=<id>  (User A)");

const status1 = await api("GET", `/api/vibe-check?matchId=${MATCH_ID}`, TOKEN_A);
assert(status1.ok, `Status check failed (HTTP ${status1.status}): ${JSON.stringify(status1.data)}`);
info("Status response:"); dump(status1.data);
ok(`exists = ${status1.data?.data?.exists ?? status1.data?.exists}`);

// ─── Step 2: POST — create session (User A) ────────────────────────────────

header("2 / 6  POST /api/vibe-check  (User A creates session)");

const create = await api("POST", "/api/vibe-check", TOKEN_A, { matchId: MATCH_ID });
assert(create.ok, `Create failed (HTTP ${create.status}): ${JSON.stringify(create.data)}`);

const session = create.data?.data ?? create.data;
assert(session?.id, "Response missing session id");
assert(session?.roomUrl, "Response missing roomUrl");
assert(session?.token, "Response missing token for User A");
assert(session?.suggestedTopic, "Response missing suggestedTopic");

ok(`Vibe Check ID:   ${session.id}`);
ok(`Room URL:        ${session.roomUrl}`);
ok(`Topic:           ${session.suggestedTopic}`);
info(`Token A (first 20): ${session.token.slice(0, 20)}…`);

const VIBE_ID = session.id;

// ─── Step 3: POST /join — User B gets their token ─────────────────────────

header("3 / 6  POST /api/vibe-check/:id/join  (User B joins)");

const join = await api("POST", `/api/vibe-check/${VIBE_ID}/join`, TOKEN_B);
assert(join.ok, `Join failed (HTTP ${join.status}): ${JSON.stringify(join.data)}`);

const joinedSession = join.data?.data ?? join.data;
assert(joinedSession?.token, "Join response missing token for User B");

ok(`Token B (first 20): ${joinedSession.token.slice(0, 20)}…`);
ok("Both participants now have tokens — call can proceed");

// ─── Step 4: POST /decision — User A decides ──────────────────────────────

header("4 / 6  POST /api/vibe-check/:id/decision  (User A → meet)");

const decA = await api("POST", `/api/vibe-check/${VIBE_ID}/decision`, TOKEN_A, { decision: "meet" });
assert(decA.ok, `Decision A failed (HTTP ${decA.status}): ${JSON.stringify(decA.data)}`);
const decAData = decA.data?.data ?? decA.data;
ok(`User A decision recorded: ${decAData?.decision}`);
info(`Both decided? ${decAData?.bothDecided}   Mutual agree? ${decAData?.bothAgreedToMeet}`);

// ─── Step 5: GET /result — User A polls while B hasn't decided ────────────

header("5 / 6  GET /api/vibe-check/:id/result  (User A polls — B hasn't decided yet)");

const poll1 = await api("GET", `/api/vibe-check/${VIBE_ID}/result`, TOKEN_A);
assert(poll1.ok, `Result poll failed (HTTP ${poll1.status}): ${JSON.stringify(poll1.data)}`);
const pollData = poll1.data?.data ?? poll1.data;
info("Poll result:"); dump(pollData);
assert(pollData?.userDecision === "meet", "User A decision not reflected in result");
assert(!pollData?.bothDecided, "Should NOT show bothDecided before B votes");
ok("Polling works correctly — waiting state correct");

// ─── Step 6: User B decides → mutual agree ────────────────────────────────

header("6 / 6  POST /api/vibe-check/:id/decision  (User B → meet → mutual agree!)");

const decB = await api("POST", `/api/vibe-check/${VIBE_ID}/decision`, TOKEN_B, { decision: "meet" });
assert(decB.ok, `Decision B failed (HTTP ${decB.status}): ${JSON.stringify(decB.data)}`);
const decBData = decB.data?.data ?? decB.data;
ok(`User B decision recorded: ${decBData?.decision}`);
assert(decBData?.bothDecided, "bothDecided should be true now");
assert(decBData?.bothAgreedToMeet, "bothAgreedToMeet should be true when both chose meet");
ok(`🎉 Mutual agree detected: bothAgreedToMeet = ${decBData?.bothAgreedToMeet}`);
ok(`Message: "${decBData?.message}"`);

// ─── Final poll to confirm result ─────────────────────────────────────────

const poll2 = await api("GET", `/api/vibe-check/${VIBE_ID}/result`, TOKEN_A);
const finalData = poll2.data?.data ?? poll2.data;
assert(finalData?.bothAgreedToMeet === true, "Final poll should show bothAgreedToMeet");
ok(`Final poll confirms: bothAgreedToMeet = ${finalData?.bothAgreedToMeet}`);

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(55)}`);
console.log("  🎉  All 6 API steps passed!");
console.log("      Vibe Check feature is working end-to-end.");
console.log(`${"═".repeat(55)}\n`);
console.log("  Next: test the mobile UI manually using the checklist:");
console.log("  → strath-mobile/docs/vibe-check-test-checklist.md\n");
