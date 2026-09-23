"""Phase 1 service limits and environment configuration."""

import os

MAX_BODY_BYTES = 4_000_000
MAX_CANDIDATES = 25
MAX_ANSWERS_PER_PERSON = 500
MAX_ACCEPTABLE_ANSWERS = 20


def service_secret() -> str:
    """Read the secret at request time so rotation and tests are predictable."""
    return os.environ.get("MATCHING_SERVICE_SECRET", "")
