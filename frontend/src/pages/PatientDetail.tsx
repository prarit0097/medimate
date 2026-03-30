import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Globe,
  Pill,
  Shield,
  Users,
} from "lucide-react";

import { AdherenceRing } from "@/components/common/AdherenceRing";
import {
  RefillRiskBadge,
  RoleBadge,
  SourceBadge,
  StatusBadge,
} from "@/components/common/Badges";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateAge,
  fileNameFromPath,
  formatLanguage,
  getAdherenceScore,
  getInitials,
  getRefillRisk,
  splitConditions,
} from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type {
  CaregiverRelationshipRecord,
  DoseLogRecord,
  MedicationRecord,
  PaginatedResponse,
  PatientDashboardResponse,
  PatientRecord,
  PrescriptionUploadRecord,
  ProviderAccessRecord,
} from "@/types";

function backendAssetUrl(path: string) {
  if (!path) {
    return "#";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `http://127.0.0.1:8000${path}`;
}

export default function PatientDetail() {
  const { id } = useParams();

  const patientQuery = useQuery({
    queryKey: ["patient", id],
    enabled: Boolean(id),
    queryFn: () => apiClient.get<PatientRecord>(`/patients/${id}/`),
  });

  const dashboardQuery = useQuery({
    queryKey: ["patient-dashboard", id],
    enabled: Boolean(id),
    queryFn: () => apiClient.get<PatientDashboardResponse>(`/dashboard/patients/${id}/`),
  });

  const medicationsQuery = useQuery({
    queryKey: ["patient-medications", id],
    enabled: Boolean(id),
    queryFn: () =>
      apiClient.get<PaginatedResponse<MedicationRecord>>(`/medications/?patient=${id}`),
  });

  const doseLogsQuery = useQuery({
    queryKey: ["patient-dose-logs", id],
    enabled: Boolean(id),
    queryFn: () => apiClient.get<PaginatedResponse<DoseLogRecord>>(`/dose-logs/?patient=${id}`),
  });

  const prescriptionsQuery = useQuery({
    queryKey: ["patient-prescriptions", id],
    enabled: Boolean(id),
    queryFn: () =>
      apiClient.get<PaginatedResponse<PrescriptionUploadRecord>>(`/prescriptions/?patient=${id}`),
  });

  const caregiversQuery = useQuery({
    queryKey: ["caregiver-links"],
    enabled: Boolean(id),
    queryFn: () =>
      apiClient.get<PaginatedResponse<CaregiverRelationshipRecord>>("/caregiver-links/"),
  });

  const providersQuery = useQuery({
    queryKey: ["provider-access"],
    enabled: Boolean(id),
    queryFn: () => apiClient.get<PaginatedResponse<ProviderAccessRecord>>("/provider-access/"),
  });

  const patient = patientQuery.data ?? dashboardQuery.data?.patient;
  const summary = dashboardQuery.data?.dashboard ?? patient?.adherence_summary;
  const medications = medicationsQuery.data?.results ?? [];
  const logs = doseLogsQuery.data?.results ?? [];
  const prescriptions = prescriptionsQuery.data?.results ?? [];
  const caregivers = (caregiversQuery.data?.results ?? []).filter((item) => item.patient === id);
  const providers = (providersQuery.data?.results ?? []).filter((item) => item.patient === id);

  const medicationMap = useMemo(
    () =>
      medications.reduce<Record<string, MedicationRecord>>((accumulator, medication) => {
        accumulator[medication.id] = medication;
        return accumulator;
      }, {}),
    [medications],
  );

  const age = calculateAge(patient?.date_of_birth);
  const adherenceScore = getAdherenceScore(summary);
  const refillRisk = getRefillRisk(summary);
  const conditions = splitConditions(patient?.conditions ?? "");

  const isPrimaryLoading = patientQuery.isLoading || dashboardQuery.isLoading;
  const hasPrimaryError = patientQuery.isError && dashboardQuery.isError;

  if (!id) {
    return (
      <ErrorState
        title="Patient not found"
        message="No patient identifier was provided in the route."
      />
    );
  }

  if (isPrimaryLoading && !patient) {
    return <PageSkeleton />;
  }

  if (hasPrimaryError || !patient) {
    return (
      <ErrorState
        title="Unable to load patient"
        message="This patient profile could not be loaded from the backend."
        onRetry={() => {
          patientQuery.refetch();
          dashboardQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/app/patients">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {getInitials(patient.full_name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{patient.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {age !== null && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {age} years
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {formatLanguage(patient.preferred_language)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {patient.timezone}
                </span>
              </div>
            </div>
          </div>
        </div>
        <AdherenceRing score={adherenceScore} size="md" />
      </div>

      {conditions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {conditions.map((condition) => (
            <span
              key={condition}
              className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
            >
              {condition}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No conditions listed for this patient yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Adherence" value={`${adherenceScore}%`} icon={Activity} variant="success" />
        <StatCard
          title="Active Meds"
          value={summary?.active_medications ?? medications.length}
          icon={Pill}
        />
        <StatCard
          title="Missed This Window"
          value={summary?.missed_count ?? 0}
          icon={Activity}
          variant={(summary?.missed_count ?? 0) > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Refill Risk"
          value={refillRisk}
          icon={Activity}
          variant={refillRisk === "high" ? "danger" : refillRisk === "medium" ? "warning" : "success"}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="history">Dose History</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="care-team">Care Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Patient Summary</h3>
                <RefillRiskBadge risk={refillRisk} />
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Phone:</span>{" "}
                  {patient.phone_number || "Not provided"}
                </p>
                <p>
                  <span className="font-medium text-foreground">WhatsApp:</span>{" "}
                  {patient.whatsapp_number || "Not provided"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Voice reminders:</span>{" "}
                  {patient.voice_reminders_enabled ? "Enabled" : "Disabled"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Large text mode:</span>{" "}
                  {patient.large_text_mode ? "Enabled" : "Disabled"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Notes:</span>{" "}
                  {patient.notes || "No notes added yet."}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Refill Alerts</h3>
              {summary?.refill_due && summary.refill_due.length > 0 ? (
                <div className="space-y-3">
                  {summary.refill_due.map((item) => (
                    <div
                      key={item.medication_id}
                      className="flex items-center justify-between rounded-lg border border-warning/15 bg-warning/5 p-3"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Refill needed soon</p>
                      </div>
                      <p className="text-sm font-medium text-warning">
                        {new Date(item.estimated_refill_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No refill concerns for this patient right now.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">Recent Activity</h3>
            {doseLogsQuery.isLoading ? (
              <PageSkeleton />
            ) : logs.length === 0 ? (
              <EmptyState
                variant="activity"
                title="No dose activity"
                description="Dose logs will appear here once this patient starts tracking doses."
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 5).map((log) => {
                  const medication = medicationMap[log.medication];
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 border-b border-border py-2 last:border-0"
                    >
                      <StatusBadge status={log.status} />
                      <span className="font-medium">{medication?.name || "Medication"}</span>
                      <span className="text-sm text-muted-foreground">
                        {medication?.strength || medication?.dosage_form || ""}
                      </span>
                      <SourceBadge source={log.source} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(log.scheduled_for).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="medications">
          {medicationsQuery.isLoading ? (
            <PageSkeleton />
          ) : medicationsQuery.isError ? (
            <ErrorState
              title="Unable to load medications"
              message="Medication records could not be loaded for this patient."
              onRetry={() => medicationsQuery.refetch()}
            />
          ) : medications.length === 0 ? (
            <EmptyState
              variant="medications"
              title="No medications yet"
              description="No medications have been added for this patient."
            />
          ) : (
            <div className="space-y-3">
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{medication.name}</p>
                      {medication.is_high_risk && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          High Risk
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[medication.strength, medication.dosage_form, medication.meal_relation]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {medication.instructions || "No instructions added."}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={medication.status} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {medication.current_quantity} remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {doseLogsQuery.isLoading ? (
            <PageSkeleton />
          ) : doseLogsQuery.isError ? (
            <ErrorState
              title="Unable to load dose history"
              message="Dose log history could not be loaded for this patient."
              onRetry={() => doseLogsQuery.refetch()}
            />
          ) : logs.length === 0 ? (
            <EmptyState
              variant="activity"
              title="No dose history"
              description="This patient does not have any dose logs yet."
            />
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const medication = medicationMap[log.medication];
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <StatusBadge status={log.status} />
                    <div className="flex-1">
                      <p className="font-medium">
                        {medication?.name || "Medication"}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          - {medication?.strength || medication?.dosage_form || "Schedule entry"}
                        </span>
                      </p>
                      {log.note && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{log.note}</p>
                      )}
                    </div>
                    <SourceBadge source={log.source} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.scheduled_for).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions">
          {prescriptionsQuery.isLoading ? (
            <PageSkeleton />
          ) : prescriptionsQuery.isError ? (
            <ErrorState
              title="Unable to load prescriptions"
              message="Prescription uploads could not be loaded for this patient."
              onRetry={() => prescriptionsQuery.refetch()}
            />
          ) : prescriptions.length === 0 ? (
            <EmptyState
              variant="prescriptions"
              title="No prescriptions"
              description="No prescriptions have been uploaded for this patient."
            />
          ) : (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{fileNameFromPath(prescription.image)}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded by {prescription.uploaded_by_detail?.full_name || "Team member"}
                    </p>
                  </div>
                  <StatusBadge status={prescription.status} />
                  <a
                    className="text-sm font-medium text-primary hover:underline"
                    href={backendAssetUrl(prescription.image)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="care-team" className="space-y-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" />
              Caregivers
            </h3>
            {caregiversQuery.isLoading ? (
              <PageSkeleton />
            ) : caregivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No caregiver linked yet. Add someone who can help monitor adherence.
              </p>
            ) : (
              <div className="space-y-3">
                {caregivers.map((caregiver) => (
                  <div
                    key={caregiver.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                      {getInitials(caregiver.caregiver_detail?.full_name || "CG")}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {caregiver.caregiver_detail?.full_name || "Caregiver"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {caregiver.relationship_type} -{" "}
                        {caregiver.caregiver_detail?.email || "No email provided"}
                      </p>
                    </div>
                    {caregiver.is_primary && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Providers
            </h3>
            {providersQuery.isLoading ? (
              <PageSkeleton />
            ) : providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No providers have access to this patient yet.
              </p>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {getInitials(provider.provider_detail?.full_name || "PR")}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {provider.provider_detail?.full_name || "Provider"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {provider.provider_detail?.email || "No email provided"}
                      </p>
                    </div>
                    <RoleBadge role={provider.provider_role} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
