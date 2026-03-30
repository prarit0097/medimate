from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User

from .models import DoseLog, Medication, Patient


class CareApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="strongpass123",
            full_name="Owner User",
            role="caregiver",
        )
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "owner@example.com", "password": "strongpass123"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def test_patient_medication_and_dashboard_flow(self):
        patient_response = self.client.post(
            "/api/v1/patients/",
            {
                "full_name": "Shanti Devi",
                "preferred_language": "hi",
                "timezone": "Asia/Kolkata",
                "voice_reminders_enabled": True,
            },
            format="json",
        )
        self.assertEqual(patient_response.status_code, status.HTTP_201_CREATED)
        patient_id = patient_response.data["id"]

        medication_response = self.client.post(
            "/api/v1/medications/",
            {
                "patient": patient_id,
                "name": "Metformin",
                "generic_name": "Metformin",
                "strength": "500 mg",
                "dosage_form": "tablet",
                "meal_relation": "after_meal",
                "start_date": timezone.localdate().isoformat(),
                "current_quantity": "30",
                "total_quantity": "30",
                "low_stock_threshold_days": 5,
                "reminders": [
                    {
                        "label": "Breakfast",
                        "time_of_day": "08:00:00",
                        "dose_quantity": "1",
                        "recurrence_type": "daily",
                        "weekdays": [],
                        "is_active": True,
                    },
                    {
                        "label": "Dinner",
                        "time_of_day": "20:00:00",
                        "dose_quantity": "1",
                        "recurrence_type": "daily",
                        "weekdays": [],
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(medication_response.status_code, status.HTTP_201_CREATED)
        medication_id = medication_response.data["id"]

        patient = Patient.objects.get(pk=patient_id)
        medication = Medication.objects.get(pk=medication_id)

        DoseLog.objects.create(
            patient=patient,
            medication=medication,
            scheduled_for=timezone.now() - timedelta(hours=8),
            actioned_at=timezone.now() - timedelta(hours=8),
            status=DoseLog.Status.TAKEN,
            source=DoseLog.Source.APP,
            logged_by=self.user,
        )
        DoseLog.objects.create(
            patient=patient,
            medication=medication,
            scheduled_for=timezone.now() - timedelta(hours=1),
            status=DoseLog.Status.MISSED,
            source=DoseLog.Source.SYSTEM,
            logged_by=self.user,
        )

        dashboard_response = self.client.get(f"/api/v1/dashboard/patients/{patient_id}/")
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_response.data["dashboard"]["adherence_score"], 50.0)
        self.assertEqual(dashboard_response.data["dashboard"]["active_medications"], 1)
