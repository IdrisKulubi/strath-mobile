# Questionnaire matching service

This is the standalone Phase 1 service for deterministic compatibility scoring. It has no database, user profile, photo, authentication-session, message, payment, or AI dependency. The existing Next.js backend will eventually send opaque IDs and structured answers after later phases pass their own gates.

## Contract

- `GET /health` reports readiness and the algorithm version.
- `POST /v1/rank` accepts one viewer and up to 25 candidates.
- Each person can have at most 500 uniquely versioned answers.
- Supported importance weights are `0`, `1`, `10`, `50`, and `250`.
- Requests are limited to 4,000,000 streamed bytes.
- Authentication is `Authorization: Bearer <MATCHING_SERVICE_SECRET>`.
- Responses contain aggregate scores and evidence counts only. They never contain answers, explanations, categories, directional satisfaction, or per-question contributions.

The checked-in [OpenAPI contract](../../contracts/questionnaire-matching/openapi.json), [shared examples](../../contracts/questionnaire-matching/examples.json), and `questionnaire-v1` algorithm version are frozen together. A breaking input, output, or scoring change requires a new version.

## Local setup on Windows PowerShell

From the repository root:

```powershell
python -m venv services/questionnaire-matching/.venv
services/questionnaire-matching/.venv/Scripts/python.exe -m pip install -r services/questionnaire-matching/requirements-dev.txt
$env:MATCHING_SERVICE_SECRET = "local-development-secret"
services/questionnaire-matching/.venv/Scripts/python.exe -m uvicorn main:app --app-dir services/questionnaire-matching --host 127.0.0.1 --port 8080
```

Use a second terminal for the live check:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
$fixture = Get-Content contracts/questionnaire-matching/fixture.json | ConvertFrom-Json
$body = $fixture.request | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:8080/v1/rank -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer local-development-secret" } -Body $body
```

Do not use a production secret locally or commit a populated `.env` file.

## Verification

Run all Phase 1 checks from the repository root:

```powershell
services/questionnaire-matching/.venv/Scripts/python.exe -m pytest services/questionnaire-matching/tests -q
node --experimental-strip-types contracts/questionnaire-matching/validate-fixtures.ts
services/questionnaire-matching/.venv/Scripts/python.exe services/questionnaire-matching/scripts/generate_contract_artifacts.py
services/questionnaire-matching/.venv/Scripts/python.exe services/questionnaire-matching/scripts/benchmark.py --runs 30
```

Artifact generation must leave `openapi.json`, `examples.json`, and `fixture.json` unchanged. The benchmark measures the pure calculation at the maximum declared people/answer bounds; HTTP parsing and network latency are deliberately separate and must be measured during Phase 4 staging integration.

## Scoring

For questions answered by both people:

```text
S(A→B) = A's weights whose acceptable answers include B's answer
         --------------------------------------------------------
                   all A weights on shared questions

compatibility = 100 × sqrt(S(A→B) × S(B→A))
```

A score is returned only when at least ten shared questions have nonzero importance for both people and both directional denominators are nonzero. Missing/version-mismatched questions do not count. Zero agreement with sufficient evidence is a valid `0`; missing evidence is `null`. Full precision is returned and presentation clients round for display.

## Railway packaging

The future Railway service root is `services/questionnaire-matching`. The image installs runtime dependencies only, runs as a non-root user, listens on Railway's `PORT`, and uses `/health` as its deployment healthcheck. Staging deployment and backend integration belong to Phase 4.
