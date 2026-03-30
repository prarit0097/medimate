from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CaregiverRelationship,
    DoseLog,
    Medication,
    PrescriptionUpload,
    ProviderAccess,
)
from .prescription_ai import (
    PrescriptionAIError,
    PrescriptionAIConfigurationError,
    PrescriptionAIResponseError,
    create_medications_from_extraction,
    extract_prescription_with_ai,
)
from .serializers import (
    CaregiverRelationshipSerializer,
    DoseLogSerializer,
    MedicationSerializer,
    PatientSerializer,
    PrescriptionUploadSerializer,
    ProviderAccessSerializer,
)
from .services import accessible_patients_queryset, adherence_summary_for_patient


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("active", "preferred_language")
    ordering_fields = ("full_name", "created_at", "updated_at")
    search_fields = ("full_name", "phone_number", "whatsapp_number")

    def get_queryset(self):
        return accessible_patients_queryset(self.request.user).select_related(
            "account",
            "created_by",
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CaregiverRelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = CaregiverRelationshipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("patient", "relationship_type", "is_primary")
    ordering_fields = ("created_at", "updated_at")

    def get_queryset(self):
        return CaregiverRelationship.objects.filter(
            patient__in=accessible_patients_queryset(self.request.user)
        ).select_related("patient", "caregiver")


class ProviderAccessViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderAccessSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("patient", "provider_role", "organization")
    ordering_fields = ("created_at", "updated_at")

    def get_queryset(self):
        return ProviderAccess.objects.filter(
            patient__in=accessible_patients_queryset(self.request.user)
        ).select_related("patient", "provider")


class PrescriptionUploadViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionUploadSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ("status", "patient")
    ordering_fields = ("created_at", "updated_at")

    def get_queryset(self):
        return PrescriptionUpload.objects.filter(
            patient__in=accessible_patients_queryset(self.request.user)
        ).select_related("patient", "uploaded_by")

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="extract-ai")
    def extract_ai(self, request, pk=None):
        prescription = self.get_object()
        try:
            updated_prescription = extract_prescription_with_ai(prescription)
        except PrescriptionAIConfigurationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except PrescriptionAIResponseError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except PrescriptionAIError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(updated_prescription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="create-medications")
    def create_medications(self, request, pk=None):
        prescription = self.get_object()
        try:
            result = create_medications_from_extraction(prescription, request.user)
        except PrescriptionAIError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Medication drafts created from prescription extraction.",
                **result,
            },
            status=status.HTTP_201_CREATED if result["created_count"] else status.HTTP_200_OK,
        )


class MedicationViewSet(viewsets.ModelViewSet):
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("patient", "status", "meal_relation", "is_high_risk")
    ordering_fields = ("name", "start_date", "created_at", "updated_at")

    def get_queryset(self):
        return (
            Medication.objects.filter(patient__in=accessible_patients_queryset(self.request.user))
            .select_related("patient", "prescription", "created_by")
            .prefetch_related("reminders")
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DoseLogViewSet(viewsets.ModelViewSet):
    serializer_class = DoseLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("medication", "patient", "status", "source")
    ordering_fields = ("scheduled_for", "created_at", "updated_at")

    def get_queryset(self):
        return DoseLog.objects.filter(
            patient__in=accessible_patients_queryset(self.request.user)
        ).select_related("patient", "medication", "reminder", "logged_by")


class PatientDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        patient = get_object_or_404(
            accessible_patients_queryset(request.user),
            pk=patient_id,
        )
        return Response(
            {
                "patient": PatientSerializer(patient, context={"request": request}).data,
                "dashboard": adherence_summary_for_patient(patient, days=30),
            }
        )
