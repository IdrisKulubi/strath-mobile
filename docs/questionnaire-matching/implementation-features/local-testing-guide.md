# Local questionnaire-matching test guide

Use an isolated local PostgreSQL database. Never point these commands at production while learning the flow.

## Required questionnaire migrations

Run these in order:

1. `backend/strath-backend/drizzle/0038_questionnaire_matching.sql`
2. `backend/strath-backend/drizzle/0039_questionnaire_discovery.sql`
3. `backend/strath-backend/drizzle/0040_questionnaire_connections.sql`

Use the migration runner instead of pasting the files manually. The runner applies them transactionally, records `0038`–`0040` in `q_migrations`, and seeds the 100-question catalogue. It is safe to rerun because completed migration numbers are skipped and the catalogue seed is checked for immutability.

These migrations depend on the existing Strathspace tables, including `user`, `profiles`, `matches`, `messages`, `blocks` and `reports`. For a completely empty database, create the existing schema first with Drizzle push. For an existing Strathspace database already current through migration `0037`, run only the questionnaire migration runner.

## 1. Start local PostgreSQL

Use an installed PostgreSQL 16 server, a local Neon development branch, or Docker. One Docker example is:

```powershell
docker run --name strathspace-postgres `
  -e POSTGRES_USER=strath `
  -e POSTGRES_PASSWORD=strath_local_password `
  -e POSTGRES_DB=strathspace_local `
  -p 5432:5432 `
  -d postgres:16
```

The matching local URL is:

```text
postgresql://strath:strath_local_password@127.0.0.1:5432/strathspace_local
```

## 2. Configure and create the base schema

From `backend/strath-backend`, copy `.env.example` to `.env.local` if needed. Set at least:

```dotenv
DATABASE_URL=postgresql://strath:strath_local_password@127.0.0.1:5432/strathspace_local
BETTER_AUTH_SECRET=replace-with-a-long-local-only-secret
BETTER_AUTH_URL=http://localhost:3000

MATCHING_SERVICE_URL=http://127.0.0.1:8080
MATCHING_SERVICE_SECRET=replace-with-a-different-long-local-only-secret

QUESTIONNAIRE_SCHEMA_READY=true
QUESTIONNAIRE_COLLECTION_ENABLED=true
QUESTIONNAIRE_MATCHING_ENABLED=true
QUESTIONNAIRE_SHELL_ENABLED=true
QUESTIONNAIRE_USER_IDS=*
```

Use `*` only with this isolated local database. Use explicit account IDs in shared or hosted environments.

For a new empty database, create the existing Strathspace schema first:

```powershell
node node_modules/drizzle-kit/bin.cjs push
```

Skip this push when using an existing database whose legacy migrations are already current. Review Drizzle's proposed changes before accepting them.

## 3. Apply the questionnaire migrations

The standalone script does not load `.env.local`, so export the URL in the migration terminal:

```powershell
$env:DATABASE_URL = "postgresql://strath:strath_local_password@127.0.0.1:5432/strathspace_local"
node node_modules/tsx/dist/cli.mjs src/scripts/migrate-questionnaire.ts --apply
```

Expected result: `0038`, `0039`, and `0040` apply once and 100 questions are seeded. Rerun the command once to verify all three report `alreadyApplied: true`.

Verify in `psql` or a database console:

```sql
SELECT name, applied_at FROM q_migrations ORDER BY name;
SELECT count(*) AS published_questions FROM q_questions WHERE published;
SELECT to_regclass('q_state') AS questionnaire,
       to_regclass('q_compatibility_cache') AS compatibility,
       to_regclass('q_connections') AS connections;
```

Expected migration names are `0038`, `0039`, and `0040`; the published question count is `100`; all three table checks are non-null.

## 4. Start the Python matching engine

From the repository root in terminal one:

```powershell
python -m venv services/questionnaire-matching/.venv
services/questionnaire-matching/.venv/Scripts/python.exe -m pip install -r services/questionnaire-matching/requirements-dev.txt
$env:MATCHING_SERVICE_SECRET = "replace-with-a-different-long-local-only-secret"
services/questionnaire-matching/.venv/Scripts/python.exe -m uvicorn main:app --app-dir services/questionnaire-matching --host 127.0.0.1 --port 8080
```

Check it from another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

## 5. Start the Next.js backend

From `backend/strath-backend` in terminal two:

```powershell
node node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 3000
```

Next.js loads `.env.local`. Keep the engine terminal running. A questionnaire API request without a session should return an authentication error, which confirms the route is reachable:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/v2/questionnaire/experience -SkipHttpErrorCheck
```

## 6. Start the mobile app

Set the mobile root `.env.local` to the backend address. A physical phone must use the computer's LAN address, not `localhost`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Allow port 3000 through the local firewall, keep the phone and computer on the same network, then run from the mobile root:

```powershell
node scripts/expo-cli.mjs start --clear
```

Sign up two local accounts, complete profiles and twenty answers, then test discovery → like → mutual match → message → read → unmatch/block. Full discovery also requires each profile to have `face_verification_status = 'verified'`. Use the normal verification flow when its local dependencies are configured; only set this directly in the database for synthetic accounts in the isolated local database.

## 7. Optional legacy backfill rehearsal

For a fresh database, the report should find nothing to backfill. For a copied development database, run the dry run first:

```powershell
$env:DATABASE_URL = "postgresql://strath:strath_local_password@127.0.0.1:5432/strathspace_local"
node node_modules/tsx/dist/cli.mjs src/scripts/reconcile-questionnaire-connections.ts
```

After reviewing the counts, apply it with:

```powershell
node node_modules/tsx/dist/cli.mjs src/scripts/reconcile-questionnaire-connections.ts --apply
```

Run the dry run again. `wouldInsert` should be zero, and match/message counts must remain unchanged.

## Troubleshooting

- `relation "user" does not exist`: the database is empty; run the base Drizzle push first.
- `DATABASE_URL is required`: export `$env:DATABASE_URL` in the same terminal before running the migration or reconciliation script.
- `Matching service is not configured`: set both matching service variables in the backend `.env.local` and restart Next.js.
- Discovery says the profile is incomplete: confirm adult DOB, explicit preferences, visible profile, verification and at least twenty saved answers.
- A phone cannot reach the backend: use the computer's LAN IP, bind Next.js to `0.0.0.0`, check the firewall and keep both devices on the same network.
- If the global `npm` command reports a missing `npm-cli.js`, use the direct local `node node_modules/...` commands shown above.
