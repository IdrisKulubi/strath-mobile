# Profile Intelligence Worker

Python service for StrathSpace profile intelligence and photo embeddings. Deploy on Railway and point the Next.js backend at it.

**Railway root directory** (repo root is `strath-mobile`):

```text
services/photo-intelligence-worker
```

Do **not** use `strath-mobile/services/photo-intelligence-worker`; that path does not exist inside the GitHub repo.

## Endpoints

- `GET /health`: health check
- `POST /embed`: legacy image embedding endpoint
- `POST /reanalyze-batch`: legacy batch image embedding endpoint
- `POST /profiles/summarize`: deterministic profile summary and searchable text
- `POST /profiles/embed-text`: deterministic 768-d text embedding
- `POST /profiles/embed-image`: image embedding endpoint alias
- `POST /profiles/analyze`: profile summary, text embedding, photo presentation, optional visual embedding
- `POST /profiles/batch-analyze`: batch profile analysis

## Environment

| Variable | Description |
| --- | --- |
| `PHOTO_INTELLIGENCE_SERVICE_SECRET` | Bearer token shared with `strath-backend` |
| `PROFILE_INTELLIGENCE_SERVICE_SECRET` | Alias for `PHOTO_INTELLIGENCE_SERVICE_SECRET` (checked first) |
| `PORT` | HTTP port. Railway sets this automatically. |

Both this worker and the Next.js backend accept `PROFILE_INTELLIGENCE_SERVICE_SECRET`
or `PHOTO_INTELLIGENCE_SERVICE_SECRET`. Set both to the same value locally to avoid
confusion when one service reads a different variable than the other.

## Local Run

**Terminal A: start the server**

```powershell
cd services/photo-intelligence-worker
pip install -r requirements.txt
$env:PHOTO_INTELLIGENCE_SERVICE_SECRET = "dev-secret"
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

**Terminal B: smoke test**

```powershell
cd services/photo-intelligence-worker
.\scripts\test-local.ps1
```

Or hit endpoints manually:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health

$body = '{"photo_url":"https://picsum.photos/seed/a/100/100","object_key":"test.jpg"}'
Invoke-RestMethod http://127.0.0.1:8080/embed -Method POST `
  -Headers @{ Authorization = "Bearer dev-secret"; "Content-Type" = "application/json" } `
  -Body $body
```

Expected: `health` returns `{ status: ok }`; `embed` returns 768 floats with `provider: clip-hash`.

The MVP worker uses deterministic hash-based embeddings so you can ship without GPU or CLIP weights. Swap the internals for real models later without changing the API contract.
