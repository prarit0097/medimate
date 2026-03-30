from django.core.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AIAssistRequestSerializer
from .services import (
    AIConfigurationError,
    AIResponseError,
    ai_status,
    generate_ai_assist_response,
)


class AIStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ai_status())


class AIAssistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AIAssistRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = generate_ai_assist_response(
                user=request.user,
                **serializer.validated_data,
            )
        except AIConfigurationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except AIResponseError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(payload)
