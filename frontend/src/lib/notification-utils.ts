import type {
  CaregiverRelationshipRecord,
  DoseLogRecord,
  MedicationRecord,
  PatientRecord,
  PrescriptionUploadRecord,
} from "@/types";

export interface NotificationPreferences {
  missedDoseAlerts: boolean;
  refillReminders: boolean;
  weeklySummary: boolean;
  caregiverUpdates: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  severity: "info" | "warning" | "danger" | "success";
  href: string;
  kind: "missed-dose" | "refill" | "weekly-summary" | "caregiver-update" | "prescription";
}

export const NOTIFICATION_STORAGE_KEY = "medimate_notification_preferences";
export const NOTIFICATION_PREFERENCES_EVENT = "medimate:notification-preferences-updated";
export const READ_NOTIFICATIONS_STORAGE_KEY = "medimate_read_notifications";
export const BROWSER_NOTIFICATIONS_STORAGE_KEY = "medimate_browser_notifications_sent";

export const defaultNotificationPreferences: NotificationPreferences = {
  missedDoseAlerts: true,
  refillReminders: true,
  weeklySummary: true,
  caregiverUpdates: true,
};

const dayMs = 1000 * 60 * 60 * 24;
const severityRank = { danger: 4, warning: 3, info: 2, success: 1 };

function isRecent(dateValue: string, days: number, now = new Date()) {
  const diff = (now.getTime() - new Date(dateValue).getTime()) / dayMs;
  return diff >= 0 && diff <= days;
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getWeekKey(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = Math.floor((now.getTime() - start.getTime()) / dayMs);
  return `${now.getFullYear()}-${Math.ceil((diff + start.getDay() + 1) / 7)}`;
}

export function loadNotificationPreferences(): NotificationPreferences {
  const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!stored) {
    return defaultNotificationPreferences;
  }

  try {
    return {
      ...defaultNotificationPreferences,
      ...(JSON.parse(stored) as Partial<NotificationPreferences>),
    };
  } catch {
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    return defaultNotificationPreferences;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_EVENT));
}

export function loadStoredIds(storageKey: string) {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(storageKey);
    return [] as string[];
  }
}

export function saveStoredIds(storageKey: string, ids: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(ids));
}

