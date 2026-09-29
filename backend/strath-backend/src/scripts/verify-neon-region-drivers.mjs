import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { neon, Pool } from '@neondatabase/serverless';
import { databaseEntries } from './migrate-neon-region.mjs';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = resolve(process.env.MIGRATION_DIR || resolve(backend, '../../../outputs/neon-region-migration-20260929'));
const entries = databaseEntries(readFileSync(resolve(backend, '.env.local'), 'utf8'));
const connection = entries.find(entry => new URL(entry.value).hostname.includes('ep-curly-sunset-b5zkat1y'))?.value;
if (!connection) throw new Error('AWS target connection is missing');
const url = new URL(connection);
url.hostname = url.hostname.replace('-pooler', '');
const pgUrl = new URL(url);
pgUrl.searchParams.delete('sslmode');
pgUrl.searchParams.delete('channel_binding');
const client = new Client({ connectionString: pgUrl.toString(), ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15_000 });
const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 15_000 });
const report = { checkedAt: new Date().toISOString(), passed: false };
try {
    await client.connect();
    const probe = "SELECT current_setting('server_version') AS version, current_setting('default_transaction_read_only') AS read_only, (SELECT count(*)::text FROM public.\"user\") AS users";
    report.pg = (await client.query(probe)).rows[0];
    report.neonHttp = (await neon(url.toString()).query(probe, []))[0];
    report.neonPool = (await pool.query(probe)).rows[0];
    for (const result of [report.pg, report.neonHttp, report.neonPool]) {
        if (!result.version.startsWith('18.')) throw new Error('Driver did not reach PostgreSQL 18');
        if (result.read_only !== 'off') throw new Error('AWS target must be writable before cutover');
        if (result.users !== report.pg.users) throw new Error('Database driver results differ');
    }
    report.vector = (await client.query(`SELECT count(*)::text AS tested, bool_and(distance=0) AS self_distance_zero
        FROM (SELECT embedding <-> embedding AS distance FROM public.profile_photo_embeddings WHERE embedding IS NOT NULL LIMIT 10) samples`)).rows[0];
    if (report.vector.tested === '0' || !report.vector.self_distance_zero) throw new Error('Restored pgvector operator check failed');
    // A temporary, rolled-back write tests PostgreSQL 18 write support without altering user data or consuming application sequences.
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE migration_write_probe (id integer PRIMARY KEY, value text) ON COMMIT DROP');
    await client.query("INSERT INTO migration_write_probe VALUES (1, 'aws-write-ok')");
    const write = (await client.query('SELECT value FROM migration_write_probe WHERE id=1')).rows[0];
    await client.query('ROLLBACK');
    if (write?.value !== 'aws-write-ok') throw new Error('Transactional write/read failed');
    report.transactionalWrite = 'passed (rolled back)';
    report.passed = true;
    console.log(JSON.stringify(report, null, 2));
} catch (error) {
    console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted connection]'));
    process.exitCode = 1;
} finally {
    await client.end();
    await pool.end();
    writeFileSync(resolve(artifacts, 'driver-smoke.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
}
