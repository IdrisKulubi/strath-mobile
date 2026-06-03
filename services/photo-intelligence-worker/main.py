"""
StrathSpace photo intelligence worker (Railway).

Generates CLIP-style image embeddings for profile photos. The Next.js backend
calls POST /embed with a bearer token when PHOTO_INTELLIGENCE_SERVICE_URL is set.
"""

from __future__ import annotations

import hashlib
import os
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="StrathSpace Photo Intelligence", version="1.0.0")

EMBEDDING_DIM = 768
PROVIDER = "clip-hash"
MODEL = "hash-v1"


class EmbedRequest(BaseModel):
    photo_url: str
    object_key: str | None = None


class EmbedResponse(BaseModel):
    embedding: list[float] = Field(min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)
    provider: str = PROVIDER
    model: str = MODEL


class BatchReanalyzeRequest(BaseModel):
    items: list[EmbedRequest]


def require_auth(authorization: str | None = Header(default=None)) -> None:
    secret = os.getenv("PHOTO_INTELLIGENCE_SERVICE_SECRET", "").strip()
    if not secret:
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if token != secret:
        raise HTTPException(status_code=401, detail="Invalid bearer token")


def _hash_embedding(image_bytes: bytes) -> list[float]:
    """
    Deterministic pseudo-embedding for MVP when torch/CLIP is not installed.
    Replace with real CLIP inference when deploying a GPU or larger image on Railway.
    """
    digest = hashlib.sha256(image_bytes).digest()
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
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(photo_url)
        response.raise_for_status()
        return response.content


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
