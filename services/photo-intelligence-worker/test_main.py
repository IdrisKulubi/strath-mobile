import os
import unittest

from fastapi.testclient import TestClient

import main


class ProfileIntelligenceWorkerTest(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["PHOTO_INTELLIGENCE_SERVICE_SECRET"] = "test-secret"
        self.client = TestClient(main.app)
        self.headers = {"Authorization": "Bearer test-secret"}

    def test_health_is_public(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_profile_endpoint_rejects_missing_auth(self) -> None:
        response = self.client.post(
            "/profiles/summarize",
            json={"profile": {"user_id": "u1", "first_name": "John"}},
        )
        self.assertEqual(response.status_code, 401)

    def test_summarize_profile_returns_summary_and_search_text(self) -> None:
        response = self.client.post(
            "/profiles/summarize",
            headers=self.headers,
            json={
                "profile": {
                    "user_id": "u1",
                    "first_name": "John",
                    "age": 22,
                    "course": "Computer Science",
                    "university": "Strathmore",
                    "interests": ["music", "tech"],
                    "looking_for": "intentional dating",
                }
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("John", body["profileSummary"])
        self.assertIn("Computer Science", body["searchText"])
        self.assertEqual(body["summaryVersion"], "profile_summary_v1")

    def test_text_embedding_is_deterministic_768_dimensions(self) -> None:
        payload = {"text": "calm serious active today"}
        first = self.client.post("/profiles/embed-text", headers=self.headers, json=payload)
        second = self.client.post("/profiles/embed-text", headers=self.headers, json=payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["embedding"]), 768)
        self.assertEqual(first.json()["embedding"], second.json()["embedding"])
        self.assertEqual(first.json()["provider"], "text-hash")

    def test_analyze_profile_without_photo_returns_schema(self) -> None:
        response = self.client.post(
            "/profiles/analyze",
            headers=self.headers,
            json={
                "profile": {
                    "user_id": "u1",
                    "first_name": "Amina",
                    "interests": ["coffee", "reading"],
                }
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["textEmbedding"]), 768)
        self.assertEqual(body["photoPresentation"]["photoPresentationScore"], 0)
        self.assertIsNone(body["visualEmbedding"])

    def test_batch_analyze_returns_one_result_per_item(self) -> None:
        response = self.client.post(
            "/profiles/batch-analyze",
            headers=self.headers,
            json={
                "items": [
                    {"profile": {"user_id": "u1", "first_name": "Amina"}},
                    {"profile": {"user_id": "u2", "first_name": "Brian"}},
                ]
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["processed"], 2)
        self.assertEqual([item["status"] for item in body["results"]], ["ok", "ok"])


if __name__ == "__main__":
    unittest.main()
