#!/usr/bin/env node
/**
 * test-daily-connection.mjs
 *
 * Validates that your DAILY_API_KEY and DAILY_DOMAIN are correct
 * by creating a test room, then immediately deleting it.
 *
 * Usage (run from strath-backend/):
 *   DAILY_API_KEY=your_key DAILY_DOMAIN=strathspace.daily.co node scripts/test-daily-connection.mjs
 *
 * Or add the env vars to .env.local first and run via dotenv:
 *   node -r dotenv/config scripts/test-daily-connection.mjs dotenv_config_path=.env.local
 */

const API_KEY = process.env.DAILY_API_KEY;
const DOMAIN = process.env.DAILY_DOMAIN ?? "strathspace.daily.co";
const BASE = "https://api.daily.co/v1";

function header(label) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  ${label}`);
    console.log(`${"─".repeat(50)}`);
}

function ok(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }

async function apiCall(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            ...(options.headers ?? {}),
        },
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, ok: res.ok, body };
}

// ─── 1. Check env vars ─────────────────────────────────────────────────────

header("1 / 4  Checking environment variables");

if (!API_KEY) {
    fail("DAILY_API_KEY is not set. Export it or add it to .env.local.");
    process.exit(1);
}
ok(`DAILY_API_KEY found (${API_KEY.slice(0, 6)}…)`);
ok(`DAILY_DOMAIN = ${DOMAIN}`);

// ─── 2. Verify key with GET /rooms ─────────────────────────────────────────

header("2 / 4  Verifying API key with Daily.co");

const me = await apiCall("/rooms?limit=1");
if (!me.ok) {
    fail(`Auth failed (HTTP ${me.status}): ${JSON.stringify(me.body)}`);
    process.exit(1);
}
ok(`API key is valid — Daily.co responded with HTTP ${me.status}`);
info(`Existing rooms in account: ${me.body.total_count ?? "n/a"}`);

// ─── 3. Create a test room ─────────────────────────────────────────────────

header("3 / 4  Creating a test room");

const roomName = `test-vibe-check-${Date.now()}`;
const expiresAt = Math.floor(Date.now() / 1000) + 300;

const created = await apiCall("/rooms", {
    method: "POST",
    body: JSON.stringify({
        name: roomName,
        properties: {
            max_participants: 2,
            exp: expiresAt,
            enable_screenshare: false,
            enable_chat: false,
            start_video_off: true,
        },
    }),
});

if (!created.ok) {
    fail(`Room creation failed (HTTP ${created.status}): ${JSON.stringify(created.body)}`);
    process.exit(1);
}
ok(`Room created: ${created.body.name}`);
ok(`Room URL:     https://${DOMAIN}/${roomName}`);

// Also test meeting-token creation
const tokenRes = await apiCall("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
        properties: {
            room_name: roomName,
            exp: expiresAt,
            start_video_off: true,
        },
    }),
});
if (tokenRes.ok) {
    ok(`Meeting token created (${tokenRes.body.token.slice(0, 16)}…)`);
} else {
    fail(`Token creation failed: ${JSON.stringify(tokenRes.body)}`);
}

// ─── 4. Delete the test room ────────────────────────────────────────────────

header("4 / 4  Cleaning up test room");

const deleted = await apiCall(`/rooms/${roomName}`, { method: "DELETE" });
if (deleted.ok || deleted.status === 404) {
    ok("Test room deleted successfully");
} else {
    fail(`Room deletion returned HTTP ${deleted.status}`);
}

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log("  🎉  Daily.co is configured correctly!");
console.log(`      Rooms will live at: https://${DOMAIN}/<roomName>`);
console.log(`${"═".repeat(50)}\n`);
