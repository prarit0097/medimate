import type { User, Patient, Medication, DoseLog, Prescription, CaregiverLink, ProviderAccess, DashboardSummary } from '@/types';

export const mockUser: User = {
  id: '1',
  email: 'priya.sharma@example.com',
  full_name: 'Priya Sharma',
  phone_number: '+91 98765 43210',
  role: 'patient',
  preferred_language: 'en',
  timezone: 'Asia/Kolkata',
  created_at: '2024-01-15T10:00:00Z',
};

export const mockPatients: Patient[] = [
  {
    id: '1', user: { ...mockUser }, date_of_birth: '1958-03-12',
    conditions: ['Type 2 Diabetes', 'Hypertension'], adherence_score: 87,
    refill_risk: 'low', active_medications_count: 4, created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2', user: { ...mockUser, id: '2', full_name: 'Rajesh Kumar', email: 'rajesh@example.com' },
    date_of_birth: '1965-07-22', conditions: ['Heart Disease', 'Cholesterol'],
    adherence_score: 62, refill_risk: 'high', active_medications_count: 6,
    created_at: '2024-02-10T10:00:00Z',
  },
  {
    id: '3', user: { ...mockUser, id: '3', full_name: 'Anita Desai', email: 'anita@example.com' },
    date_of_birth: '1972-11-05', conditions: ['Asthma'],
    adherence_score: 94, refill_risk: 'low', active_medications_count: 2,
    created_at: '2024-03-01T10:00:00Z',
  },
  {
    id: '4', user: { ...mockUser, id: '4', full_name: 'Mohammed Ali', email: 'mohammed@example.com' },
    date_of_birth: '1980-05-18', conditions: ['Epilepsy', 'Anxiety'],
    adherence_score: 73, refill_risk: 'medium', active_medications_count: 3,
    created_at: '2024-03-15T10:00:00Z',
  },
];

export const mockMedications: Medication[] = [
  {
    id: '1', patient_id: '1', name: 'Metformin', dosage: '500mg', form: 'tablet',
    instructions: 'Take with meals', meal_relation: 'with_food', frequency: 'Twice daily',
    stock_remaining: 45, estimated_refill_date: '2025-05-01', is_high_risk: false,
    status: 'active', start_date: '2024-01-15', created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2', patient_id: '1', name: 'Amlodipine', dosage: '5mg', form: 'tablet',
    instructions: 'Take in the morning', meal_relation: 'anytime', frequency: 'Once daily',
    stock_remaining: 8, estimated_refill_date: '2025-04-10', is_high_risk: false,
    status: 'active', start_date: '2024-01-15', created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '3', patient_id: '1', name: 'Insulin Glargine', dosage: '20 units', form: 'injection',
    instructions: 'Inject subcutaneously at bedtime', meal_relation: 'anytime', frequency: 'Once daily',
    stock_remaining: 2, estimated_refill_date: '2025-04-05', is_high_risk: true,
    status: 'active', start_date: '2024-02-01', created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: '4', patient_id: '1', name: 'Atorvastatin', dosage: '10mg', form: 'tablet',
    meal_relation: 'anytime', frequency: 'Once daily at night',
    stock_remaining: 30, is_high_risk: false,
    status: 'active', start_date: '2024-01-20', created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: '5', patient_id: '2', name: 'Warfarin', dosage: '5mg', form: 'tablet',
    instructions: 'Monitor INR regularly', meal_relation: 'anytime', frequency: 'Once daily',
    stock_remaining: 5, estimated_refill_date: '2025-04-08', is_high_risk: true,
    status: 'active', start_date: '2024-02-10', created_at: '2024-02-10T10:00:00Z',
  },
];

