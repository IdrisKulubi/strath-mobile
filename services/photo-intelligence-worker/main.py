"""
StrathSpace profile intelligence worker (Railway).

Generates deterministic MVP summaries and embeddings for profile intelligence.
The Next.js backend calls this service with a bearer token when the worker URL
is configured. The hash-based embeddings keep Phase 02 deployable without GPU
or model weights; swap the internals for real models later without changing the
API contract.
"""

from __future__ import annotations

import hashlib
import os
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="StrathSpace Profile Intelligence", version="2.0.0")

EMBEDDING_DIM = 768
IMAGE_PROVIDER = "clip-hash"
IMAGE_MODEL = "hash-v1"
TEXT_PROVIDER = "text-hash"
TEXT_MODEL = "profile-text-hash-v1"
SUMMARY_VERSION = "profile_summary_v1"
PHOTO_ANALYSIS_VERSION = "profile_photo_presentation_v1"


class EmbedRequest(BaseModel):
    photo_url: str
    object_key: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float] = Field(min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)
    provider: str = IMAGE_PROVIDER
    model: str = IMAGE_MODEL


class BatchReanalyzeRequest(BaseModel):
    items: list[EmbedRequest]


class ProfilePayload(BaseModel):
    user_id: str | None = None
    first_name: str | None = None
    age: int | None = None
    gender: str | None = None
    university: str | None = None
    course: str | None = None
    year_of_study: int | None = None
    bio: str | None = None
    about_me: str | None = None
    looking_for: str | None = None
    interests: list[str] = Field(default_factory=list)
    qualities: list[str] = Field(default_factory=list)
    prompts: list[dict[str, Any]] = Field(default_factory=list)
    personality_answers: dict[str, Any] = Field(default_factory=dict)
    lifestyle_answers: dict[str, Any] = Field(default_factory=dict)
    photo_url: str | None = None
    photos: list[str] = Field(default_factory=list)


class ProfileSummaryRequest(BaseModel):
    profile: ProfilePayload


class ProfileSummaryResponse(BaseModel):
    profileSummary: str
    searchText: str
    summaryVersion: str = SUMMARY_VERSION


class TextEmbeddingRequest(BaseModel):
    text: str


class TextEmbeddingResponse(BaseModel):
    embedding: list[float] = Field(min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)
    provider: str = TEXT_PROVIDER
    model: str = TEXT_MODEL


class PhotoPresentationResponse(BaseModel):
    photoPresentationScore: int
    faceVisible: bool
    imageClear: bool
    lightingScore: int
    hasMultiplePeople: bool
    isObjectOnly: bool
    moderationStatus: str
    analysisVersion: str = PHOTO_ANALYSIS_VERSION


class StructuredProfileTags(BaseModel):
    traitTags: list[str] = Field(default_factory=list)
    datingIntentTags: list[str] = Field(default_factory=list)
    socialEnergyTags: list[str] = Field(default_factory=list)
    lifestyleTags: list[str] = Field(default_factory=list)
    interestTags: list[str] = Field(default_factory=list)
    communicationTags: list[str] = Field(default_factory=list)
    availabilityTags: list[str] = Field(default_factory=list)
    dealbreakerTags: list[str] = Field(default_factory=list)


class ProfileAnalyzeRequest(BaseModel):
    profile: ProfilePayload


class ProfileAnalyzeResponse(BaseModel):
    profileSummary: str
    searchText: str
    structuredTags: StructuredProfileTags = Field(default_factory=StructuredProfileTags)
    textEmbedding: list[float] = Field(min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)
    textEmbeddingProvider: str = TEXT_PROVIDER
    textEmbeddingModel: str = TEXT_MODEL
    photoPresentation: PhotoPresentationResponse
    visualEmbedding: list[float] | None = Field(default=None, min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)
    visualEmbeddingProvider: str | None = IMAGE_PROVIDER
    visualEmbeddingModel: str | None = IMAGE_MODEL
    analysisVersion: str = "profile_intelligence_worker_v1"


class BatchAnalyzeRequest(BaseModel):
    items: list[ProfileAnalyzeRequest]


def _service_secret() -> str:
    return (
        os.getenv("PROFILE_INTELLIGENCE_SERVICE_SECRET", "").strip()
        or os.getenv("PHOTO_INTELLIGENCE_SERVICE_SECRET", "").strip()
    )


def require_auth(authorization: str | None = Header(default=None)) -> None:
    secret = _service_secret()
    if not secret:
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if token != secret:
        raise HTTPException(status_code=401, detail="Invalid bearer token")


