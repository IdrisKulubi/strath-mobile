"""Deterministic, side-effect-free compatibility scoring."""

from __future__ import annotations

from math import sqrt
from typing import Any, Mapping, Sequence

ALGORITHM_VERSION = "questionnaire-v1"
MIN_EVIDENCE = 10

Answer = Mapping[str, Any]
Person = Mapping[str, Any]
ScoreResult = dict[str, Any]


def _answers_by_question(person: Person) -> dict[str, Answer]:
    return {answer["questionVersionId"]: answer for answer in person["answers"]}


def score_pair(viewer: Person, candidate: Person) -> ScoreResult:
    """Score one pair using only question versions answered by both people."""
    candidate_answers = _answers_by_question(candidate)
    viewer_earned = candidate_earned = 0
    viewer_total = candidate_total = 0
    shared_count = evidence_count = 0

    for viewer_answer in viewer["answers"]:
        candidate_answer = candidate_answers.get(viewer_answer["questionVersionId"])
        if candidate_answer is None:
            continue

        shared_count += 1
        viewer_weight = viewer_answer["weight"]
        candidate_weight = candidate_answer["weight"]
        viewer_total += viewer_weight
        candidate_total += candidate_weight

        if candidate_answer["answerId"] in viewer_answer["acceptableAnswerIds"]:
            viewer_earned += viewer_weight
        if viewer_answer["answerId"] in candidate_answer["acceptableAnswerIds"]:
            candidate_earned += candidate_weight
        if viewer_weight > 0 and candidate_weight > 0:
            evidence_count += 1

    viewer_satisfaction = viewer_earned / viewer_total if viewer_total else None
    candidate_satisfaction = (
        candidate_earned / candidate_total if candidate_total else None
    )
    ready = (
        evidence_count >= MIN_EVIDENCE
        and viewer_satisfaction is not None
        and candidate_satisfaction is not None
    )

    return {
        "candidateId": candidate["id"],
        "viewerRevision": viewer["revision"],
        "candidateRevision": candidate["revision"],
        "algorithmVersion": ALGORITHM_VERSION,
        "status": "ready" if ready else "insufficient_evidence",
        "score": (
            100 * sqrt(viewer_satisfaction * candidate_satisfaction)
            if ready
            else None
        ),
        "sharedCount": shared_count,
        "evidenceCount": evidence_count,
    }


def _rank_key(result: ScoreResult) -> tuple[bool, float, int, str]:
    score = result["score"]
    return (
        score is None,
        -(score or 0),
        -result["evidenceCount"],
        result["candidateId"],
    )


def rank_candidates(viewer: Person, candidates: Sequence[Person]) -> list[ScoreResult]:
    """Return ready scores first, then sparse results, with stable tie-breaking."""
    return sorted(
        (score_pair(viewer, candidate) for candidate in candidates),
        key=_rank_key,
    )


# Temporary aliases keep parked later-phase drafts import-compatible.
score = score_pair
rank = rank_candidates
