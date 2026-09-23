"""Generate checked-in contract examples and OpenAPI from executable code."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
CONTRACT_ROOT = REPOSITORY_ROOT / "contracts" / "questionnaire-matching"
sys.path.insert(0, str(SERVICE_ROOT))

from api import create_app  # noqa: E402
from engine import rank_candidates  # noqa: E402


def answer(
    index: int,
    *,
    own: str = "yes",
    acceptable: list[str] | None = None,
    weight: int = 1,
    version: int = 1,
) -> dict[str, Any]:
    return {
        "questionVersionId": f"q{index}:{version}",
        "answerId": own,
        "acceptableAnswerIds": acceptable or ["yes"],
        "weight": weight,
    }


def person(identifier: str, answers: list[dict[str, Any]], revision: int) -> dict[str, Any]:
    return {"id": identifier, "revision": revision, "answers": answers}


def case(name: str, viewer_answers, candidate_answers) -> dict[str, Any]:
    request = {
        "viewer": person("viewer", viewer_answers, 2),
        "candidates": [person(f"candidate-{name}", candidate_answers, 3)],
    }
    return {
        "name": name,
        "request": request,
        "response": {"results": rank_candidates(request["viewer"], request["candidates"])},
    }


def build_examples() -> list[dict[str, Any]]:
    perfect = [answer(index) for index in range(10)]

    asymmetric_viewer = [answer(index) for index in range(10)]
    asymmetric_viewer[0] = answer(0, acceptable=["no"])
    asymmetric_candidate = [answer(index) for index in range(10)]
    asymmetric_candidate[0] = answer(0, acceptable=["no"])
    asymmetric_candidate[1] = answer(1, acceptable=["no"])

    zero_agreement_viewer = [answer(index, acceptable=["no"]) for index in range(10)]
    zero_agreement_candidate = [answer(index, acceptable=["no"]) for index in range(10)]
    sparse = [answer(index) for index in range(9)]
    zero_weight = [answer(index, weight=0) for index in range(10)]
    mismatched_candidate = [answer(index) for index in range(9)] + [answer(9, version=2)]

    return [
        case("perfect", perfect, perfect),
        case("asymmetric", asymmetric_viewer, asymmetric_candidate),
        case("zero-agreement", zero_agreement_viewer, zero_agreement_candidate),
        case("sparse", sparse, sparse),
        case("zero-weight", zero_weight, zero_weight),
        case("version-mismatch", perfect, mismatched_candidate),
    ]


def write_json(path: Path, value: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main():
    examples = build_examples()
    write_json(CONTRACT_ROOT / "examples.json", {"cases": examples})
    perfect = examples[0]
    write_json(
        CONTRACT_ROOT / "fixture.json",
        {"request": perfect["request"], "response": perfect["response"]},
    )
    write_json(CONTRACT_ROOT / "openapi.json", create_app().openapi())


if __name__ == "__main__":
    main()
