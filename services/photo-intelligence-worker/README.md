# Photo Intelligence Worker

Python service for StrathSpace photo embeddings. Deploy on Railway and point the Next.js backend at it.

**Railway root directory** (repo root is `strath-mobile`):

```text
services/photo-intelligence-worker
```

Do **not** use `strath-mobile/services/photo-intelligence-worker` — that path does not exist inside the GitHub repo.

## Endpoints

- `GET /health` — health check
- `POST /embed` — returns a 768-d embedding for a profile photo URL
- `POST /reanalyze-batch` — batch embedding generation

## Environment

| Variable | Description |
| --- | --- |
| `PHOTO_INTELLIGENCE_SERVICE_SECRET` | Bearer token shared with `strath-backend` |
| `PORT` | HTTP port (Railway sets this automatically) |

## Local run

**Terminal A — start the server**

```powershell
cd services/photo-intelligence-worker
pip install -r requirements.txt
$env:PHOTO_INTELLIGENCE_SERVICE_SECRET = "dev-secret"
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

**Terminal B — smoke test**

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

Expected: `health` → `{ status: ok }`, `embed` → 768 floats, `provider: clip-hash`.

## Backend wiring

In `strath-backend` `.env.local`:

```env
PHOTO_INTELLIGENCE_SERVICE_URL=https://your-service.up.railway.app
PHOTO_INTELLIGENCE_SERVICE_SECRET=your-shared-secret
PHOTO_INTELLIGENCE_TIMEOUT_MS=15000
```

The MVP worker uses a deterministic hash-based embedding so you can ship without GPU/CLIP weights. Swap `_hash_embedding` for real CLIP inference when you scale.
