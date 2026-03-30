import type { PatientAdherenceSummary } from "@/types";

export function splitConditions(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "PT";
}

export function getAdherenceScore(summary?: PatientAdherenceSummary | null) {
  return Math.max(0, Math.min(100, summary?.adherence_score ?? 0));
}

export function getRefillRisk(summary?: PatientAdherenceSummary | null): "low" | "medium" | "high" {
  if (!summary) {
    return "low";
  }

  if (summary.refill_due.length > 0) {
    return "high";
  }

  const score = summary.adherence_score ?? 0;
  if (score > 0 && score < 80) {
    return "medium";
  }

  return "low";
}

export function formatLanguage(code: string) {
  const value = code.toLowerCase();

  if (value === "en") {
    return "English";
  }
  if (value === "hi") {
    return "Hindi";
  }

  return code.toUpperCase();
}

export function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

export function fileNameFromPath(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
