import json
from pathlib import Path

import pytest

from engine import rank_candidates, score_pair
from tests.factories import answer, person

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_perfect_match_and_exact_evidence_boundary():
    assert score_pair(person(), person("candidate"))["score"] == 100
    assert score_pair(person(count=9), person("candidate", count=9))["score"] is None


def test_asymmetric_score_is_symmetric_and_preserves_precision():
    viewer = person()
    candidate = person("candidate")
    viewer["answers"][0]["acceptableAnswerIds"] = ["no"]
    for candidate_answer in candidate["answers"][:2]:
        candidate_answer["acceptableAnswerIds"] = ["no"]

    expected = 84.8528137423857
    assert score_pair(viewer, candidate)["score"] == pytest.approx(expected)
    assert score_pair(candidate, viewer)["score"] == pytest.approx(expected)


def test_zero_agreement_is_a_valid_zero_score():
    viewer = person()
    candidate = person("candidate")
    for item in viewer["answers"] + candidate["answers"]:
        item["acceptableAnswerIds"] = ["no"]
    result = score_pair(viewer, candidate)
    assert result["status"] == "ready"
    assert result["score"] == 0


def test_zero_weight_and_zero_denominator_are_insufficient():
    result = score_pair(person(weight=0), person("candidate", weight=0))
    assert result["status"] == "insufficient_evidence"
    assert result["score"] is None
    assert result["sharedCount"] == 10
    assert result["evidenceCount"] == 0


def test_missing_and_changed_question_versions_do_not_compare():
    viewer = person()
    candidate = person("candidate")
    candidate["answers"][9] = answer(9, version=2)
    result = score_pair(viewer, candidate)
    assert result["sharedCount"] == 9
    assert result["score"] is None


def test_multiple_acceptable_answers_are_supported():
    viewer = person()
    candidate = person("candidate")
    viewer["answers"][0]["acceptableAnswerIds"] = ["yes", "no"]
    assert score_pair(viewer, candidate)["score"] == 100


def test_ranking_is_ready_first_then_score_evidence_and_stable_id():
    viewer = person()
    perfect_z = person("z")
    perfect_a = person("a")
    sparse = person("sparse", count=2)
    ranked = rank_candidates(viewer, [perfect_z, sparse, perfect_a])
    assert [item["candidateId"] for item in ranked] == ["a", "z", "sparse"]


def test_result_never_contains_answers_or_directional_contributions():
    result = score_pair(person(), person("candidate"))
    forbidden = {"answers", "contributions", "categories", "forward", "reverse"}
    assert forbidden.isdisjoint(result)


def test_every_shared_contract_example_matches_python():
    path = REPOSITORY_ROOT / "contracts" / "questionnaire-matching" / "examples.json"
    fixtures = json.loads(path.read_text(encoding="utf-8"))
    assert len(fixtures["cases"]) == 6
    for example in fixtures["cases"]:
        request = example["request"]
        assert rank_candidates(request["viewer"], request["candidates"]) == example["response"]["results"]
