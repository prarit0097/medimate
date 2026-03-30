from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CaregiverRelationshipViewSet,
    DoseLogViewSet,
    MedicationViewSet,
    PatientDashboardView,
    PatientViewSet,
    PrescriptionUploadViewSet,
    ProviderAccessViewSet,
)

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patient")
router.register("caregiver-links", CaregiverRelationshipViewSet, basename="caregiver-link")
router.register("provider-access", ProviderAccessViewSet, basename="provider-access")
router.register("prescriptions", PrescriptionUploadViewSet, basename="prescription")
router.register("medications", MedicationViewSet, basename="medication")
router.register("dose-logs", DoseLogViewSet, basename="dose-log")

urlpatterns = router.urls + [
    path("dashboard/patients/<uuid:patient_id>/", PatientDashboardView.as_view(), name="patient-dashboard"),
]

