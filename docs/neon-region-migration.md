# Neon region migration — 2026-09-29

Source: Azure East US 2, PostgreSQL 17.11. Target: AWS US East 2, PostgreSQL 18.6. The user confirmed maintenance is active and all writers are paused. The user owns Vercel maintenance controls and deployment updates.

## Execution and recovery artifacts

Run commands from `backend/strath-backend`. Credentials are read from the ignored `.env.local`; no credentials are included in this document. The migration script resolves the known Azure and AWS endpoints independently, even when `DATABASE_URL` is duplicated.

```powershell
npm run test:neon-region
npm run migrate:neon-region -- preflight
npm run migrate:neon-region -- migrate --maintenance-confirmed
npm run migrate:neon-region -- verify
npm run migrate:neon-region -- cutover-local
```

Artifacts live outside the Git repository at `C:/Users/Idris Kulubi/Desktop/sidequests/active/smobile/outputs/neon-region-migration-20260929`. They include the custom-format `source.dump`, its SHA-256, dump/restore logs, schema/data fingerprints, verification report, and the original local environment backup once local cutover occurs. Treat this directory as private database material. PostgreSQL 18.6 portable clients were obtained from the official EDB Windows binary archive; no local database service was installed.

The transfer refuses a populated target or existing archive. Restore runs as one transaction, stops on errors, and does not restore owner/ACL declarations. Preflight found no additional table grantees beyond `neondb_owner`; verification compares actual table and schema grants. No seeds, schema pushes, or application migrations are run.

Verification compares SHA-256 fingerprints and exact row counts for every application table, sequence values and `is_called`, columns/defaults, constraints, indexes, schemas, grants, and extension names. pgvector version differences are expected across the PostgreSQL upgrade. PostgreSQL 18's extra validated NOT NULL catalog entries are normalized; column nullability is still compared independently, following the [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html). Source drift between the pre-dump and final snapshots prevents cutover.

The first copy revealed continued Azure writes despite the initial maintenance confirmation. Cutover was withheld. After the user confirmed writers were stopped again, the Azure database's `default_transaction_read_only` was set to `on` and three idle same-user application connections were recycled. A new connection confirmed read-only mode. A zero-row UPDATE through Neon HTTP was rejected as read-only, recorded in `source-write-gate.json`. This is an additional maintenance safeguard; it does not replace disabling traffic and jobs. Active transactions were checked before the change and were not terminated. The previous mode and rollback SQL are recorded in `source-freeze.json`.

```powershell
# Retry only after writers are stopped. This verifies the AWS copy has no new
# writes, archives the prior attempt, and replaces that copy transactionally.
node src/scripts/migrate-neon-region.mjs refresh --maintenance-confirmed
node src/scripts/verify-neon-region-drivers.mjs
node src/scripts/migrate-neon-region.mjs cutover-local
```

`refresh` refuses to replace an AWS copy whose data or schema has changed since the recorded restore. Prior attempts remain in timestamped `attempt-*` directories. Backend smoke checks exercise `pg`, Neon HTTP, Neon Pool, restored vector operators, and a temporary rolled-back write. They do not substitute for authenticated live application checks.

## Production cutover — user actions

Keep maintenance active until all checks below pass.

1. In the live Vercel project's environment variables, set `DATABASE_URL` to the supplied **direct AWS URL** and `DATABASE_URL_POOLED` to the supplied pooled AWS URL. Preserve authentication secrets, domain, storage credentials, and all unrelated variables. Check preview/development deployments and external consumers for old Azure connections.
2. Redeploy the production backend so every database client receives the new environment. Prevent traffic reaching previous deployments still connected to Azure.
3. Notify the migration operator that redeployment is complete. Confirm existing-session sign-in, profiles, questionnaire answers/privacy, discovery, conversations, and payment reads with your own account.
4. Perform a controlled application write, such as saving one preference on a test account, then confirm the change appears in AWS. Public feature-flag reachability alone does not prove which database the deployment uses.
5. Resume traffic and jobs. Confirm cron/worker progress, replay retried payment webhooks, and watch database/API errors, connection pressure, and queue backlog.

The database copy does not include external S3 objects, Redis contents, other Neon branches/databases, project settings, or deployment environment variables. Existing external resources remain in place. Check any cached results or queued work before resuming consumers.

## Rollback and retention

Before AWS accepts writes, keep maintenance active, restore Azure's write mode, point the local and deployed `DATABASE_URL` back to the original Azure connection, redeploy, and verify before reopening. On one source connection, execute the following as **two separate commands outside an explicit transaction**, then recycle idle application connections or reconnect every source consumer:

```sql
SET default_transaction_read_only = off;
ALTER DATABASE neondb RESET default_transaction_read_only;
```

The source is deliberately left read-only after successful migration. The local backup may contain duplicate database definitions: do not restore it blindly; use one Azure `DATABASE_URL` definition and remove the AWS pooled definition.

After AWS accepts writes, pause all writers and reconcile those writes before reverting. Simply changing connection strings would lose new data. Retain the Azure project and archive for at least seven days after successful production cutover. Old-project deletion requires a separate user request.

## Execution evidence

- Migration safety tests: six passed; lint passed for all three migration scripts.
- Initial source: approximately 185 MiB, 83 tables, four sequences, `public` and `drizzle` schemas, pgvector 0.8.0.
- Initial target: no application tables; pgvector 0.8.6 available.
- Direct connections verified with TLS certificate validation; no other active source queries at preflight.
- First transfer: restore succeeded, but Azure data changed during the copy. The verification guard blocked cutover. PostgreSQL 18's additional NOT NULL constraint catalog entries were accounted for without relaxing column-nullability checks.
- First restored copy: all three backend drivers connected to PostgreSQL 18.6 and saw 1,694 users; vector self-distance and temporary rolled-back write checks passed.
- Retry verification passed at **2026-09-29 11:19:02 UTC**: all 83 tables match by exact row count and content SHA-256; all four sequence states, columns, constraints, indexes, grants, schemas, and extension names match. No source drift occurred during the retry.
- PostgreSQL 18.6 / pgvector 0.8.6 driver checks passed at **11:19:29 UTC**: `pg`, Neon HTTP, and Neon Pool all see 1,694 users and a writable AWS database. Vector self-distance checks and a temporary rolled-back write passed. Target statistics were refreshed with `ANALYZE`.
- Local cutover completed at **11:19:53 UTC**: exactly one direct AWS `DATABASE_URL` and one AWS `DATABASE_URL_POOLED` definition remain. Every unrelated environment setting was verified unchanged. The original local environment is retained privately in `.env.before-cutover`.
- Fresh archive SHA-256: `931e7de75ea96421b96336926ab5d1e5d3611ff5410f776c738f63d7ff49768b`. The first attempt remains under `attempt-1790679892321`; both export and successful restore logs are retained.
- Source Azure database remains read-only for recovery. Production Vercel variable updates, redeployment, authenticated application checks, a controlled live preference save, and resuming traffic/jobs remain **pending user execution**. Restart paused local backend processes when needed so they load the new environment.

The exact database comparison is a pre-cutover check. Once legitimate AWS application writes begin, differences from the frozen Azure snapshot are expected. Do not refresh or restore over new AWS data; the refresh guard refuses changed copies.

If this machine's global `npm`/`npx` launcher fails, run the commands with `node src/scripts/...` directly. The installed npm CLI can also be invoked with `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"`.
