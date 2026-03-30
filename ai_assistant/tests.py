from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from ai_assistant.services import AIResponseError


class AIAssistantTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="caregiver@example.com",
            password="medimate123",
            full_name="Caregiver User",
            role=User.Role.CAREGIVER,
        )
        self.client.force_authenticate(self.user)

    @override_settings(OPENAI_API_KEY="", OPENAI_MODEL="gpt-5-mini")
    def test_status_endpoint_reports_missing_configuration(self):
        response = self.client.get("/api/v1/ai/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["enabled"])
        self.assertIn("OPENAI_API_KEY", response.data["missing_configuration"])

    @patch("ai_assistant.views.generate_ai_assist_response")
    def test_assist_endpoint_returns_ai_payload(self, mock_generate):
        mock_generate.return_value = {
            "title": "Workspace summary",
            "summary": "Adherence needs attention for one patient.",
            "highlights": ["One refill alert is due soon."],
            "actions": ["Follow up with the caregiver today."],
            "warnings": [],
            "disclaimer": "AI support does not replace a clinician.",
            "surface": "dashboard",
            "model": "gpt-5-mini",
            "generated_at": "2026-03-30T10:00:00+05:30",
        }

        response = self.client.post(
            "/api/v1/ai/assist/",
            {
                "surface": "dashboard",
                "question": "What needs attention today?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["surface"], "dashboard")
        self.assertEqual(response.data["title"], "Workspace summary")
        mock_generate.assert_called_once()

    @patch("ai_assistant.views.generate_ai_assist_response")
    def test_assist_endpoint_handles_openai_failures(self, mock_generate):
        mock_generate.side_effect = AIResponseError("OpenAI request failed: model rejected the request.")

        response = self.client.post(
            "/api/v1/ai/assist/",
            {
                "surface": "dashboard",
                "question": "What needs attention today?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("OpenAI request failed", response.data["detail"])
