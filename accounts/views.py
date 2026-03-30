from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ChangePasswordSerializer,
    MediMateTokenObtainPairSerializer,
    RegisterSerializer,
    UpdateUserSerializer,
    UserSerializer,
)
from .models import User


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = MediMateTokenObtainPairSerializer


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UpdateUserSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class UserDirectoryView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.filter(is_active=True).order_by("full_name", "email")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        query = self.request.query_params.get("q")

        if role:
            roles = [item.strip() for item in role.split(",") if item.strip()]
            if roles:
                queryset = queryset.filter(role__in=roles)

        if query:
            queryset = queryset.filter(
                Q(full_name__icontains=query)
                | Q(email__icontains=query)
                | Q(phone_number__icontains=query)
            )

        return queryset


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."})
