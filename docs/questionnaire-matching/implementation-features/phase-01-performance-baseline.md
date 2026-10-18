# Phase 1 performance baseline

Measured 2026-09-21 from the uncommitted `revamped` working tree on Windows 11, Python 3.13.5, on an Intel64 Family 6 Model 154 processor with 12 logical processors. This is a local development-machine baseline, not Railway capacity evidence.

Command:

```powershell
services/questionnaire-matching/.venv/Scripts/python.exe services/questionnaire-matching/scripts/benchmark.py --runs 50
```

Workload:

- 25 candidates, the frozen v1 request maximum.
- 500 answers for the viewer and every candidate, the frozen per-person maximum.
- 1,168,381-byte compact JSON-equivalent payload, below the 4,000,000-byte HTTP limit.
- Each timed run includes strict Pydantic validation, model serialization, scoring, and sorting.
- Peak memory is measured separately with allocation tracing so tracing overhead does not distort latency.

Result:

```json
{
  "runs": 50,
  "medianValidationAndScoringMs": 35.842,
  "p95ValidationAndScoringMs": 47.49,
  "peakMiB": 13.701
}
```

The future backend client should begin with a 5-second request timeout and at most one bounded retry. This leaves room for TLS, network latency, container scheduling, cold starts, and JSON transport beyond the local processing baseline. Phase 4 must replace this assumption with staging end-to-end latency and Railway resource measurements before rollout.
