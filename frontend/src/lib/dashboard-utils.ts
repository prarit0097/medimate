import { getAdherenceScore, getRefillRisk } from "@/lib/patient-utils";
import type { DoseLogRecord, MedicationRecord, PatientRecord } from "@/types";

export type DashboardScheduleStatus = DoseLogRecord["status"] | "pending";

export interface DashboardScheduleItem {
  key: string;
  patient: PatientRecord;
  medication: MedicationRecord;
  scheduledFor: string;
  status: DashboardScheduleStatus;
  reminderId?: string | null;
  logId?: string;
  source?: DoseLogRecord["source"];
  note?: string;
}

const DAY = 1000 * 60 * 60 * 24;
const riskRank = { high: 3, medium: 2, low: 1 };

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function weekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function withTime(date: Date, time?: string | null) {
  const [hours = "9", minutes = "0"] = (time || "09:00").split(":");
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours),
    Number(minutes),
    0,
    0,
  ).toISOString();
}

function adherence(logs: DoseLogRecord[]) {
  const actionable = logs.filter((log) =>
    ["taken", "missed", "skipped"].includes(log.status),
  );
  if (actionable.length === 0) return 0;
  return Math.round(
    (actionable.filter((log) => log.status === "taken").length / actionable.length) * 100,
  );
}

function activeToday(medication: MedicationRecord, today: Date) {
  const todayKey = dateKey(today);
  return (
    medication.status === "active" &&
    medication.start_date <= todayKey &&
    (!medication.end_date || medication.end_date >= todayKey)
  );
}

function dueToday(
  medication: MedicationRecord,
  reminder: MedicationRecord["reminders"][number],
  today: Date,
) {
  if (!reminder.is_active) return false;
  const todayWeekday = weekday(today);

  switch (reminder.recurrence_type) {
    case "daily":
      return true;
    case "specific_days":
      return reminder.weekdays.includes(todayWeekday);
    case "weekly":
      return reminder.weekdays.length > 0
        ? reminder.weekdays.includes(todayWeekday)
        : weekday(new Date(medication.start_date)) === todayWeekday;
    case "alternate_days":
      return (
        (startOfDay(today).getTime() - startOfDay(new Date(medication.start_date)).getTime()) /
          DAY >=
          0 &&
        ((startOfDay(today).getTime() -
          startOfDay(new Date(medication.start_date)).getTime()) /
          DAY) %
          2 ===
          0
      );
    default:
      return false;
  }
}

export function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function buildDashboardData(
  patients: PatientRecord[],
  medications: MedicationRecord[],
  doseLogs: DoseLogRecord[],
) {
  const now = new Date();
  const todayKey = dateKey(now);
  const patientMap = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  const medicationMap = Object.fromEntries(medications.map((medication) => [medication.id, medication]));

  const last30 = doseLogs.filter((log) => (now.getTime() - new Date(log.scheduled_for).getTime()) / DAY <= 30);
  const last7 = doseLogs.filter((log) => (now.getTime() - new Date(log.scheduled_for).getTime()) / DAY <= 7);
  const prev7 = doseLogs.filter((log) => {
    const diff = (now.getTime() - new Date(log.scheduled_for).getTime()) / DAY;
    return diff > 7 && diff <= 14;
  });

  const todayLogs = doseLogs
    .filter((log) => dateKey(log.scheduled_for) === todayKey)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const todayLogByReminder = new Map<string, DoseLogRecord>();
  todayLogs.forEach((log) => {
    if (log.reminder && !todayLogByReminder.has(`${log.medication}:${log.reminder}`)) {
      todayLogByReminder.set(`${log.medication}:${log.reminder}`, log);
    }
  });

  const schedule: DashboardScheduleItem[] = [];
  const seen = new Set<string>();
  medications.forEach((medication) => {
    if (!activeToday(medication, now)) return;
    const patient = patientMap[medication.patient];
    if (!patient) return;

    medication.reminders.forEach((reminder) => {
      if (!dueToday(medication, reminder, now)) return;
      const key = `${medication.id}:${reminder.id}`;
      const log = todayLogByReminder.get(key);
      seen.add(key);
      schedule.push({
        key,
        patient,
        medication,
        scheduledFor: log?.scheduled_for || withTime(now, reminder.time_of_day),
        status: log?.status || "pending",
        reminderId: reminder.id,
        logId: log?.id,
        source: log?.source,
        note: log?.note || reminder.notes,
      });
    });
  });

  todayLogs.forEach((log) => {
    const medication = medicationMap[log.medication];
    const patient = patientMap[log.patient];
    const reminderKey = log.reminder ? `${log.medication}:${log.reminder}` : "";
    if (!medication || !patient || (reminderKey && seen.has(reminderKey))) return;
    schedule.push({
      key: log.id,
      patient,
      medication,
      scheduledFor: log.scheduled_for,
      status: log.status,
      reminderId: log.reminder || undefined,
      logId: log.id,
      source: log.source,
      note: log.note,
    });
  });

  schedule.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  return {
    overallAdherence: adherence(last30),
    adherenceTrend: adherence(last7) - adherence(prev7),
    activeMedicationCount: medications.filter((medication) => medication.status === "active").length,
    todayDoseCount: schedule.length,
    todayCompletedCount: schedule.filter((item) => item.status === "taken").length,
    todayMissedCount: schedule.filter((item) => item.status === "missed").length,
    schedule,
    weeklyAdherence: Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const key = dateKey(date);
      return {
        day: date.toLocaleDateString([], { weekday: "short" }),
        score: adherence(doseLogs.filter((log) => dateKey(log.scheduled_for) === key)),
      };
    }),
    doseDistribution: ["taken", "missed", "skipped", "snoozed"].map((status) => ({
      status,
      count: last30.filter((log) => log.status === status).length,
    })),
    refillAlerts: medications
      .filter((medication) => {
        if (!medication.estimated_refill_date) return false;
        return (new Date(medication.estimated_refill_date).getTime() - now.getTime()) / DAY <= 7;
      })
      .sort((a, b) => (a.estimated_refill_date || "").localeCompare(b.estimated_refill_date || "")),
    recentActivity: [...doseLogs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6),
    patientsNeedingAttention: [...patients]
      .sort((a, b) => {
        const riskDiff = riskRank[getRefillRisk(b.adherence_summary)] - riskRank[getRefillRisk(a.adherence_summary)];
        return riskDiff !== 0 ? riskDiff : getAdherenceScore(a.adherence_summary) - getAdherenceScore(b.adherence_summary);
      })
      .slice(0, 4),
  };
}
