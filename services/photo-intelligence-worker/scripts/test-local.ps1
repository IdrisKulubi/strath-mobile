# Local smoke test for the photo intelligence worker.
# Usage (from services/photo-intelligence-worker):
#   1. Terminal A:  $env:PHOTO_INTELLIGENCE_SERVICE_SECRET="dev-secret"; python -m uvicorn main:app --host 127.0.0.1 --port 8080
#   2. Terminal B:  .\scripts\test-local.ps1

$BaseUrl = if ($env:PHOTO_INTELLIGENCE_SERVICE_URL) { $env:PHOTO_INTELLIGENCE_SERVICE_URL } else { "http://127.0.0.1:8080" }
$Secret = if ($env:PHOTO_INTELLIGENCE_SERVICE_SECRET) { $env:PHOTO_INTELLIGENCE_SERVICE_SECRET } else { "dev-secret" }
$SamplePhoto = "https://picsum.photos/seed/strathspace-local/300/400"

Write-Host "Testing $BaseUrl ..."

$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
Write-Host "[health] $($health.status)"

$embedBody = @{ photo_url = $SamplePhoto; object_key = "local/test.jpg" } | ConvertTo-Json
$embed = Invoke-RestMethod -Uri "$BaseUrl/embed" -Method POST `
    -Headers @{ Authorization = "Bearer $Secret"; "Content-Type" = "application/json" } `
    -Body $embedBody
Write-Host "[embed] provider=$($embed.provider) model=$($embed.model) dim=$($embed.embedding.Count)"

$batchBody = @{
    items = @(
        @{ photo_url = "https://picsum.photos/seed/a/100/100"; object_key = "a.jpg" },
        @{ photo_url = "https://picsum.photos/seed/b/100/100"; object_key = "b.jpg" }
    )
} | ConvertTo-Json -Depth 4

$batch = Invoke-RestMethod -Uri "$BaseUrl/reanalyze-batch" -Method POST `
    -Headers @{ Authorization = "Bearer $Secret"; "Content-Type" = "application/json" } `
    -Body $batchBody
Write-Host "[reanalyze-batch] processed=$($batch.processed)"
foreach ($item in $batch.results) {
    Write-Host "  $($item.object_key) -> $($item.status)"
}

Write-Host "All local checks passed."
