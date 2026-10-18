import json

import pytest
from fastapi.testclient import TestClient

from main import app
from settings import MAX_ANSWERS_PER_PERSON, MAX_BODY_BYTES, MAX_CANDIDATES
from tests.factories import answer, person, request

client = TestClient(app)


@pytest.fixture(autouse=True)
def configured_secret(monkeypatch):
    monkeypatch.setenv("MATCHING_SERVICE_SECRET", "test-secret")


def authorized_headers():
    return {"Authorization": "Bearer test-secret"}


def test_health_requires_configuration(monkeypatch):
    assert client.get("/health").json() == {
        "status": "ok",
        "algorithmVersion": "questionnaire-v1",
    }
    monkeypatch.delenv("MATCHING_SERVICE_SECRET")
    assert client.get("/health").status_code == 503


@pytest.mark.parametrize(
    "header",
    [None, "Bearer wrong", "Basic test-secret", "Bearer "],
)
def test_rank_fails_closed_for_missing_or_invalid_credentials(header):
    headers = {"Authorization": header} if header is not None else {}
    response = client.post("/v1/rank", json=request(), headers=headers)
    assert response.status_code == 401
    assert "test-secret" not in response.text


def test_malformed_unauthenticated_request_does_not_reveal_validation_details():
    response = client.post("/v1/rank", json={"private": "payload"})
    assert response.status_code == 401


def test_bearer_scheme_is_case_insensitive_as_required_by_http_auth():
    response = client.post(
        "/v1/rank",
        json=request(),
        headers={"Authorization": "bearer test-secret"},
    )
    assert response.status_code == 200


def test_rank_returns_only_the_public_aggregate_contract():
    response = client.post("/v1/rank", json=request(), headers=authorized_headers())
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert set(result) == {
        "candidateId",
        "viewerRevision",
        "candidateRevision",
        "algorithmVersion",
        "status",
        "score",
        "sharedCount",
        "evidenceCount",
    }


def test_api_rejects_unknown_fields_and_invalid_weight():
    unknown = {**request(), "email": "private@example.com"}
    assert client.post("/v1/rank", json=unknown, headers=authorized_headers()).status_code == 422

    invalid = request()
    invalid["viewer"]["answers"][0]["weight"] = 2
    assert client.post("/v1/rank", json=invalid, headers=authorized_headers()).status_code == 422


def test_api_accepts_the_maximum_declared_people_and_answer_bounds():
    viewer = person()
    viewer["answers"] = [answer(index) for index in range(MAX_ANSWERS_PER_PERSON)]
    candidates = []
    for index in range(MAX_CANDIDATES):
        candidate = person(f"candidate-{index}")
        candidate["answers"] = [answer(answer_index) for answer_index in range(MAX_ANSWERS_PER_PERSON)]
        candidates.append(candidate)
    response = client.post(
        "/v1/rank",
        json={"viewer": viewer, "candidates": candidates},
        headers=authorized_headers(),
    )
    assert response.status_code == 200
    assert len(response.json()["results"]) == MAX_CANDIDATES


def test_api_rejects_declared_and_streamed_oversized_bodies():
    oversized = b"x" * (MAX_BODY_BYTES + 1)
    declared = client.post("/v1/rank", content=oversized, headers=authorized_headers())
    assert declared.status_code == 413
    assert declared.headers["content-type"] == "application/json"

    def chunks():
        yield b"x" * (MAX_BODY_BYTES // 2)
        yield b"x" * (MAX_BODY_BYTES // 2 + 1)

    streamed = client.post("/v1/rank", content=chunks(), headers=authorized_headers())
    assert streamed.status_code == 413


def test_openapi_declares_bearer_security_and_version():
    schema = client.get("/openapi.json").json()
    assert schema["info"]["version"] == "questionnaire-v1"
    assert schema["paths"]["/v1/rank"]["post"]["security"] == [{"HTTPBearer": []}]
    assert schema["components"]["securitySchemes"]["HTTPBearer"]["scheme"] == "bearer"
