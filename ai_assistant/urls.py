from django.urls import path

from .views import AIAssistView, AIStatusView

urlpatterns = [
    path("status/", AIStatusView.as_view(), name="ai-status"),
    path("assist/", AIAssistView.as_view(), name="ai-assist"),
]
