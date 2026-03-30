import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Users } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { RoleBadge } from "@/components/common/Badges";
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
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type {
  CaregiverRelationshipCreatePayload,
  CaregiverRelationshipRecord,
  PatientRecord,
  User,
} from "@/types";

interface CaregiverFormState extends CaregiverRelationshipCreatePayload {}

const defaultFormState: CaregiverFormState = {
  patient: "",
  caregiver: "",
  relationship_type: "other",
  is_primary: false,
  receives_missed_dose_alerts: true,
  receives_refill_alerts: true,
  receives_weekly_summary: true,
};

export default function Caregivers() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<CaregiverFormState>(defaultFormState);
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const patientsQuery = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
  });

  const caregiversQuery = useQuery({
    queryKey: ["caregiver-links", "all"],
    queryFn: () => apiClient.listAll<CaregiverRelationshipRecord>("/caregiver-links/"),
  });

  const usersQuery = useQuery({
    queryKey: ["users", "caregiver-directory"],
    queryFn: () => apiClient.listAll<User>("/auth/users/?role=caregiver,patient,admin"),
  });

  const createCaregiverMutation = useMutation({
    mutationFn: (payload: CaregiverRelationshipCreatePayload) =>
      apiClient.post<CaregiverRelationshipRecord>("/caregiver-links/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caregiver-links"] });
      setForm(defaultFormState);
      setIsDialogOpen(false);
      toast({
        title: "Caregiver linked",
        description: "The caregiver relationship has been added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add caregiver",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const caregiverLinks = caregiversQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const patientMap = useMemo(
    () =>
      patients.reduce<Record<string, PatientRecord>>((accumulator, patient) => {
        accumulator[patient.id] = patient;
        return accumulator;
      }, {}),
    [patients],
  );

  const userMap = useMemo(
    () =>
      users.reduce<Record<string, User>>((accumulator, user) => {
        accumulator[user.id] = user;
        return accumulator;
      }, {}),
    [users],
  );

  const filteredLinks = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return caregiverLinks;
    }

    return caregiverLinks.filter((link) => {
      const caregiverName =
        link.caregiver_detail?.full_name?.toLowerCase() ||
        userMap[link.caregiver]?.full_name?.toLowerCase() ||
        "";
      const patientName = patientMap[link.patient]?.full_name?.toLowerCase() || "";
      return (
        caregiverName.includes(term) ||
        patientName.includes(term) ||
        link.relationship_type.toLowerCase().includes(term)
      );
    });
  }, [caregiverLinks, deferredSearch, patientMap, userMap]);

  function updateForm<K extends keyof CaregiverFormState>(
    field: K,
    value: CaregiverFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.patient || !form.caregiver) {
      toast({
        title: "Patient and caregiver are required",
        description: "Select both sides of the caregiver relationship.",
        variant: "destructive",
      });
      return;
    }

    await createCaregiverMutation.mutateAsync(form);
  }

  const isLoading =
    patientsQuery.isLoading || caregiversQuery.isLoading || usersQuery.isLoading;
  const isError = patientsQuery.isError || caregiversQuery.isError || usersQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caregivers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage caregiver relationships and alert preferences for patients.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={!patientsQuery.isLoading && patients.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Caregiver
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient or caregiver..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load caregivers"
          message="Caregiver relationships could not be loaded from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            caregiversQuery.refetch();
            usersQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients available"
          description="Create a patient profile before linking caregivers."
        />
      ) : filteredLinks.length === 0 ? (
        <EmptyState
          icon={Users}
          title={caregiverLinks.length === 0 ? "No caregiver linked yet" : "No caregiver links found"}
          description={
            caregiverLinks.length === 0
              ? "Link a family member or support contact so they can monitor missed doses and refill risk."
              : "No caregiver relationships match your current search."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Caregiver
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredLinks.map((link) => {
            const caregiver = link.caregiver_detail || userMap[link.caregiver];
            const patient = patientMap[link.patient];

            return (
              <div
                key={link.id}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                    {getInitials(caregiver?.full_name || "CG")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold">
                      {caregiver?.full_name || "Caregiver"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {link.relationship_type} - {caregiver?.email || "No email"}
                    </p>
                    <div className="mt-2">
                      <RoleBadge role={caregiver?.role || "caregiver"} />
                    </div>
                  </div>
                  {link.is_primary && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      Primary
                    </span>
                  )}
                </div>

                <div className="mb-4 text-sm text-muted-foreground">
                  Caring for{" "}
                  <span className="font-medium text-foreground">
                    {patient?.full_name || "Unknown patient"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        link.receives_missed_dose_alerts
                          ? "bg-success"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    Missed dose alerts
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        link.receives_refill_alerts
                          ? "bg-success"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    Refill reminders
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        link.receives_weekly_summary
                          ? "bg-success"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    Weekly summary
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Caregiver</DialogTitle>
            <DialogDescription>
              Link an existing user to a patient with caregiver alert preferences.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
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
                <Label>Caregiver user</Label>
                <Select
                  value={form.caregiver}
                  onValueChange={(value) => updateForm("caregiver", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select
                  value={form.relationship_type}
                  onValueChange={(value) => updateForm("relationship_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.is_primary}
                  onCheckedChange={(checked) =>
                    updateForm("is_primary", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Primary caregiver</p>
                  <p className="text-xs text-muted-foreground">
                    Mark this caregiver as the main family contact.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.receives_missed_dose_alerts}
                  onCheckedChange={(checked) =>
                    updateForm("receives_missed_dose_alerts", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Missed dose alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Notify this caregiver when a dose is missed.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.receives_refill_alerts}
                  onCheckedChange={(checked) =>
                    updateForm("receives_refill_alerts", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Refill alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Notify when medication stock is running low.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.receives_weekly_summary}
                  onCheckedChange={(checked) =>
                    updateForm("receives_weekly_summary", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Weekly summary</p>
                  <p className="text-xs text-muted-foreground">
                    Share weekly adherence rollups with this caregiver.
                  </p>
                </div>
              </label>
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
              <Button type="submit" disabled={createCaregiverMutation.isPending}>
                {createCaregiverMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Relationship
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
