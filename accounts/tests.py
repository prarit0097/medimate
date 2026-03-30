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

    def test_profile_update_user_directory_and_password_change(self):
        user = User.objects.create_user(
            email="doctor@example.com",
            password="strongpass123",
            full_name="Demo Doctor",
            role="doctor",
            preferred_language="en",
            timezone="Asia/Kolkata",
            phone_number="+911111111111",
        )
        caregiver = User.objects.create_user(
            email="helper@example.com",
            password="helperpass123",
            full_name="Helpful Caregiver",
            role="caregiver",
            preferred_language="hi",
            timezone="Asia/Kolkata",
        )

        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "doctor@example.com", "password": "strongpass123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        update_response = self.client.patch(
            "/api/v1/auth/me/",
            {
                "full_name": "Updated Doctor",
                "phone_number": "+919999999999",
                "preferred_language": "hi",
                "timezone": "Asia/Dubai",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.full_name, "Updated Doctor")
        self.assertEqual(user.phone_number, "+919999999999")

        directory_response = self.client.get("/api/v1/auth/users/?role=caregiver&q=help")
        self.assertEqual(directory_response.status_code, status.HTTP_200_OK)
        self.assertEqual(directory_response.data["count"], 1)
        self.assertEqual(directory_response.data["results"][0]["id"], str(caregiver.id))

        password_change_response = self.client.post(
            "/api/v1/auth/change-password/",
            {
                "current_password": "strongpass123",
                "new_password": "newpass1234",
            },
            format="json",
        )
        self.assertEqual(password_change_response.status_code, status.HTTP_200_OK)

        self.client.credentials()
        relogin_response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "doctor@example.com", "password": "newpass1234"},
            format="json",
        )
        self.assertEqual(relogin_response.status_code, status.HTTP_200_OK)
