import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  Pill,
  Printer,
  TrendingUp,
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

import { AdherenceRing } from "@/components/common/AdherenceRing";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/export-utils";
import { apiClient } from "@/services/api";
import type { DoseLogRecord, MedicationRecord, PatientRecord } from "@/types";

const COLORS = [
  "hsl(152,55%,42%)",
  "hsl(0,72%,51%)",
  "hsl(38,92%,50%)",
  "hsl(192,65%,38%)",
];

export default function Reports() {
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

  const activeMedications = useMemo(
    () => medications.filter((medication) => medication.status === "active"),
    [medications],
  );

  const highRiskMeds = useMemo(
    () => medications.filter((medication) => medication.is_high_risk),
    [medications],
  );

  const refillDue = useMemo(() => {
    const today = new Date();
    const threshold = new Date();
    threshold.setDate(today.getDate() + 7);

    return medications.filter((medication) => {
      if (!medication.estimated_refill_date) {
        return false;
      }

      const refillDate = new Date(medication.estimated_refill_date);
      return refillDate <= threshold;
    });
  }, [medications]);

  const overallAdherence = useMemo(() => {
    const actionable = doseLogs.filter(
      (log) => log.status === "taken" || log.status === "missed" || log.status === "skipped",
    );
    if (actionable.length === 0) {
      return 0;
    }

    const taken = actionable.filter((log) => log.status === "taken").length;
    return Math.round((taken / actionable.length) * 100);
  }, [doseLogs]);

  const doseDistribution = useMemo(
    () => [
      { status: "taken", count: doseLogs.filter((log) => log.status === "taken").length },
      { status: "missed", count: doseLogs.filter((log) => log.status === "missed").length },
      { status: "skipped", count: doseLogs.filter((log) => log.status === "skipped").length },
      { status: "snoozed", count: doseLogs.filter((log) => log.status === "snoozed").length },
    ],
    [doseLogs],
  );

  const weeklyAdherence = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    const today = new Date();

    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const dayKey = day.toISOString().slice(0, 10);

      const dayLogs = doseLogs.filter(
        (log) => log.scheduled_for.slice(0, 10) === dayKey,
      );
      const actionable = dayLogs.filter(
        (log) => log.status === "taken" || log.status === "missed" || log.status === "skipped",
      );
      const taken = actionable.filter((log) => log.status === "taken").length;

      return {
        day: formatter.format(day),
        score: actionable.length === 0 ? 0 : Math.round((taken / actionable.length) * 100),
      };
    });
  }, [doseLogs]);

  const patientSummaryRows = useMemo(
    () =>
      patients.map((patient) => ({
        patient: patient.full_name,
        adherence_score: patient.adherence_summary.adherence_score ?? "",
        active_medications: patient.adherence_summary.active_medications,
        missed_doses: patient.adherence_summary.missed_count,
        refill_risk: patient.adherence_summary.refill_due.length > 0 ? "high" : "low",
      })),
    [patients],
  );

  function handleExport() {
    if (patientSummaryRows.length === 0) {
      return;
    }

    downloadCsv("medimate-report-summary.csv", patientSummaryRows, [
      "patient",
      "adherence_score",
      "active_medications",
      "missed_doses",
      "refill_risk",
    ]);
  }

  const isLoading =
    patientsQuery.isLoading || medicationsQuery.isLoading || doseLogsQuery.isLoading;
  const isError =
    patientsQuery.isError || medicationsQuery.isError || doseLogsQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Summary</h1>
          <p className="mt-1 text-muted-foreground">
            Live adherence insights, refill tracking, and patient summaries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load reports"
          message="Report data could not be aggregated from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            medicationsQuery.refetch();
            doseLogsQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          title="Not enough data yet"
          description="Create patients, medications, and dose logs to generate live reports."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Overall Adherence"
              value={`${overallAdherence}%`}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard title="Active Medications" value={activeMedications.length} icon={Pill} />
            <StatCard
              title="Refill Due Soon"
              value={refillDue.length}
              icon={AlertTriangle}
              variant={refillDue.length > 0 ? "warning" : "default"}
            />
            <StatCard
              title="High Risk Meds"
              value={highRiskMeds.length}
              icon={AlertTriangle}
              variant={highRiskMeds.length > 0 ? "danger" : "default"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Adherence Overview</h3>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <AdherenceRing score={overallAdherence} size="lg" />
                <div className="h-48 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyAdherence}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(192, 65%, 38%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Dose Status Distribution</h3>
              {doseLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Dose distribution will appear after the first activity logs are recorded.
                </p>
              ) : (
                <>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={doseDistribution}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          strokeWidth={2}
                        >
                          {doseDistribution.map((entry, index) => (
                            <Cell
                              key={entry.status}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {doseDistribution.map((entry, index) => (
                      <div key={entry.status} className="flex items-center gap-1.5 text-sm">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ background: COLORS[index] }}
                        />
                        <span className="capitalize text-muted-foreground">
                          {entry.status}: {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">Medications Due for Refill</h3>
            {refillDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No medications are currently due for refill in the next 7 days.
              </p>
            ) : (
              <div className="space-y-3">
                {refillDue.map((medication) => (
                  <div
                    key={medication.id}
                    className="flex items-center justify-between rounded-lg border border-warning/15 bg-warning/5 p-4"
                  >
                    <div>
                      <p className="font-medium">{medication.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patientMap[medication.patient]?.full_name || "Unknown patient"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-warning">
                        {medication.current_quantity} doses left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Refill by{" "}
                        {medication.estimated_refill_date
                          ? new Date(medication.estimated_refill_date).toLocaleDateString()
                          : "unknown"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">Medication Burden Summary</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-3xl font-bold">{medications.length}</p>
                <p className="text-sm text-muted-foreground">Total Medications</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-3xl font-bold">{activeMedications.length}</p>
                <p className="text-sm text-muted-foreground">Currently Active</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-3xl font-bold">{highRiskMeds.length}</p>
                <p className="text-sm text-muted-foreground">High-Risk Medications</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