export function formatNotificationTime(timestamp: string) {
  const diffMinutes = Math.round((Date.now() - new Date(timestamp).getTime()) / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(timestamp);
}

export function buildAppNotifications({
  patients,
  medications,
  doseLogs,
  prescriptions,
  caregivers,
  preferences,
}: {
  patients: PatientRecord[];
  medications: MedicationRecord[];
  doseLogs: DoseLogRecord[];
  prescriptions: PrescriptionUploadRecord[];
  caregivers: CaregiverRelationshipRecord[];
  preferences: NotificationPreferences;
}) {
  const now = new Date();
  const patientMap = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  const medicationMap = Object.fromEntries(medications.map((medication) => [medication.id, medication]));
  const notifications: AppNotification[] = [];

  if (preferences.missedDoseAlerts) {
    doseLogs
      .filter((log) => log.status === "missed" && isRecent(log.scheduled_for, 7, now))
      .sort((left, right) => new Date(right.scheduled_for).getTime() - new Date(left.scheduled_for).getTime())
      .slice(0, 5)
      .forEach((log) => {
        const patient = patientMap[log.patient];
        const medication = medicationMap[log.medication];
        notifications.push({
          id: `missed-${log.id}`,
          title: `${patient?.full_name || "Patient"} missed ${medication?.name || "a dose"}`,
          description: `Scheduled on ${formatDate(log.scheduled_for)}. Review and log follow-up from the dashboard or dose logs.`,
          createdAt: log.scheduled_for,
          severity: "danger",
          href: patient ? `/app/patients/${patient.id}` : "/app/dose-logs",
          kind: "missed-dose",
        });
      });
  }

  if (preferences.refillReminders) {
    medications
      .filter((medication) => {
        if (!medication.estimated_refill_date) {
          return false;
        }
        const diff = (new Date(medication.estimated_refill_date).getTime() - now.getTime()) / dayMs;
        return diff <= 7;
      })
      .sort((left, right) => (left.estimated_refill_date || "").localeCompare(right.estimated_refill_date || ""))
      .slice(0, 5)
      .forEach((medication) => {
        const patient = patientMap[medication.patient];
        notifications.push({
          id: `refill-${medication.id}-${medication.estimated_refill_date || "soon"}`,
          title: `Refill due for ${medication.name}`,
          description: `${patient?.full_name || "Patient"} has ${medication.current_quantity} doses left. Refill by ${medication.estimated_refill_date ? formatDate(medication.estimated_refill_date) : "soon"}.`,
          createdAt: medication.updated_at,
          severity: "warning",
          href: "/app/medications",
          kind: "refill",
        });
      });
  }

  prescriptions
    .filter((prescription) => ["pending", "needs_clarification"].includes(prescription.status))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 3)
    .forEach((prescription) => {
      const patient = patientMap[prescription.patient];
      notifications.push({
        id: `prescription-${prescription.id}`,
        title:
          prescription.status === "needs_clarification"
            ? "Prescription needs clarification"
            : "Prescription awaiting review",
        description: `${patient?.full_name || "Patient"} has an uploaded prescription that still needs follow-up.`,
        createdAt: prescription.created_at,
        severity: prescription.status === "needs_clarification" ? "warning" : "info",
        href: "/app/prescriptions",
        kind: "prescription",
      });
    });

  if (preferences.caregiverUpdates) {
    doseLogs
      .filter((log) => log.source === "caregiver" && isRecent(log.created_at, 7, now))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 3)
      .forEach((log) => {
        const patient = patientMap[log.patient];
        const medication = medicationMap[log.medication];
        notifications.push({
          id: `caregiver-log-${log.id}`,
          title: "Caregiver recorded a dose update",
          description: `${patient?.full_name || "Patient"}: ${medication?.name || "Medication"} was marked ${log.status}.`,
          createdAt: log.created_at,
          severity: "info",
          href: "/app/dose-logs",
          kind: "caregiver-update",
        });
      });

    caregivers
      .filter((link) => isRecent(link.created_at, 7, now))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 2)
      .forEach((link) => {
        const patient = patientMap[link.patient];
        notifications.push({
          id: `caregiver-link-${link.id}`,
          title: "New caregiver linked",
          description: `${patient?.full_name || "Patient"} now has a ${link.relationship_type} caregiver relationship configured.`,
          createdAt: link.created_at,
          severity: "success",
          href: "/app/caregivers",
          kind: "caregiver-update",
        });
      });
  }

  if (preferences.weeklySummary && patients.length > 0) {
    const patientsBelowTarget = patients.filter(
      (patient) => (patient.adherence_summary.adherence_score ?? 0) > 0 && (patient.adherence_summary.adherence_score ?? 0) < 80,
    ).length;
    const refillCount = medications.filter((medication) => {
      if (!medication.estimated_refill_date) return false;
      return (new Date(medication.estimated_refill_date).getTime() - now.getTime()) / dayMs <= 7;
    }).length;
    const missedThisWeek = doseLogs.filter(
      (log) => log.status === "missed" && isRecent(log.scheduled_for, 7, now),
    ).length;

    notifications.push({
      id: `weekly-summary-${getWeekKey(now)}`,
      title: "Weekly care summary",
      description: `${patientsBelowTarget} patients below 80% adherence, ${missedThisWeek} missed doses this week, ${refillCount} refill alerts pending.`,
      createdAt: now.toISOString(),
      severity: patientsBelowTarget > 0 || missedThisWeek > 0 ? "warning" : "info",
      href: "/app/reports",
      kind: "weekly-summary",
    });
  }

  return notifications
    .sort((left, right) => {
      const severityDiff = severityRank[right.severity] - severityRank[left.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .slice(0, 12);
}
