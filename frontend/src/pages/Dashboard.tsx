import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  FileUp,
  Pill,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AiAssistantDialog } from "@/components/ai/AiAssistantDialog";
import { AdherenceRing } from "@/components/common/AdherenceRing";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { RefillRiskBadge, SourceBadge, StatusBadge } from "@/components/common/Badges";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { buildDashboardData, firstName } from "@/lib/dashboard-utils";
import { getAdherenceScore, getInitials, getRefillRisk } from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type {
  CaregiverRelationshipRecord,
  DoseLogCreatePayload,
  DoseLogRecord,
  MedicationRecord,
  PatientRecord,
  PrescriptionUploadRecord,
  ProviderAccessRecord,
} from "@/types";

const doseColors: Record<string, string> = {
  taken: "hsl(152, 55%, 42%)",
  missed: "hsl(0, 72%, 51%)",
  skipped: "hsl(38, 92%, 50%)",
  snoozed: "hsl(192, 65%, 38%)",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({ queryKey: ["patients", "all"], queryFn: () => apiClient.listAll<PatientRecord>("/patients/") });
  const medicationsQuery = useQuery({ queryKey: ["medications", "all"], queryFn: () => apiClient.listAll<MedicationRecord>("/medications/") });
  const doseLogsQuery = useQuery({ queryKey: ["dose-logs", "all"], queryFn: () => apiClient.listAll<DoseLogRecord>("/dose-logs/") });
  const prescriptionsQuery = useQuery({ queryKey: ["prescriptions", "all"], queryFn: () => apiClient.listAll<PrescriptionUploadRecord>("/prescriptions/") });
  const caregiversQuery = useQuery({ queryKey: ["caregiver-links", "all"], queryFn: () => apiClient.listAll<CaregiverRelationshipRecord>("/caregiver-links/") });
  const providersQuery = useQuery({ queryKey: ["provider-access", "all"], queryFn: () => apiClient.listAll<ProviderAccessRecord>("/provider-access/") });

  const patients = patientsQuery.data ?? [];
  const medications = medicationsQuery.data ?? [];
  const doseLogs = doseLogsQuery.data ?? [];
  const prescriptions = prescriptionsQuery.data ?? [];
  const caregivers = caregiversQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const patientMap = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  const medicationMap = Object.fromEntries(medications.map((medication) => [medication.id, medication]));
  const data = buildDashboardData(patients, medications, doseLogs);

  const scheduleMutation = useMutation({
    mutationFn: async ({ logId, payload }: { logId?: string; payload: DoseLogCreatePayload }) =>
      logId
        ? apiClient.patch<DoseLogRecord>(`/dose-logs/${logId}/`, {
            status: payload.status,
            actioned_at: payload.actioned_at,
            source: payload.source,
          })
        : apiClient.post<DoseLogRecord>("/dose-logs/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dose-logs"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast({ title: "Dashboard updated", description: "Dose status saved successfully." });
    },
    onError: (error: Error) =>
      toast({ title: "Could not update schedule", description: error.message, variant: "destructive" }),
  });

  const isLoading = [patientsQuery, medicationsQuery, doseLogsQuery, prescriptionsQuery, caregiversQuery, providersQuery].some((query) => query.isLoading);
  const isError = [patientsQuery, medicationsQuery, doseLogsQuery, prescriptionsQuery, caregiversQuery, providersQuery].some((query) => query.isError);

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return <ErrorState title="Unable to load dashboard" message="Dashboard data could not be aggregated from the backend." onRetry={() => {
      patientsQuery.refetch(); medicationsQuery.refetch(); doseLogsQuery.refetch(); prescriptionsQuery.refetch(); caregiversQuery.refetch(); providersQuery.refetch();
    }} />;
  }
  if (patients.length === 0) {
    return <EmptyState variant="patients" title="Start with your first patient" description="The dashboard will activate after patient, medication, and dose data is added." action={<Button asChild><Link to="/app/patients">Add Patient</Link></Button>} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good morning, {firstName(user?.full_name)}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Live dashboard built from patients, medications, reminders, dose logs, prescriptions, and care-team links.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <AiAssistantDialog
            surface="dashboard"
            title="AI Dashboard Summary"
            description="Generate an AI summary of today's adherence signals, refill risk, and care-team follow-up priorities."
            triggerLabel="AI Summary"
            defaultQuestion="Summarize today's dashboard, highlight risks, and suggest the best next actions."
          />
          <Button asChild variant="outline"><Link to="/app/patients"><UserPlus className="mr-2 h-4 w-4" />Add Patient</Link></Button>
          <Button asChild variant="outline"><Link to="/app/medications"><Pill className="mr-2 h-4 w-4" />Add Medication</Link></Button>
          <Button asChild variant="outline"><Link to="/app/prescriptions"><FileUp className="mr-2 h-4 w-4" />Upload Rx</Link></Button>
          <Button asChild><Link to="/app/reports"><BarChart3 className="mr-2 h-4 w-4" />Reports</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Adherence Score" value={`${data.overallAdherence}%`} icon={TrendingUp} variant={data.overallAdherence >= 80 ? "success" : "warning"} trend={{ value: data.adherenceTrend, label: "vs last week" }} />
        <StatCard title="Today's Doses" value={data.todayDoseCount} icon={Pill} subtitle={`${data.todayCompletedCount} completed`} />
        <StatCard title="Missed Today" value={data.todayMissedCount} icon={AlertTriangle} variant={data.todayMissedCount > 0 ? "warning" : "default"} subtitle="Across all patients" />
        <StatCard title="Active Medications" value={data.activeMedicationCount} icon={Activity} subtitle={`${patients.length} patients in care`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Today's Schedule</h2>
                <p className="text-sm text-muted-foreground">Due reminders and dose activity for today.</p>
              </div>
              <span className="text-sm text-muted-foreground">{data.todayCompletedCount}/{data.todayDoseCount} completed</span>
            </div>
            {data.schedule.length === 0 ? <EmptyState variant="activity" title="No reminders due today" description="Today's schedule will populate from active reminders and logged activity." className="py-10" /> : <div className="space-y-3">{data.schedule.map((item) => (
              <div key={item.key} className="flex flex-col gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.status === "taken" ? "bg-success/10" : item.status === "missed" ? "bg-destructive/10" : item.status === "skipped" ? "bg-warning/10" : "bg-muted"}`}>
                  {item.status === "taken" ? <CheckCircle2 className="h-5 w-5 text-success" /> : item.status === "missed" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.medication.name}</p>
                    {item.medication.is_high_risk && <RefillRiskBadge risk="high" />}
                    <Link to={`/app/patients/${item.patient.id}`} className="text-sm text-primary hover:underline">{item.patient.full_name}</Link>
                  </div>
                  <p className="text-sm text-muted-foreground">{[item.medication.strength, item.medication.instructions || item.medication.indication].filter(Boolean).join(" - ")}</p>
                  {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="text-right sm:min-w-24">
                    <p className="text-sm font-medium">{new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.source && <SourceBadge source={item.source} />}
                  {(item.status === "pending" || item.status === "snoozed") && <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate({ logId: item.logId, payload: { medication: item.medication.id, reminder: item.reminderId || undefined, scheduled_for: item.scheduledFor, status: "skipped", source: "app", actioned_at: new Date().toISOString(), note: item.note || "" } })}>Skip</Button>
                    <Button size="sm" disabled={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate({ logId: item.logId, payload: { medication: item.medication.id, reminder: item.reminderId || undefined, scheduled_for: item.scheduledFor, status: "taken", source: "app", actioned_at: new Date().toISOString(), note: item.note || "" } })}>Taken</Button>
                  </div>}
                </div>
              </div>
            ))}</div>}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Weekly Adherence Trend</h3>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.weeklyAdherence}><XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" /><YAxis hide domain={[0, 100]} /><Tooltip /><Bar dataKey="score" fill="hsl(192, 65%, 38%)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Dose Distribution</h3>
              {data.doseDistribution.every((entry) => entry.count === 0) ? <p className="text-sm text-muted-foreground">Dose distribution will appear after recent activity is recorded.</p> : <>
                <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.doseDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={42} outerRadius={72} strokeWidth={2}>{data.doseDistribution.map((entry) => <Cell key={entry.status} fill={doseColors[entry.status] || "#ccc"} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="mt-3 flex flex-wrap justify-center gap-3">{data.doseDistribution.map((entry) => <div key={entry.status} className="flex items-center gap-1.5 text-xs"><div className="h-2.5 w-2.5 rounded-full" style={{ background: doseColors[entry.status] }} /><span className="capitalize text-muted-foreground">{entry.status} ({entry.count})</span></div>)}</div>
              </>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/app/dose-logs">Open Dose Logs</Link></Button>
            </div>
            {data.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">Activity will appear here once dose events are logged.</p> : <div className="space-y-3">{data.recentActivity.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center sm:gap-3">
                <StatusBadge status={log.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{medicationMap[log.medication]?.name || "Medication"}<span className="text-sm font-normal text-muted-foreground"> - {patientMap[log.patient]?.full_name || "Unknown patient"}</span></p>
                  {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <SourceBadge source={log.source} />
                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Weekly Adherence</h3>
            <div className="flex flex-col items-center gap-3">
              <AdherenceRing score={data.overallAdherence} size="lg" />
              <p className="text-center text-sm text-muted-foreground">{data.adherenceTrend >= 0 ? "Adherence is improving compared to last week." : "Adherence dipped compared to last week and needs attention."}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Care Network</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-4"><p className="text-2xl font-bold">{patients.length}</p><p className="text-sm text-muted-foreground">Patients</p></div>
              <div className="rounded-lg bg-muted/40 p-4"><p className="text-2xl font-bold">{caregivers.length}</p><p className="text-sm text-muted-foreground">Caregivers</p></div>
              <div className="rounded-lg bg-muted/40 p-4"><p className="text-2xl font-bold">{providers.length}</p><p className="text-sm text-muted-foreground">Providers</p></div>
              <div className="rounded-lg bg-muted/40 p-4"><p className="text-2xl font-bold">{prescriptions.length}</p><p className="text-sm text-muted-foreground">Prescriptions</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-medium text-muted-foreground">Patients Needing Attention</h3><Users className="h-4 w-4 text-muted-foreground" /></div>
            <div className="space-y-3">{data.patientsNeedingAttention.map((patient) => <Link key={patient.id} to={`/app/patients/${patient.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/20"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{getInitials(patient.full_name)}</div><div className="min-w-0 flex-1"><p className="font-medium">{patient.full_name}</p><p className="text-xs text-muted-foreground">{patient.adherence_summary.active_medications} active meds</p></div><div className="space-y-1 text-right"><p className="text-sm font-semibold">{getAdherenceScore(patient.adherence_summary)}%</p><RefillRiskBadge risk={getRefillRisk(patient.adherence_summary)} /></div></Link>)}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-medium text-muted-foreground">Refill Alerts</h3><Bell className="h-4 w-4 text-warning" /></div>
            {data.refillAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No refill concerns in the next 7 days.</p> : <div className="space-y-3">{data.refillAlerts.map((medication) => <div key={medication.id} className="rounded-lg border border-warning/15 bg-warning/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{medication.name}</p><p className="text-sm text-muted-foreground">{patientMap[medication.patient]?.full_name || "Unknown patient"}</p></div><RefillRiskBadge risk="high" /></div><p className="mt-3 text-sm text-muted-foreground">{medication.current_quantity} doses left</p><p className="text-xs text-muted-foreground">Refill by {medication.estimated_refill_date ? new Date(medication.estimated_refill_date).toLocaleDateString() : "soon"}</p></div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
