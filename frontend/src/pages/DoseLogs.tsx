import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  XCircle,
} from "lucide-react";

import { AiAssistantDialog } from "@/components/ai/AiAssistantDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { SourceBadge, StatusBadge } from "@/components/common/Badges";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
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
import { downloadCsv } from "@/lib/export-utils";
import { apiClient } from "@/services/api";
import type {
  DoseLogCreatePayload,
  DoseLogRecord,
  MedicationRecord,
  PatientRecord,
} from "@/types";

type DoseStatus = DoseLogRecord["status"] | "all";

interface DoseLogFormState extends DoseLogCreatePayload {
  patient: string;
  reminder: string;
}

function currentDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const defaultFormState: DoseLogFormState = {
  patient: "",
  medication: "",
  reminder: "",
  scheduled_for: currentDateTimeLocal(),
  status: "taken",
  source: "app",
  note: "",
};

export default function DoseLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoseStatus>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<DoseLogFormState>(defaultFormState);
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

  const doseLogsQuery = useQuery({
    queryKey: ["dose-logs", "all"],
    queryFn: () => apiClient.listAll<DoseLogRecord>("/dose-logs/"),
  });

  const createDoseLogMutation = useMutation({
    mutationFn: (payload: DoseLogCreatePayload) =>
      apiClient.post<DoseLogRecord>("/dose-logs/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dose-logs"] });
      setForm(defaultFormState);
      setIsDialogOpen(false);
      toast({
        title: "Dose log added",
        description: "The dose activity was recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save dose log",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const medications = medicationsQuery.data ?? [];
  const doseLogs = doseLogsQuery.data ?? [];

  const patientMap = useMemo(
    () =>
      patients.reduce<Record<string, PatientRecord>>((accumulator, patient) => {
        accumulator[patient.id] = patient;
        return accumulator;
      }, {}),
    [patients],
  );

  const medicationMap = useMemo(
    () =>
      medications.reduce<Record<string, MedicationRecord>>((accumulator, medication) => {
        accumulator[medication.id] = medication;
        return accumulator;
      }, {}),
    [medications],
  );

  const availableMedications = useMemo(
    () =>
      form.patient
        ? medications.filter((medication) => medication.patient === form.patient)
        : medications,
    [form.patient, medications],
  );

  const selectedMedication = useMemo(
    () => medications.find((medication) => medication.id === form.medication),
    [form.medication, medications],
  );

  const filteredLogs = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return doseLogs.filter((log) => {
      const medication = medicationMap[log.medication];
      const patient = patientMap[log.patient];
      const matchesSearch =
        term.length === 0 ||
        medication?.name.toLowerCase().includes(term) ||
        medication?.strength.toLowerCase().includes(term) ||
        patient?.full_name.toLowerCase().includes(term) ||
        log.note.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deferredSearch, doseLogs, medicationMap, patientMap, statusFilter]);

  const stats = useMemo(
    () => ({
      total: doseLogs.length,
      taken: doseLogs.filter((log) => log.status === "taken").length,
      missed: doseLogs.filter((log) => log.status === "missed").length,
      skipped: doseLogs.filter((log) => log.status === "skipped").length,
    }),
    [doseLogs],
  );

  function updateForm<K extends keyof DoseLogFormState>(
    field: K,
    value: DoseLogFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleExport() {
    if (doseLogs.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Dose logs will become exportable after activity is recorded.",
      });
      return;
    }

    const rows = doseLogs.map((log) => {
      const medication = medicationMap[log.medication];
      const patient = patientMap[log.patient];
      return {
        patient: patient?.full_name || "",
        medication: medication?.name || "",
        strength: medication?.strength || "",
        scheduled_for: log.scheduled_for,
        actioned_at: log.actioned_at || "",
        status: log.status,
        source: log.source,
        note: log.note || "",
      };
    });

    downloadCsv("medimate-dose-logs.csv", rows, [
      "patient",
      "medication",
      "strength",
      "scheduled_for",
      "actioned_at",
      "status",
      "source",
      "note",
    ]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.patient) {
      toast({
        title: "Patient is required",
        description: "Choose the patient linked to this dose event.",
        variant: "destructive",
      });
      return;
    }

    if (!form.medication) {
      toast({
        title: "Medication is required",
        description: "Select the medication for this dose log.",
        variant: "destructive",
      });
      return;
    }

    if (!form.scheduled_for) {
      toast({
        title: "Scheduled time is required",
        description: "Add the date and time for the logged dose.",
        variant: "destructive",
      });
      return;
    }

    const payload: DoseLogCreatePayload = {
      medication: form.medication,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      status: form.status,
      source: form.source,
      note: form.note.trim(),
    };

    if (form.reminder) {
      payload.reminder = form.reminder;
    }

    await createDoseLogMutation.mutateAsync(payload);
  }

  const isLoading =
    patientsQuery.isLoading || medicationsQuery.isLoading || doseLogsQuery.isLoading;
  const isError =
    patientsQuery.isError || medicationsQuery.isError || doseLogsQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dose Logs</h1>
          <p className="mt-1 text-muted-foreground">
            Track dose activity across patients and export recent adherence history.
          </p>
        </div>
        <div className="flex gap-2">
          <AiAssistantDialog
            surface="dose_logs"
            title="AI Adherence Analysis"
            description="Use recent dose activity to identify adherence patterns, missed-dose clusters, and outreach priorities."
            triggerLabel="AI Analyze"
            defaultQuestion="Analyze the recent dose logs and explain the most important adherence patterns or risks."
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            disabled={!patientsQuery.isLoading && patients.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Log
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Doses" value={stats.total} icon={Activity} />
        <StatCard title="Taken" value={stats.taken} icon={CheckCircle2} variant="success" />
        <StatCard title="Missed" value={stats.missed} icon={XCircle} variant="danger" />
        <StatCard title="Skipped" value={stats.skipped} icon={AlertTriangle} variant="warning" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs by patient or medication..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as DoseStatus)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="taken">Taken</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load dose logs"
          message="Dose activity could not be loaded from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            medicationsQuery.refetch();
            doseLogsQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          variant="activity"
          title="Add a patient first"
          description="Dose logs depend on patients and medications. Create them before logging adherence events."
        />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          variant="activity"
          title={doseLogs.length === 0 ? "No dose activity yet" : "No dose logs found"}
          description={
            doseLogs.length === 0
              ? "Record the first taken, missed, or skipped dose to build activity history."
              : "No dose logs match your current search or filter."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Log
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const medication = medicationMap[log.medication];
            const patient = patientMap[log.patient];

            return (
              <div
                key={log.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <StatusBadge status={log.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {medication?.name || "Medication"}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      - {medication?.strength || medication?.dosage_form || "Dose event"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient?.full_name || "Unknown patient"}
                  </p>
                  {log.note && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{log.note}</p>
                  )}
                </div>
                <SourceBadge source={log.source} />
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">
                    {new Date(log.scheduled_for).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.scheduled_for).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Dose Log</DialogTitle>
            <DialogDescription>
              Record a taken, missed, skipped, or snoozed dose event against a medication.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select
                  value={form.patient}
                  onValueChange={(value) => {
                    setForm((current) => ({
                      ...current,
                      patient: value,
                      medication: "",
                      reminder: "",
                    }));
                  }}
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
                <Label>Medication</Label>
                <Select
                  value={form.medication}
                  onValueChange={(value) => {
                    setForm((current) => ({
                      ...current,
                      medication: value,
                      reminder: "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMedications.map((medication) => (
                      <SelectItem key={medication.id} value={medication.id}>
                        {medication.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reminder</Label>
                <Select
                  value={form.reminder || "none"}
                  onValueChange={(value) =>
                    updateForm("reminder", value === "none" ? "" : value)
                  }
                  disabled={!selectedMedication || selectedMedication.reminders.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    {selectedMedication?.reminders.map((reminder) => (
                      <SelectItem key={reminder.id} value={reminder.id}>
                        {reminder.label || reminder.time_of_day || "Reminder"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduled for</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(event) => updateForm("scheduled_for", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateForm("status", value as DoseLogFormState["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taken">Taken</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="snoozed">Snoozed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(value) =>
                    updateForm("source", value as DoseLogFormState["source"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">App</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="ivr">IVR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                  placeholder="Optional context about this dose event."
                />
              </div>
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
              <Button type="submit" disabled={createDoseLogMutation.isPending}>
                {createDoseLogMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
