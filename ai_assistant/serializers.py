from rest_framework import serializers

from .services import SUPPORTED_SURFACES


class AIAssistRequestSerializer(serializers.Serializer):
    surface = serializers.ChoiceField(choices=SUPPORTED_SURFACES)
    patient_id = serializers.UUIDField(required=False)
    medication_id = serializers.UUIDField(required=False)
    prescription_id = serializers.UUIDField(required=False)
    question = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        if attrs["surface"] == "patient" and not attrs.get("patient_id"):
            raise serializers.ValidationError(
                {"patient_id": "A patient_id is required for patient-level AI insights."}
            )
        return attrs
