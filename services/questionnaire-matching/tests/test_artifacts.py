import json
from pathlib import Path

from api import create_app
from engine import rank_candidates

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
CONTRACT_ROOT = REPOSITORY_ROOT / "contracts" / "questionnaire-matching"


def test_checked_in_openapi_matches_the_executable_app():
    checked_in = json.loads((CONTRACT_ROOT / "openapi.json").read_text(encoding="utf-8"))
    assert checked_in == create_app().openapi()


def test_checked_in_examples_match_the_executable_engine():
    examples = json.loads((CONTRACT_ROOT / "examples.json").read_text(encoding="utf-8"))
    for example in examples["cases"]:
        payload = example["request"]
        assert rank_candidates(payload["viewer"], payload["candidates"]) == example["response"]["results"]
