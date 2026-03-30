import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pill, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { RefillRiskBadge, StatusBadge } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getRefillRisk, splitConditions } from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type {
  MedicationCreatePayload,
  MedicationRecord,
  PatientRecord,
} from "@/types";

type MedicationStatus = MedicationRecord["status"] | "all";
type RecurrenceType = NonNullable<MedicationCreatePayload["reminders"]>[number]["recurrence_type"];

interface MedicationFormState {
  patient: string;
  name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  route: string;
  indication: string;
  instructions: string;
  meal_relation: MedicationCreatePayload["meal_relation"];
  start_date: string;
  end_date: string;
  total_quantity: string;
  current_quantity: string;
  low_stock_threshold_days: string;
  is_high_risk: boolean;
  status: MedicationCreatePayload["status"];
  reminder_enabled: boolean;
  reminder_label: string;
  reminder_time: string;
  dose_quantity: string;
  recurrence_type: RecurrenceType;
  weekdays: number[];
  reminder_notes: string;
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

const defaultFormState: MedicationFormState = {
  patient: "",
  name: "",
  generic_name: "",
  strength: "",
  dosage_form: "Tablet",
  route: "Oral",
  indication: "",
  instructions: "",
  meal_relation: "independent",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  total_quantity: "30",
  current_quantity: "30",
  low_stock_threshold_days: "5",
  is_high_risk: false,
  status: "active",
  reminder_enabled: true,
  reminder_label: "Morning dose",
  reminder_time: "08:00",
  dose_quantity: "1",
  recurrence_type: "daily",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  reminder_notes: "",
};

function formatReminder(reminders: MedicationRecord["reminders"]) {
  if (reminders.length === 0) {
    return "No reminders configured";
  }

  const primaryReminder = reminders[0];
  const label = primaryReminder.label || "Reminder";
  const time = primaryReminder.time_of_day ? primaryReminder.time_of_day.slice(0, 5) : "As needed";

  if (primaryReminder.recurrence_type === "specific_days" && primaryReminder.weekdays.length > 0) {
    const days = primaryReminder.weekdays
      .map((day) => WEEKDAY_OPTIONS.find((item) => item.value === day)?.label || day)
      .join(", ");
    return `${label} at ${time} on ${days}`;
  }

  return `${label} at ${time}`;
}

export default function Medications() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MedicationStatus>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<MedicationFormState>(defaultFormState);
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const patientsQuery = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
  });

  const medicationsQuery = useQuery({
    queryKey: ["medications", "all"],
    queryFn: () => apiClient.listAll<MedicationRecord>("/medications/"),
  });

  const createMedicationMutation = useMutation({
    mutationFn: (payload: MedicationCreatePayload) =>
      apiClient.post<MedicationRecord>("/medications/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      setForm(defaultFormState);
      setIsDialogOpen(false);
      toast({
        title: "Medication added",
        description: "The medication and its reminder settings were saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add medication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const medications = medicationsQuery.data ?? [];

  const patientMap = useMemo(
    () =>
      patients.reduce<Record<string, PatientRecord>>((accumulator, patient) => {
        accumulator[patient.id] = patient;
        return accumulator;
      }, {}),
    [patients],
  );

  const filteredMedications = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return medications.filter((medication) => {
      const patientName = patientMap[medication.patient]?.full_name?.toLowerCase() || "";
      const matchesSearch =
        term.length === 0 ||
        medication.name.toLowerCase().includes(term) ||
        medication.generic_name.toLowerCase().includes(term) ||
        medication.strength.toLowerCase().includes(term) ||
        medication.indication.toLowerCase().includes(term) ||
        patientName.includes(term);
      const matchesStatus =
        statusFilter === "all" || medication.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deferredSearch, medications, patientMap, statusFilter]);

  function updateForm<K extends keyof MedicationFormState>(
    field: K,
    value: MedicationFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleWeekday(day: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      weekdays: checked
        ? [...current.weekdays, day].sort((left, right) => left - right)
        : current.weekdays.filter((item) => item !== day),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.patient) {
      toast({
        title: "Patient is required",
        description: "Select the patient who will receive this medication.",
        variant: "destructive",
      });
      return;
    }

    if (!form.name.trim()) {
      toast({
        title: "Medication name is required",
        description: "Add a medication name before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!form.start_date) {
      toast({
        title: "Start date is required",
        description: "Choose the medication start date.",
        variant: "destructive",
      });
      return;
    }

    if (!form.total_quantity || !form.current_quantity) {
      toast({
        title: "Quantity is required",
        description: "Add both total and current quantity values.",
        variant: "destructive",
      });
      return;
    }

    if (
      form.reminder_enabled &&
      form.recurrence_type !== "prn" &&
      !form.reminder_time
    ) {
      toast({
        title: "Reminder time is required",
        description: "Choose a time for the reminder or switch it to PRN.",
        variant: "destructive",
      });
      return;
    }

    if (form.recurrence_type === "specific_days" && form.weekdays.length === 0) {
      toast({
        title: "Select reminder days",
        description: "Choose at least one weekday for a specific-days reminder.",
        variant: "destructive",
      });
      return;
    }

    const payload: MedicationCreatePayload = {
      patient: form.patient,
      name: form.name.trim(),
      generic_name: form.generic_name.trim(),
      strength: form.strength.trim(),
      dosage_form: form.dosage_form.trim(),
      route: form.route.trim(),
      indication: form.indication.trim(),
      instructions: form.instructions.trim(),
      meal_relation: form.meal_relation,
      start_date: form.start_date,
      total_quantity: form.total_quantity.trim(),
      current_quantity: form.current_quantity.trim(),
      low_stock_threshold_days: Number(form.low_stock_threshold_days || "5"),
      is_high_risk: form.is_high_risk,
      status: form.status,
      reminders: form.reminder_enabled
        ? [
            {
              label: form.reminder_label.trim(),
              time_of_day:
                form.recurrence_type === "prn" ? null : form.reminder_time || null,
              dose_quantity: form.dose_quantity.trim() || "1",
              recurrence_type: form.recurrence_type,
              weekdays:
                form.recurrence_type === "specific_days" ? form.weekdays : [],
              notes: form.reminder_notes.trim(),
              is_active: true,
            },
          ]
        : [],
    };

    if (form.end_date) {
      payload.end_date = form.end_date;
    }

    await createMedicationMutation.mutateAsync(payload);
  }

  const isLoading = patientsQuery.isLoading || medicationsQuery.isLoading;
  const isError = patientsQuery.isError || medicationsQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medications</h1>
          <p className="mt-1 text-muted-foreground">
            View medication plans, reminder schedules, and refill risk.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={!patientsQuery.isLoading && patients.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search medications or patients..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as MedicationStatus)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load medications"
          message="The medication list could not be loaded from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            medicationsQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          variant="medications"
          title="Add a patient first"
          description="Medication records are attached to patients. Create a patient profile before adding medications."
        />
      ) : filteredMedications.length === 0 ? (
        <EmptyState
          variant="medications"
          title={medications.length === 0 ? "No medications yet" : "No medications found"}
          description={
            medications.length === 0
              ? "Create the first medication plan to start tracking reminders and refills."
              : "No medications match your current filters."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredMedications.map((medication) => {
            const patient = patientMap[medication.patient];
            const refillRisk = getRefillRisk({
              adherence_score: patient?.adherence_summary.adherence_score ?? null,
              window_days: patient?.adherence_summary.window_days ?? 30,
              taken_count: patient?.adherence_summary.taken_count ?? 0,
              missed_count: patient?.adherence_summary.missed_count ?? 0,
              total_actionable_doses:
                patient?.adherence_summary.total_actionable_doses ?? 0,
              active_medications: patient?.adherence_summary.active_medications ?? 0,
              refill_due: medication.estimated_refill_date
                ? [
                    {
                      medication_id: medication.id,
                      name: medication.name,
                      estimated_refill_date: medication.estimated_refill_date,
                    },
                  ]
                : [],
            });

            return (
              <div
                key={medication.id}
                className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{medication.name}</p>
                      <StatusBadge status={medication.status} />
                      {medication.is_high_risk && <RefillRiskBadge risk="high" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        medication.strength,
                        medication.dosage_form,
                        medication.meal_relation.replace("_", " "),
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Patient: <span className="text-foreground">{patient?.full_name || "Unknown patient"}</span>
                    </p>
                    {patient?.conditions && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {splitConditions(patient.conditions)
                          .slice(0, 2)
                          .map((condition) => (
                            <span
                              key={condition}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {condition}
                            </span>
                          ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatReminder(medication.reminders)}
                    </p>
                    {medication.instructions && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {medication.instructions}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="text-sm font-medium">
                      {medication.current_quantity} of {medication.total_quantity} left
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Daily need: {medication.daily_required_quantity}
                    </p>
                    {medication.estimated_refill_date && (
                      <p className="text-xs text-muted-foreground">
                        Refill by{" "}
                        {new Date(medication.estimated_refill_date).toLocaleDateString()}
                      </p>
                    )}
                    {medication.estimated_refill_date && (
                      <div className="pt-1">
                        <RefillRiskBadge risk={refillRisk} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
            <DialogDescription>
              Create a medication record and optionally attach one reminder schedule.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Patient</Label>
                <Select
                  value={form.patient}
                  onValueChange={(value) => updateForm("patient", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Medication name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Metformin"
                />
              </div>

              <div className="space-y-2">
                <Label>Generic name</Label>
                <Input
                  value={form.generic_name}
                  onChange={(event) => updateForm("generic_name", event.target.value)}
                  placeholder="Metformin hydrochloride"
                />
              </div>

              <div className="space-y-2">
                <Label>Strength</Label>
                <Input
                  value={form.strength}
                  onChange={(event) => updateForm("strength", event.target.value)}
                  placeholder="500 mg"
                />
              </div>

              <div className="space-y-2">
                <Label>Dosage form</Label>
                <Input
                  value={form.dosage_form}
                  onChange={(event) => updateForm("dosage_form", event.target.value)}
                  placeholder="Tablet"
                />
              </div>

              <div className="space-y-2">
                <Label>Route</Label>
                <Input
                  value={form.route}
                  onChange={(event) => updateForm("route", event.target.value)}
                  placeholder="Oral"
                />
              </div>

              <div className="space-y-2">
                <Label>Indication</Label>
                <Input
                  value={form.indication}
                  onChange={(event) => updateForm("indication", event.target.value)}
                  placeholder="Blood sugar control"
                />
              </div>

              <div className="space-y-2">
                <Label>Meal relation</Label>
                <Select
                  value={form.meal_relation}
                  onValueChange={(value) =>
                    updateForm("meal_relation", value as MedicationFormState["meal_relation"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="before_meal">Before meal</SelectItem>
                    <SelectItem value="after_meal">After meal</SelectItem>
                    <SelectItem value="with_meal">With meal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateForm("status", value as MedicationFormState["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(event) => updateForm("start_date", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(event) => updateForm("end_date", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Total quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_quantity}
                  onChange={(event) => updateForm("total_quantity", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Current quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.current_quantity}
                  onChange={(event) => updateForm("current_quantity", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Low stock threshold (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.low_stock_threshold_days}
                  onChange={(event) =>
                    updateForm("low_stock_threshold_days", event.target.value)
                  }
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3 sm:col-span-2">
                <Checkbox
                  checked={form.is_high_risk}
                  onCheckedChange={(checked) =>
                    updateForm("is_high_risk", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Mark as high risk</p>
                  <p className="text-xs text-muted-foreground">
                    Highlight this medication for extra monitoring and refill attention.
                  </p>
                </div>
              </label>

              <div className="space-y-2 sm:col-span-2">
                <Label>Instructions</Label>
                <Textarea
                  value={form.instructions}
                  onChange={(event) => updateForm("instructions", event.target.value)}
                  className="min-h-[96px]"
                  placeholder="Take after breakfast with water."
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border p-4">
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={form.reminder_enabled}
                  onCheckedChange={(checked) =>
                    updateForm("reminder_enabled", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Add reminder schedule</p>
                  <p className="text-xs text-muted-foreground">
                    Create one reminder entry now. More can be added later from the API.
                  </p>
                </div>
              </label>

              {form.reminder_enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Reminder label</Label>
                    <Input
                      value={form.reminder_label}
                      onChange={(event) => updateForm("reminder_label", event.target.value)}
                      placeholder="Morning dose"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dose quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.dose_quantity}
                      onChange={(event) => updateForm("dose_quantity", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recurrence</Label>
                    <Select
                      value={form.recurrence_type}
                      onValueChange={(value) =>
                        updateForm("recurrence_type", value as RecurrenceType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="specific_days">Specific days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="alternate_days">Alternate days</SelectItem>
                        <SelectItem value="prn">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reminder time</Label>
                    <Input
                      type="time"
                      disabled={form.recurrence_type === "prn"}
                      value={form.recurrence_type === "prn" ? "" : form.reminder_time}
                      onChange={(event) => updateForm("reminder_time", event.target.value)}
                    />
                  </div>

                  {form.recurrence_type === "specific_days" && (
                    <div className="space-y-3 sm:col-span-2">
                      <Label>Weekdays</Label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {WEEKDAY_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 rounded-lg border border-border p-3"
                          >
                            <Checkbox
                              checked={form.weekdays.includes(option.value)}
                              onCheckedChange={(checked) =>
                                toggleWeekday(option.value, checked === true)
                              }
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Reminder notes</Label>
                    <Textarea
                      value={form.reminder_notes}
                      onChange={(event) => updateForm("reminder_notes", event.target.value)}
                      placeholder="Optional reminder notes"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(defaultFormState);
                  setIsDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMedicationMutation.isPending}>
                {createMedicationMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Medication
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
