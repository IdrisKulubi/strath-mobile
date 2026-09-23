import pytest
from pydantic import ValidationError

from models import RankRequest, ScoreResult
from settings import MAX_ANSWERS_PER_PERSON, MAX_CANDIDATES
from tests.factories import answer, person, request


@pytest.mark.parametrize("weight", [-1, 2, 249, 251, "10"])
def test_rejects_unsupported_or_coerced_weights(weight):
    payload = request()
    payload["viewer"]["answers"][0]["weight"] = weight
    with pytest.raises(ValidationError):
        RankRequest.model_validate(payload)


def test_rejects_unknown_fields():
    payload = request()
    payload["email"] = "private@example.com"
    with pytest.raises(ValidationError):
        RankRequest.model_validate(payload)


def test_rejects_duplicate_question_versions_and_acceptable_answers():
    duplicate_question = request()
    duplicate_question["viewer"]["answers"][1] = duplicate_question["viewer"]["answers"][0]
    with pytest.raises(ValidationError):
        RankRequest.model_validate(duplicate_question)

    duplicate_acceptable = request()
    duplicate_acceptable["viewer"]["answers"][0]["acceptableAnswerIds"] = ["yes", "yes"]
    with pytest.raises(ValidationError):
        RankRequest.model_validate(duplicate_acceptable)


def test_rejects_duplicate_candidate_and_self_comparison():
    with pytest.raises(ValidationError):
        RankRequest.model_validate(request([person("same"), person("same")]))
    with pytest.raises(ValidationError):
        RankRequest.model_validate(request([person("viewer")]))


def test_enforces_candidate_answer_and_identifier_bounds():
    too_many_candidates = [person(f"candidate-{index}") for index in range(MAX_CANDIDATES + 1)]
    with pytest.raises(ValidationError):
        RankRequest.model_validate(request(too_many_candidates))

    too_many_answers = request()
    too_many_answers["viewer"]["answers"] = [answer(index) for index in range(MAX_ANSWERS_PER_PERSON + 1)]
    with pytest.raises(ValidationError):
        RankRequest.model_validate(too_many_answers)

    long_identifier = request()
    long_identifier["viewer"]["id"] = "x" * 129
    with pytest.raises(ValidationError):
        RankRequest.model_validate(long_identifier)


def test_response_model_rejects_inconsistent_status_or_counts():
    base = {
        "candidateId": "candidate",
        "viewerRevision": 1,
        "candidateRevision": 1,
        "algorithmVersion": "questionnaire-v1",
        "status": "ready",
        "score": 100,
        "sharedCount": 10,
        "evidenceCount": 10,
    }
    ScoreResult.model_validate(base)
    with pytest.raises(ValidationError):
        ScoreResult.model_validate({**base, "score": None})
    with pytest.raises(ValidationError):
        ScoreResult.model_validate({**base, "evidenceCount": 11})