export const mockDoseLogs: DoseLog[] = [
  {
    id: '1', patient_id: '1', medication: mockMedications[0],
    scheduled_time: '2025-04-01T08:00:00Z', actual_time: '2025-04-01T08:15:00Z',
    status: 'taken', source: 'app', created_at: '2025-04-01T08:15:00Z',
  },
  {
    id: '2', patient_id: '1', medication: mockMedications[1],
    scheduled_time: '2025-04-01T09:00:00Z', status: 'missed', source: 'system',
    created_at: '2025-04-01T09:30:00Z',
  },
  {
    id: '3', patient_id: '1', medication: mockMedications[0],
    scheduled_time: '2025-04-01T20:00:00Z', actual_time: '2025-04-01T20:05:00Z',
    status: 'taken', source: 'app', created_at: '2025-04-01T20:05:00Z',
  },
  {
    id: '4', patient_id: '1', medication: mockMedications[2],
    scheduled_time: '2025-04-01T22:00:00Z', status: 'snoozed', source: 'app',
    notes: 'Will take after dinner', created_at: '2025-04-01T22:00:00Z',
  },
  {
    id: '5', patient_id: '1', medication: mockMedications[3],
    scheduled_time: '2025-04-01T21:00:00Z', actual_time: '2025-04-01T21:10:00Z',
    status: 'taken', source: 'caregiver', created_at: '2025-04-01T21:10:00Z',
  },
  {
    id: '6', patient_id: '1', medication: mockMedications[0],
    scheduled_time: '2025-03-31T08:00:00Z', status: 'skipped', source: 'app',
    notes: 'Felt nauseous', created_at: '2025-03-31T08:30:00Z',
  },
];

export const mockPrescriptions: Prescription[] = [
  {
    id: '1', patient_id: '1', file_url: '/placeholder.svg', file_name: 'prescription_jan2025.pdf',
    status: 'processed', notes: 'Regular checkup prescription', uploaded_by: 'Dr. Mehta',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2', patient_id: '1', file_url: '/placeholder.svg', file_name: 'lab_report_mar2025.pdf',
    status: 'under_review', uploaded_by: 'Priya Sharma', created_at: '2025-03-20T10:00:00Z',
  },
  {
    id: '3', patient_id: '2', file_url: '/placeholder.svg', file_name: 'cardiology_rx.pdf',
    status: 'uploaded', notes: 'New medication added', uploaded_by: 'Rajesh Kumar',
    created_at: '2025-03-28T10:00:00Z',
  },
];

export const mockCaregiverLinks: CaregiverLink[] = [
  {
    id: '1',
    caregiver: { ...mockUser, id: '10', full_name: 'Sunita Sharma', email: 'sunita@example.com', role: 'caregiver' },
    patient: mockPatients[0], relationship: 'Daughter', alert_on_missed: true,
    alert_on_refill: true, status: 'active', created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: '2',
    caregiver: { ...mockUser, id: '11', full_name: 'Vikram Sharma', email: 'vikram@example.com', role: 'caregiver' },
    patient: mockPatients[0], relationship: 'Son', alert_on_missed: true,
    alert_on_refill: false, status: 'active', created_at: '2024-02-05T10:00:00Z',
  },
];

export const mockProviderAccess: ProviderAccess[] = [
  {
    id: '1',
    provider: { ...mockUser, id: '20', full_name: 'Dr. Arun Mehta', email: 'dr.mehta@example.com', role: 'doctor' },
    patient: mockPatients[0], provider_role: 'doctor', access_level: 'full',
    status: 'active', created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    provider: { ...mockUser, id: '21', full_name: 'Neha Patel', email: 'neha@pharmacy.com', role: 'pharmacist' },
    patient: mockPatients[0], provider_role: 'pharmacist', access_level: 'summary',
    status: 'active', created_at: '2024-02-20T10:00:00Z',
  },
];

export const mockDashboard: DashboardSummary = {
  patient_id: '1',
  adherence_score: 87,
  todays_doses: mockDoseLogs.slice(0, 4),
  missed_doses_count: 2,
  refill_risk_medications: [mockMedications[1], mockMedications[2]],
  active_medications_count: 4,
  upcoming_reminders: [],
  recent_activity: mockDoseLogs,
  weekly_adherence: [
    { day: 'Mon', score: 100 }, { day: 'Tue', score: 85 },
    { day: 'Wed', score: 90 }, { day: 'Thu', score: 75 },
    { day: 'Fri', score: 100 }, { day: 'Sat', score: 80 },
    { day: 'Sun', score: 87 },
  ],
  dose_distribution: [
    { status: 'taken', count: 24 }, { status: 'missed', count: 3 },
    { status: 'skipped', count: 2 }, { status: 'snoozed', count: 1 },
  ],
};
