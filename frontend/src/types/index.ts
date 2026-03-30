export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'pharmacist' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  preferred_language: string;
  timezone: string;
  avatar_url?: string;
  is_phone_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RefillDueItem {
  medication_id: string;
  name: string;
  estimated_refill_date: string;
}

export interface PatientAdherenceSummary {
  window_days: number;
  adherence_score: number | null;
  taken_count: number;
  missed_count: number;
  total_actionable_doses: number;
  active_medications: number;
  refill_due: RefillDueItem[];
}

export interface PatientRecord {
  id: string;
  account: string | null;
  account_email?: string | null;
  created_by: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  preferred_language: string;
  timezone: string;
  date_of_birth?: string | null;
  gender: "male" | "female" | "other" | "undisclosed";
  conditions: string;
  notes: string;
  voice_reminders_enabled: boolean;
  large_text_mode: boolean;
  active: boolean;
  adherence_summary: PatientAdherenceSummary;
  created_at: string;
  updated_at: string;
}

export interface PatientCreatePayload {
  full_name: string;
  phone_number?: string;
  whatsapp_number?: string;
  preferred_language: string;
  timezone: string;
  date_of_birth?: string;
  gender: "male" | "female" | "other" | "undisclosed";
  conditions?: string;
  notes?: string;
  voice_reminders_enabled?: boolean;
  large_text_mode?: boolean;
  active?: boolean;
}

export interface MedicationReminderRecord {
  id: string;
  label: string;
  time_of_day?: string | null;
  dose_quantity: string;
  recurrence_type: "daily" | "specific_days" | "weekly" | "alternate_days" | "prn";
  weekdays: number[];
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationRecord {
  id: string;
  patient: string;
  prescription?: string | null;
  created_by: string;
  name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  route: string;
  indication: string;
  instructions: string;
  meal_relation: "before_meal" | "after_meal" | "with_meal" | "independent";
  start_date: string;
  end_date?: string | null;
  total_quantity: string;
  current_quantity: string;
  low_stock_threshold_days: number;
  is_high_risk: boolean;
  status: "active" | "paused" | "completed";
  reminders: MedicationReminderRecord[];
  daily_required_quantity: string;
  estimated_refill_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoseLogRecord {
  id: string;
  patient: string;
  medication: string;
  reminder?: string | null;
  scheduled_for: string;
  actioned_at?: string | null;
  status: "taken" | "skipped" | "missed" | "snoozed";
  source: "app" | "caregiver" | "provider" | "system" | "whatsapp" | "ivr";
  note: string;
  logged_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionUploadRecord {
  id: string;
  patient: string;
  uploaded_by: string;
  uploaded_by_detail?: User;
  image: string;
  status: "pending" | "reviewed" | "needs_clarification";
  ocr_text: string;
  extracted_payload: Record<string, unknown>;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CaregiverRelationshipRecord {
  id: string;
  patient: string;
  caregiver: string;
  caregiver_detail?: User;
  relationship_type: string;
  is_primary: boolean;
  receives_missed_dose_alerts: boolean;
  receives_refill_alerts: boolean;
  receives_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderAccessRecord {
  id: string;
  patient: string;
  provider: string;
  provider_detail?: User;
  provider_role: "doctor" | "pharmacist" | "nurse" | "care_coordinator";
  organization: string;
  can_view_full_medication_list: boolean;
  can_manage_medications: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientDashboardResponse {
  patient: PatientRecord;
  dashboard: PatientAdherenceSummary;
}

export interface Patient {
  id: string;
  user: User;
  date_of_birth?: string;
  conditions: string[];
  adherence_score: number;
  refill_risk: 'low' | 'medium' | 'high';
  active_medications_count: number;
  created_at: string;
}

export interface CaregiverLink {
  id: string;
  caregiver: User;
  patient: Patient;
  relationship: string;
  alert_on_missed: boolean;
  alert_on_refill: boolean;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
}

export interface ProviderAccess {
  id: string;
  provider: User;
  patient: Patient;
  provider_role: 'doctor' | 'pharmacist' | 'nurse' | 'care_coordinator';
  access_level: 'full' | 'summary' | 'read_only';
  status: 'active' | 'pending' | 'revoked';
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'topical' | 'other';
  instructions?: string;
  meal_relation: 'before_food' | 'after_food' | 'with_food' | 'anytime';
  frequency: string;
  stock_remaining?: number;
  estimated_refill_date?: string;
  is_high_risk: boolean;
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  start_date: string;
  end_date?: string;
  created_at: string;
}

export interface ReminderSchedule {
  id: string;
  medication_id: string;
  time: string;
  days_of_week: number[];
  quantity_per_dose: number;
  is_active: boolean;
}

export interface DoseLog {
  id: string;
  patient_id: string;
  medication: Medication;
  scheduled_time: string;
  actual_time?: string;
  status: 'taken' | 'skipped' | 'missed' | 'snoozed';
  source: 'app' | 'caregiver' | 'provider' | 'system' | 'whatsapp' | 'ivr';
  notes?: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  status: 'uploaded' | 'under_review' | 'processed';
  notes?: string;
  uploaded_by: string;
  created_at: string;
}

export interface DashboardSummary {
  patient_id: string;
  adherence_score: number;
  todays_doses: DoseLog[];
  missed_doses_count: number;
  refill_risk_medications: Medication[];
  active_medications_count: number;
  upcoming_reminders: ReminderSchedule[];
  recent_activity: DoseLog[];
  weekly_adherence: { day: string; score: number }[];
  dose_distribution: { status: string; count: number }[];
}
