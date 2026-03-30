from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class MediMateUserAdmin(UserAdmin):
    model = User
    ordering = ("email",)
    list_display = (
        "email",
        "full_name",
        "role",
        "phone_number",
        "is_staff",
        "is_active",
    )
    search_fields = ("email", "full_name", "phone_number")
    readonly_fields = ("created_at", "updated_at", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Profile",
            {
                "fields": (
                    "full_name",
                    "phone_number",
                    "role",
                    "preferred_language",
                    "timezone",
                    "is_phone_verified",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "password1",
                    "password2",
                    "role",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )
