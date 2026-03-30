from django.contrib import admin

from .models import (
    CaregiverRelationship,
    DoseLog,
    Medication,
    MedicationReminder,
    Patient,
    PrescriptionUpload,
    ProviderAccess,
)

admin.site.register(Patient)
admin.site.register(CaregiverRelationship)
admin.site.register(ProviderAccess)
admin.site.register(PrescriptionUpload)
admin.site.register(Medication)
admin.site.register(MedicationReminder)
admin.site.register(DoseLog)
