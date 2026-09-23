"""Repeatable in-process upper-bound benchmark for Phase 1."""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import sys
import time
import tracemalloc
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from engine import rank_candidates  # noqa: E402
from models import RankRequest  # noqa: E402
from settings import MAX_ANSWERS_PER_PERSON, MAX_CANDIDATES  # noqa: E402


def make_person(identifier: str):
    answers = [
        {
            "questionVersionId": f"q{index}:1",
            "answerId": "yes",
            "acceptableAnswerIds": ["yes"],
            "weight": 10,
        }
        for index in range(MAX_ANSWERS_PER_PERSON)
    ]
    return {"id": identifier, "revision": 1, "answers": answers}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=30)
    arguments = parser.parse_args()

    tracemalloc.start()
    payload = {
        "viewer": make_person("viewer"),
        "candidates": [
            make_person(f"candidate-{index:02}")
            for index in range(MAX_CANDIDATES)
        ],
    }
    payload_bytes = len(json.dumps(payload, separators=(",", ":")).encode())
    validated = RankRequest.model_validate(payload).model_dump()
    rank_candidates(validated["viewer"], validated["candidates"])
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # Time without allocation tracing; tracemalloc materially distorts latency.
    durations = []
    for _ in range(arguments.runs):
        started = time.perf_counter()
        validated = RankRequest.model_validate(payload).model_dump()
        rank_candidates(validated["viewer"], validated["candidates"])
        durations.append((time.perf_counter() - started) * 1000)

    print(
        json.dumps(
            {
                "python": platform.python_version(),
                "platform": platform.platform(),
                "runs": arguments.runs,
                "candidatesPerRun": MAX_CANDIDATES,
                "answersPerPerson": MAX_ANSWERS_PER_PERSON,
                "payloadBytes": payload_bytes,
                "medianValidationAndScoringMs": round(statistics.median(durations), 3),
                "p95ValidationAndScoringMs": round(
                    sorted(durations)[max(0, int(len(durations) * 0.95) - 1)],
                    3,
                ),
                "peakMiB": round(peak / 1024 / 1024, 3),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
