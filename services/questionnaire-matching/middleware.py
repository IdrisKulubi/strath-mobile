"""Small ASGI middleware used by the standalone service."""

import json
import secrets
from collections.abc import Awaitable, Callable
from typing import Any

from settings import MAX_BODY_BYTES, service_secret

Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]


class RankAuthenticationMiddleware:
    """Authenticate the private scoring route before request-body validation."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Receive, send: Send):
        if scope["type"] != "http" or scope.get("path") != "/v1/rank":
            await self.app(scope, receive, send)
            return

        authorization = _header(scope.get("headers", []), b"authorization")
        scheme, _, supplied = authorization.partition(" ")
        expected = service_secret()
        if (
            not expected
            or scheme.lower() != "bearer"
            or not supplied
            or not secrets.compare_digest(supplied, expected)
        ):
            body = json.dumps({"detail": "Invalid service credentials"}).encode()
            await send(
                {
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(body)).encode()),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return

        await self.app(scope, receive, send)


class RequestBodyLimitMiddleware:
    """Limit actual streamed bytes, including requests without Content-Length."""

    def __init__(self, app, max_bytes: int = MAX_BODY_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict[str, Any], receive: Receive, send: Send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        content_length = _content_length(scope.get("headers", []))
        if content_length is not None and content_length > self.max_bytes:
            await self._reject(send)
            return

        messages: list[dict[str, Any]] = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            total += len(message.get("body", b""))
            if total > self.max_bytes:
                await self._reject(send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay() -> dict[str, Any]:
            return messages.pop(0) if messages else await receive()

        await self.app(scope, replay, send)

    @staticmethod
    async def _reject(send: Send):
        body = json.dumps({"detail": "Request body exceeds the service limit"}).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


def _content_length(headers: list[tuple[bytes, bytes]]) -> int | None:
    for name, value in headers:
        if name.lower() == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


def _header(headers: list[tuple[bytes, bytes]], target: bytes) -> str:
    for name, value in headers:
        if name.lower() == target:
            return value.decode("latin-1")
    return ""
