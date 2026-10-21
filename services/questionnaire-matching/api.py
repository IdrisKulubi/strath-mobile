"""FastAPI composition and HTTP handlers."""

import secrets

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from engine import ALGORITHM_VERSION, rank_candidates
from middleware import RankAuthenticationMiddleware, RequestBodyLimitMiddleware
from models import HealthResponse, RankRequest, RankResponse
from settings import service_secret


def create_app() -> FastAPI:
    app = FastAPI(
        title="Strathspace questionnaire matching",
        description=(
            "Internal, stateless compatibility scoring. Payloads contain opaque IDs "
            "and structured answers only."
        ),
        version=ALGORITHM_VERSION,
    )
    app.add_middleware(RequestBodyLimitMiddleware)
    app.add_middleware(RankAuthenticationMiddleware)
    bearer = HTTPBearer(auto_error=False)

    @app.get("/health", response_model=HealthResponse, tags=["operations"])
    def health():
        if not service_secret():
            raise HTTPException(503, "Service secret is not configured")
        return {"status": "ok", "algorithmVersion": ALGORITHM_VERSION}

    @app.post("/v1/rank", response_model=RankResponse, tags=["matching"])
    def calculate(
        body: RankRequest,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ):
        expected_secret = service_secret()
        supplied = credentials.credentials if credentials else ""
        valid_scheme = credentials is not None and credentials.scheme.lower() == "bearer"
        if (
            not expected_secret
            or not valid_scheme
            or not secrets.compare_digest(supplied, expected_secret)
        ):
            raise HTTPException(401, "Invalid service credentials")

        payload = body.model_dump()
        return {
            "results": rank_candidates(payload["viewer"], payload["candidates"]),
        }

    return app
