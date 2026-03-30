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