def _hash_embedding(payload: bytes) -> list[float]:
    """
    Deterministic pseudo-embedding for MVP when torch/CLIP is not installed.
    Replace with real CLIP inference when deploying a GPU or larger image on Railway.
    """
    digest = hashlib.sha256(payload).digest()
    values: list[float] = []
    seed = digest

    while len(values) < EMBEDDING_DIM:
        for byte in seed:
            values.append((byte / 255) * 2 - 1)
            if len(values) >= EMBEDDING_DIM:
                break
        seed = hashlib.sha256(seed).digest()

    norm = sum(value * value for value in values) ** 0.5 or 1.0
    return [value / norm for value in values]


async def _download_image(photo_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(photo_url)
        response.raise_for_status()
        return response.content


def _clean_text(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def _safe_list(values: list[str], limit: int = 6) -> list[str]:
    return [_clean_text(value) for value in values if _clean_text(value)][:limit]


def _tag(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "_" for char in _clean_text(value))
    return "_".join(part for part in cleaned.split("_") if part)


def _unique_tags(values: list[str], limit: int = 12) -> list[str]:
    tags: list[str] = []
    for value in values:
        tag = _tag(value)
        if tag and tag not in tags:
            tags.append(tag)
        if len(tags) >= limit:
            break
    return tags


def _prompt_responses(prompts: list[dict[str, Any]]) -> list[str]:
    responses: list[str] = []
    for item in prompts:
        value = item.get("response") or item.get("answer") or item.get("text")
        if isinstance(value, str) and _clean_text(value):
            responses.append(_clean_text(value))
    return responses[:3]


def _infer_traits(profile: ProfilePayload) -> list[str]:
    joined = " ".join(
        [
            profile.bio or "",
            profile.about_me or "",
            " ".join(profile.qualities),
            " ".join(str(value) for value in profile.personality_answers.values()),
            " ".join(str(value) for value in profile.lifestyle_answers.values()),
        ]
    ).lower()

    trait_map = {
        "calm": ["calm", "quiet", "low-pressure", "low pressure", "peaceful"],
        "intentional": ["serious", "intentional", "long term", "long-term", "relationship"],
        "social": ["social", "outgoing", "extrovert", "party", "hangout"],
        "thoughtful": ["deep", "thoughtful", "reading", "books", "conversation"],
        "active": ["gym", "fitness", "sports", "walk", "hike", "active"],
        "creative": ["music", "art", "fashion", "design", "creative", "photo"],
        "ambitious": ["ambition", "startup", "career", "business", "focused"],
    }

    traits = [trait for trait, needles in trait_map.items() if any(needle in joined for needle in needles)]
    return traits[:4]


def build_structured_tags(profile: ProfilePayload) -> StructuredProfileTags:
    joined = " ".join(
        [
            profile.bio or "",
            profile.about_me or "",
            profile.looking_for or "",
            " ".join(profile.interests),
            " ".join(profile.qualities),
            " ".join(str(value) for value in profile.personality_answers.values()),
            " ".join(str(value) for value in profile.lifestyle_answers.values()),
        ]
    ).lower()

    def has_any(*needles: str) -> bool:
        return any(needle in joined for needle in needles)

    trait_tags = _infer_traits(profile)
    dating_intent_tags: list[str] = []
    if has_any("serious", "intentional", "long term", "long-term", "relationship"):
        dating_intent_tags.append("serious")
    if has_any("casual", "friends", "friendship"):
        dating_intent_tags.append("casual")
    if profile.looking_for:
        dating_intent_tags.append(profile.looking_for)

    social_energy_tags: list[str] = []
    if has_any("quiet", "introvert", "calm", "low pressure", "low-pressure"):
        social_energy_tags.append("low")
    if has_any("social", "outgoing", "extrovert", "party", "hangout"):
        social_energy_tags.append("high")
    if not social_energy_tags and has_any("chill", "balanced", "moderate"):
        social_energy_tags.append("moderate")

    lifestyle_tags: list[str] = []
    for label, needles in {
        "gym": ["gym", "fitness", "workout"],
        "sports": ["sports", "football", "basketball", "run"],
        "music": ["music", "spotify", "sing"],
        "study": ["study", "books", "reading", "library"],
        "fashion": ["fashion", "style"],
        "faith": ["church", "faith", "religion"],
        "nightlife": ["party", "club", "nightlife"],
    }.items():
        if has_any(*needles):
            lifestyle_tags.append(label)

    communication_tags: list[str] = []
    for label, needles in {
        "direct": ["direct", "honest", "straightforward"],
        "deep_talks": ["deep talk", "deep conversation", "thoughtful"],
        "playful": ["funny", "jokes", "memes", "playful"],
        "consistent": ["consistent", "reliable", "intentional"],
    }.items():
        if has_any(*needles):
            communication_tags.append(label)

    availability_tags: list[str] = []
    if has_any("active", "today", "available", "free time"):
        availability_tags.append("active_recently")

    dealbreaker_tags: list[str] = []
    if has_any("no smoking", "non smoker", "non-smoker"):
        dealbreaker_tags.append("no_smoking")
    if has_any("no party", "doesn't party", "does not party"):
        dealbreaker_tags.append("low_party")

    return StructuredProfileTags(
        traitTags=_unique_tags(trait_tags),
        datingIntentTags=_unique_tags(dating_intent_tags),
        socialEnergyTags=_unique_tags(social_energy_tags),
        lifestyleTags=_unique_tags(lifestyle_tags),
        interestTags=_unique_tags(profile.interests),
        communicationTags=_unique_tags(communication_tags),
        availabilityTags=_unique_tags(availability_tags),
        dealbreakerTags=_unique_tags(dealbreaker_tags),
    )


def build_profile_summary(profile: ProfilePayload) -> ProfileSummaryResponse:
    name = _clean_text(profile.first_name) or "This person"
    intro_bits: list[str] = []
    if profile.age:
        intro_bits.append(f"{profile.age}")
    if profile.year_of_study:
        intro_bits.append(f"year {profile.year_of_study}")
    if _clean_text(profile.course):
        intro_bits.append(_clean_text(profile.course))
    if _clean_text(profile.university):
        intro_bits.append(_clean_text(profile.university))

    interests = _safe_list(profile.interests, 4)
    qualities = _safe_list(profile.qualities, 3)
    traits = _infer_traits(profile)
    looking_for = _clean_text(profile.looking_for)

    descriptor_parts = traits or qualities or interests
    descriptor = ", ".join(descriptor_parts[:3]) if descriptor_parts else "open and still being learned"

    summary = f"{name}"
    if intro_bits:
        summary += f" is a {' '.join(intro_bits)} profile"
    else:
        summary += " is a StrathSpace profile"
    summary += f" who seems {descriptor}."

    if interests:
        summary += f" They mention {', '.join(interests[:3])}."
    if looking_for:
        summary += f" They are looking for {looking_for}."

    search_lines = [
        f"user_id: {profile.user_id or ''}",
        f"name: {name}",
        f"gender: {_clean_text(profile.gender)}",
        f"age: {profile.age or ''}",
        f"university: {_clean_text(profile.university)}",
        f"course: {_clean_text(profile.course)}",
        f"year_of_study: {profile.year_of_study or ''}",
        f"traits: {', '.join(traits)}",
        f"qualities: {', '.join(qualities)}",
        f"interests: {', '.join(interests)}",
        f"looking_for: {looking_for}",
        f"bio: {_clean_text(profile.bio)}",
        f"about_me: {_clean_text(profile.about_me)}",
        f"prompts: {' | '.join(_prompt_responses(profile.prompts))}",
    ]

    return ProfileSummaryResponse(
        profileSummary=summary,
        searchText="\n".join(line for line in search_lines if not line.endswith(": ")),
    )


def text_embedding(text: str) -> list[float]:
    normalized = _clean_text(text).lower().encode("utf-8")
    return _hash_embedding(normalized or b"empty-profile-text")


def analyze_photo_bytes(image_bytes: bytes | None, photo_count: int) -> PhotoPresentationResponse:
    if not image_bytes:
        return PhotoPresentationResponse(
            photoPresentationScore=20 if photo_count > 0 else 0,
            faceVisible=False,
            imageClear=False,
            lightingScore=0,
            hasMultiplePeople=False,
            isObjectOnly=photo_count == 0,
            moderationStatus="pending",
        )

    digest = hashlib.sha256(image_bytes).digest()
    size_score = min(35, len(image_bytes) // 4_000)
    lighting_score = 35 + digest[0] % 61
    clarity_score = 20 + digest[1] % 56
    image_clear = clarity_score >= 45 and lighting_score >= 40

    # MVP heuristic until real vision models are plugged in. This is presentation
    # quality only, not attractiveness or identity inference.
    face_visible = len(image_bytes) > 1_000
    has_multiple_people = False
    is_object_only = not face_visible
    photo_count_bonus = min(10, max(0, photo_count - 1) * 5)
    score = max(0, min(100, round(size_score + lighting_score * 0.25 + clarity_score * 0.25 + photo_count_bonus + (20 if face_visible else 0))))

    return PhotoPresentationResponse(
        photoPresentationScore=score,
        faceVisible=face_visible,
        imageClear=image_clear,
        lightingScore=lighting_score,
        hasMultiplePeople=has_multiple_people,
        isObjectOnly=is_object_only,
        moderationStatus="approved" if face_visible and image_clear else "pending",
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_auth)])
async def embed(request: EmbedRequest) -> EmbedResponse:
    try:
        image_bytes = await _download_image(request.photo_url)
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {error}") from error

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image payload")

    return EmbedResponse(embedding=_hash_embedding(image_bytes))


@app.post("/reanalyze-batch", dependencies=[Depends(require_auth)])
async def reanalyze_batch(request: BatchReanalyzeRequest) -> dict[str, Any]:
    results: list[dict[str, Any]] = []

    for item in request.items:
        try:
            embedding = (await embed(item)).embedding
            results.append(
                {
                    "photo_url": item.photo_url,
                    "object_key": item.object_key,
                    "embedding": embedding,
                    "status": "ok",
                }
            )
        except HTTPException as error:
            results.append(
                {
                    "photo_url": item.photo_url,
                    "object_key": item.object_key,
                    "status": "error",
                    "detail": error.detail,
                }
            )

    return {"processed": len(results), "results": results}


@app.post("/profiles/summarize", response_model=ProfileSummaryResponse, dependencies=[Depends(require_auth)])
async def summarize_profile(request: ProfileSummaryRequest) -> ProfileSummaryResponse:
    return build_profile_summary(request.profile)


@app.post("/profiles/embed-text", response_model=TextEmbeddingResponse, dependencies=[Depends(require_auth)])
async def embed_text(request: TextEmbeddingRequest) -> TextEmbeddingResponse:
    return TextEmbeddingResponse(embedding=text_embedding(request.text))


@app.post("/profiles/embed-image", response_model=EmbedResponse, dependencies=[Depends(require_auth)])
async def embed_image(request: EmbedRequest) -> EmbedResponse:
    return await embed(request)


@app.post("/profiles/analyze", response_model=ProfileAnalyzeResponse, dependencies=[Depends(require_auth)])
async def analyze_profile(request: ProfileAnalyzeRequest) -> ProfileAnalyzeResponse:
    summary = build_profile_summary(request.profile)
    text = f"{summary.profileSummary}\n{summary.searchText}"
    photo_url = request.profile.photo_url or (request.profile.photos[0] if request.profile.photos else None)
    photo_count = len([photo for photo in [request.profile.photo_url, *request.profile.photos] if photo])
    image_bytes: bytes | None = None
    visual_embedding: list[float] | None = None

    if photo_url:
        try:
            image_bytes = await _download_image(photo_url)
            if image_bytes:
                visual_embedding = _hash_embedding(image_bytes)
        except Exception:
            image_bytes = None
            visual_embedding = None

    return ProfileAnalyzeResponse(
        profileSummary=summary.profileSummary,
        searchText=summary.searchText,
        structuredTags=build_structured_tags(request.profile),
        textEmbedding=text_embedding(text),
        photoPresentation=analyze_photo_bytes(image_bytes, photo_count),
        visualEmbedding=visual_embedding,
    )


@app.post("/profiles/batch-analyze", dependencies=[Depends(require_auth)])
async def batch_analyze_profiles(request: BatchAnalyzeRequest) -> dict[str, Any]:
    results: list[dict[str, Any]] = []

    for item in request.items:
        try:
            analysis = await analyze_profile(item)
            results.append(
                {
                    "user_id": item.profile.user_id,
                    "status": "ok",
                    "analysis": analysis.model_dump(),
                }
            )
        except HTTPException as error:
            results.append(
                {
                    "user_id": item.profile.user_id,
                    "status": "error",
                    "detail": error.detail,
                }
            )
        except Exception as error:  # noqa: BLE001
            results.append(
                {
                    "user_id": item.profile.user_id,
                    "status": "error",
                    "detail": str(error),
                }
            )

    return {"processed": len(results), "results": results}
