"""Versioned HTTP contract for the questionnaire matching service."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine import ALGORITHM_VERSION
from settings import (
    MAX_ACCEPTABLE_ANSWERS,
    MAX_ANSWERS_PER_PERSON,
    MAX_CANDIDATES,
)

ImportanceWeight = Literal[0, 1, 10, 50, 250]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Answer(StrictModel):
    questionVersionId: str = Field(min_length=1, max_length=100)
    answerId: str = Field(min_length=1, max_length=100)
    acceptableAnswerIds: list[str] = Field(
        min_length=1,
        max_length=MAX_ACCEPTABLE_ANSWERS,
    )
    weight: ImportanceWeight

    @model_validator(mode="after")
    def unique_acceptable_answers(self):
        if len(self.acceptableAnswerIds) != len(set(self.acceptableAnswerIds)):
            raise ValueError("Acceptable answer IDs must be unique")
        return self


class Person(StrictModel):
    id: str = Field(min_length=1, max_length=128)
    revision: int = Field(ge=0)
    answers: list[Answer] = Field(max_length=MAX_ANSWERS_PER_PERSON)

    @model_validator(mode="after")
    def unique_questions(self):
        question_ids = [answer.questionVersionId for answer in self.answers]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("Question version IDs must be unique per person")
        return self


class RankRequest(StrictModel):
    viewer: Person
    candidates: list[Person] = Field(max_length=MAX_CANDIDATES)

    @model_validator(mode="after")
    def unique_people(self):
        candidate_ids = [candidate.id for candidate in self.candidates]
        if len(candidate_ids) != len(set(candidate_ids)):
            raise ValueError("Candidate IDs must be unique")
        if self.viewer.id in candidate_ids:
            raise ValueError("The viewer cannot be scored against themself")
        return self


class ScoreResult(StrictModel):
    candidateId: str
    viewerRevision: int = Field(ge=0)
    candidateRevision: int = Field(ge=0)
    algorithmVersion: Literal["questionnaire-v1"]
    status: Literal["ready", "insufficient_evidence"]
    score: float | None = Field(default=None, ge=0, le=100)
    sharedCount: int = Field(ge=0)
    evidenceCount: int = Field(ge=0)

    @model_validator(mode="after")
    def internally_consistent(self):
        if self.evidenceCount > self.sharedCount:
            raise ValueError("Evidence count cannot exceed shared count")
        if self.status == "ready" and self.score is None:
            raise ValueError("Ready results require a score")
        if self.status == "insufficient_evidence" and self.score is not None:
            raise ValueError("Insufficient results cannot include a score")
        return self


class RankResponse(StrictModel):
    results: list[ScoreResult]


class HealthResponse(StrictModel):
    status: Literal["ok"]
    algorithmVersion: Literal["questionnaire-v1"] = ALGORITHM_VERSION
