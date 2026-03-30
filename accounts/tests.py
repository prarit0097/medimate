from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthenticationApiTests(APITestCase):
    def test_register_login_and_me_flow(self):
        register_response = self.client.post(
            "/api/v1/auth/register/",
            {
                "email": "caregiver@example.com",
                "password": "strongpass123",
                "full_name": "Primary Caregiver",
                "role": "caregiver",
                "preferred_language": "hi",
                "timezone": "Asia/Kolkata",
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            User.objects.filter(email="caregiver@example.com", role="caregiver").exists()
        )

        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "caregiver@example.com", "password": "strongpass123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        me_response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "caregiver@example.com")
