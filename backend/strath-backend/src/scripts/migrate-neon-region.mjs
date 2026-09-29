import { Client } from 'pg';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = resolve(process.env.MIGRATION_DIR || resolve(backend, '../../../outputs/neon-region-migration-20260929'));
const envPath = resolve(backend, '.env.local');
const sourceHost = 'ep-odd-fire-a8ufuyzq.eastus2.azure.neon.tech';
const targetHost = 'ep-curly-sunset-b5zkat1y.c-7.us-east-2.aws.neon.tech';
const q = value => '"' + value.replaceAll('"', '""') + '"';
const qualified = (schema, name) => `${q(schema)}.${q(name)}`;
const save = (name, value) => writeFileSync(resolve(artifacts, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });

export function databaseEntries(text) {
    return text.split(/\r?\n/).flatMap(line => {
        const match = line.match(/^\s*(DATABASE_URL(?:_POOLED)?)\s*=\s*(.*)$/);
        if (!match) return [];
        let value = match[2].trim();
        if (value.startsWith('"') || value.startsWith("'")) {
            const quote = value[0];
            const end = value.indexOf(quote, 1);
            if (end < 0) throw new Error('Unclosed database connection quote');
            value = value.slice(1, end);
        } else value = value.replace(/\s+#.*$/, '');
        return [{ key: match[1], value }];
    });
}

export function replaceConnections(text, direct, pooled) {
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.split(/\r?\n/).filter(line => !/^\s*DATABASE_URL(?:_POOLED)?\s*=/.test(line));
    while (lines.at(-1) === '') lines.pop();
    return lines.join(newline) + newline + `DATABASE_URL="${direct}"${newline}DATABASE_URL_POOLED="${pooled}"${newline}`;
}

function connections() {
    const backup = resolve(artifacts, '.env.before-cutover');
    const entries = databaseEntries(readFileSync(envPath, 'utf8'));
    if (existsSync(backup)) entries.push(...databaseEntries(readFileSync(backup, 'utf8')));
    const find = (override, host) => {
        const raw = override || entries.find(entry => new URL(entry.value).hostname.replace('-pooler', '') === host)?.value;
        if (!raw) throw new Error(`Missing connection for ${host}`);
        const url = new URL(raw);
        url.hostname = url.hostname.replace('-pooler', '');
        if (url.hostname !== host) throw new Error(`Unexpected migration endpoint: ${url.hostname}`);
        if (url.pathname !== '/neondb') throw new Error('Migration must use neondb');
        return url;
    };
    return { source: find(process.env.MIGRATION_SOURCE_URL, sourceHost), target: find(process.env.MIGRATION_TARGET_URL, targetHost) };
}

async function connect(url) {
    const normalized = new URL(url);
    normalized.searchParams.delete('sslmode');
    normalized.searchParams.delete('channel_binding');
    const client = new Client({ connectionString: normalized.toString(), ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15_000, application_name: 'strathspace-region-migration' });
    await client.connect();
    return client;
}

async function metadata(client) {
    return (await client.query(`SELECT current_database() AS database, current_user AS owner,
        current_setting('server_version') AS version, pg_database_size(current_database())::text AS bytes,
        (SELECT jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) ORDER BY extname) FROM pg_extension) AS extensions,
        (SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema') AS schemas,
        (SELECT jsonb_agg(jsonb_build_object('name', name, 'version', default_version)) FROM pg_available_extensions WHERE name='vector') AS available_vector`)).rows[0];
}

async function tables(client) {
    return (await client.query(`SELECT n.nspname AS schema, c.relname AS name FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
        WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY n.nspname, c.relname`)).rows;
}

async function snapshot(client) {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
        await client.query("SET LOCAL TIME ZONE 'UTC'");
        await client.query("SET LOCAL extra_float_digits = 3");
        const result = { metadata: await metadata(client), tables: [], sequences: [] };
        for (const table of await tables(client)) {
            const name = qualified(table.schema, table.name);
            const fingerprint = (await client.query(`SELECT count(*)::text AS rows,
                encode(sha256(convert_to(COALESCE(string_agg(h, '' ORDER BY h COLLATE "C"), ''), 'UTF8')), 'hex') AS sha256
                FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text, 'UTF8')), 'hex') AS h FROM ${name} t) rows`)).rows[0];
            result.tables.push({ ...table, ...fingerprint });
            console.log(`Verified ${table.schema}.${table.name}: ${fingerprint.rows} rows`);
        }
        const seqs = (await client.query(`SELECT n.nspname AS schema, c.relname AS name FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
            WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg_%' ORDER BY n.nspname,c.relname`)).rows;
        for (const sequence of seqs) result.sequences.push({ ...sequence, ...(await client.query(`SELECT last_value::text, is_called FROM ${qualified(sequence.schema, sequence.name)}`)).rows[0] });
        result.columns = (await client.query(`SELECT n.nspname AS schema,c.relname AS table,a.attname AS name,a.attnum,
            format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default
            FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
            WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p') AND n.nspname IN ('public','drizzle') ORDER BY n.nspname,c.relname,a.attnum`)).rows;
        result.constraints = (await client.query(`SELECT n.nspname AS schema,c.relname AS table,k.conname AS name,k.convalidated,pg_get_constraintdef(k.oid) AS definition
            FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname IN ('public','drizzle') ORDER BY n.nspname,c.relname,k.conname`)).rows;
        result.indexes = (await client.query(`SELECT n.nspname AS schema,c.relname AS table,i.relname AS name,x.indisvalid,x.indisready,pg_get_indexdef(i.oid) AS definition
            FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname IN ('public','drizzle') ORDER BY n.nspname,c.relname,i.relname`)).rows;
        result.grants = (await client.query(`SELECT table_schema,table_name,grantee,privilege_type,is_grantable FROM information_schema.table_privileges
            WHERE table_schema IN ('public','drizzle') ORDER BY table_schema,table_name,grantee,privilege_type`)).rows;
        result.schemaGrants = (await client.query(`SELECT n.nspname AS schema,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
            FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
            WHERE n.nspname IN ('public','drizzle') ORDER BY n.nspname,a.grantee,a.privilege_type`)).rows;
        await client.query('COMMIT');
        return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
}

export function compareSnapshots(source, target) {
    const differences = [];
    for (const key of ['tables','sequences','columns','constraints','indexes','grants','schemaGrants']) {
        // PG18 records NOT NULL in pg_constraint; PG17 records it only in
        // pg_attribute. Column attnotnull remains compared independently.
        const normalize = rows => key === 'constraints'
            ? rows.filter(row => !(row.convalidated && row.definition.startsWith('NOT NULL ')))
            : rows;
        if (JSON.stringify(normalize(source[key])) !== JSON.stringify(normalize(target[key]))) differences.push(key);
    }
    if (JSON.stringify(source.metadata.schemas) !== JSON.stringify(target.metadata.schemas)) differences.push('schemas');
    const extensionNames = value => value.metadata.extensions.map(extension => extension.name).sort();
    if (JSON.stringify(extensionNames(source)) !== JSON.stringify(extensionNames(target))) differences.push('extensions');
    return differences;
}

function pgTool(name, url, args, logfile) {
    const bin = resolve(process.env.PG_BIN || resolve(artifacts, 'tools/pgsql/bin'), `${name}.exe`);
    if (!existsSync(bin)) throw new Error(`Missing PostgreSQL client: ${bin}`);
    // Credentials go through the child environment, never command arguments or logs.
    const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: 'require', PGCHANNELBINDING: 'require', PGCONNECT_TIMEOUT: '15', PGAPPNAME: 'strathspace-region-migration' };
    const run = spawnSync(bin, args, { env, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const log = (run.stdout || '') + (run.stderr || '');
    writeFileSync(resolve(artifacts, logfile), log, { mode: 0o600 });
    if (run.error || run.status !== 0) throw new Error(`${name} failed; inspect ${logfile}`);
    return log;
}

async function preflight(source, target, allowMigrationCopy = false) {
    const sourceMeta = await metadata(source);
    const targetMeta = await metadata(target);
    if (sourceMeta.version.split('.')[0] !== '17' || targetMeta.version.split('.')[0] !== '18') throw new Error('Unexpected PostgreSQL versions');
    if (!allowMigrationCopy && (await tables(target)).length) throw new Error('Target is not empty; refusing to overwrite it');
    if (!targetMeta.available_vector?.length) throw new Error('Target does not support pgvector');
    const grants = (await source.query(`SELECT DISTINCT grantee FROM information_schema.table_privileges WHERE table_schema IN ('public','drizzle') AND grantee <> current_user`)).rows;
    if (grants.length) throw new Error('Additional application grants require review before restoring');
    const active = (await source.query(`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid <> pg_backend_pid() AND state='active'`)).rows[0].count;
    if (active) throw new Error(`Source has ${active} other active queries; drain writers first`);
    const result = { checkedAt: new Date().toISOString(), source: sourceMeta, target: targetMeta, extraTableGrants: grants, otherActiveQueries: active };
    save('preflight.json', result);
    console.log(JSON.stringify(result, null, 2));
}

async function verify(source, target) {
    const before = JSON.parse(readFileSync(resolve(artifacts, 'source.snapshot.json'), 'utf8'));
    const currentSource = await snapshot(source);
    const restored = await snapshot(target);
    save('source.final.snapshot.json', currentSource);
    save('target.snapshot.json', restored);
    const sourceDrift = compareSnapshots(before, currentSource);
    const differences = compareSnapshots(before, restored);
    const report = { checkedAt: new Date().toISOString(), sourceDrift, differences, passed: !sourceDrift.length && !differences.length, tables: restored.tables.length, sequences: restored.sequences.length, sourceVersion: before.metadata.version, targetVersion: restored.metadata.version, targetExtensions: restored.metadata.extensions };
    save('verification.json', report);
    if (!report.passed) throw new Error(`Verification failed: source drift [${sourceDrift}], target differences [${differences}]`);
    console.log(JSON.stringify(report, null, 2));
}

async function main() {
    const command = process.argv[2];
    if (!['preflight','migrate','refresh','verify','cutover-local'].includes(command)) throw new Error('Usage: node src/scripts/migrate-neon-region.mjs preflight|migrate|refresh|verify|cutover-local [--maintenance-confirmed]');
    mkdirSync(artifacts, { recursive: true, mode: 0o700 });
    const urls = connections();
    if (command === 'cutover-local') {
        const report = JSON.parse(readFileSync(resolve(artifacts, 'verification.json'), 'utf8'));
        if (!report.passed) throw new Error('Successful verification required before local cutover');
        const smoke = JSON.parse(readFileSync(resolve(artifacts, 'driver-smoke.json'), 'utf8'));
        if (!smoke.passed) throw new Error('Successful driver smoke checks required before local cutover');
        const original = readFileSync(envPath, 'utf8');
        const backup = resolve(artifacts, '.env.before-cutover');
        if (!existsSync(backup)) writeFileSync(backup, original, { mode: 0o600, flag: 'wx' });
        const pooled = new URL(urls.target); pooled.hostname = targetHost.replace('ep-curly-sunset-b5zkat1y', 'ep-curly-sunset-b5zkat1y-pooler');
        writeFileSync(envPath, replaceConnections(original, urls.target.toString(), pooled.toString()));
        save('local-cutover.json', { changedAt: new Date().toISOString(), directHost: targetHost, pooledHost: pooled.hostname });
        console.log('Local connections updated; unrelated environment values preserved.');
        return;
    }
    const source = await connect(urls.source);
    let target;
    try {
        target = await connect(urls.target);
        if (command === 'preflight') await preflight(source, target);
        if (command === 'verify') await verify(source, target);
        if (command === 'migrate' || command === 'refresh') {
            if (!process.argv.includes('--maintenance-confirmed')) throw new Error('Migration requires an explicit confirmed maintenance pause');
            const archive = resolve(artifacts, 'source.dump');
            if (command === 'refresh') {
                // Only replace our own unchanged restore. New AWS writes must never be discarded.
                const previousTarget = JSON.parse(readFileSync(resolve(artifacts, 'target.snapshot.json'), 'utf8'));
                const targetChanges = compareSnapshots(previousTarget, await snapshot(target));
                if (targetChanges.length) throw new Error(`AWS copy has changed [${targetChanges}]; refusing replacement`);
                const previous = resolve(artifacts, `attempt-${Date.now()}`);
                mkdirSync(previous, { mode: 0o700 });
                for (const name of ['source.dump','source.snapshot.json','source.final.snapshot.json','target.snapshot.json','verification.json','archive.json','archive-list.log','dump.log','restore.log','preflight.json','driver-smoke.json']) {
                    const path = resolve(artifacts, name);
                    if (existsSync(path)) renameSync(path, resolve(previous, name));
                }
                save('target.snapshot.json', previousTarget);
                console.log('Previous attempt retained; unchanged AWS migration copy may be replaced.');
            }
            if (existsSync(archive)) throw new Error('Existing archive retained; use a new MIGRATION_DIR for another transfer');
            await preflight(source, target, command === 'refresh');
            save('source.snapshot.json', await snapshot(source));
            console.log('Exporting paused source database...');
            pgTool('pg_dump', urls.source, ['--format=custom', '--file', archive], 'dump.log');
            const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
            save('archive.json', { createdAt: new Date().toISOString(), sha256 });
            pgTool('pg_restore', urls.target, ['--list', archive], 'archive-list.log');
            console.log('Restoring empty target in one transaction...');
            pgTool('pg_restore', urls.target, ['--dbname', 'neondb', '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', ...(command === 'refresh' ? ['--clean', '--if-exists'] : []), archive], 'restore.log');
            await verify(source, target);
            await target.query('ANALYZE');
            console.log('Migration and database verification completed. Production cutover remains pending.');
        }
    } finally { await source.end(); if (target) await target.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted connection]'));
        process.exitCode = 1;
    });
}
