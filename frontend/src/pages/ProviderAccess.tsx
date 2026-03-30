import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Shield } from "lucide-react";

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
  PatientRecord,
  ProviderAccessCreatePayload,
  ProviderAccessRecord,
  User,
} from "@/types";

interface ProviderAccessFormState extends ProviderAccessCreatePayload {}

const defaultFormState: ProviderAccessFormState = {
  patient: "",
  provider: "",
  provider_role: "doctor",
  organization: "",
  can_view_full_medication_list: true,
  can_manage_medications: false,
};

export default function ProviderAccessPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProviderAccessFormState>(defaultFormState);
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const patientsQuery = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
  });

  const providersQuery = useQuery({
    queryKey: ["provider-access", "all"],
    queryFn: () => apiClient.listAll<ProviderAccessRecord>("/provider-access/"),
  });

  const usersQuery = useQuery({
    queryKey: ["users", "provider-directory"],
    queryFn: () => apiClient.listAll<User>("/auth/users/"),
  });

  const createProviderMutation = useMutation({
    mutationFn: (payload: ProviderAccessCreatePayload) =>
      apiClient.post<ProviderAccessRecord>("/provider-access/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-access"] });
      setForm(defaultFormState);
      setIsDialogOpen(false);
      toast({
        title: "Provider access added",
        description: "The provider can now access this patient record.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add provider access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const providerAccess = providersQuery.data ?? [];
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

  const filteredAccess = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return providerAccess;
    }

    return providerAccess.filter((item) => {
      const providerName =
        item.provider_detail?.full_name?.toLowerCase() ||
        userMap[item.provider]?.full_name?.toLowerCase() ||
        "";
      const patientName = patientMap[item.patient]?.full_name?.toLowerCase() || "";
      return (
        providerName.includes(term) ||
        patientName.includes(term) ||
        item.provider_role.toLowerCase().includes(term) ||
        item.organization.toLowerCase().includes(term)
      );
    });
  }, [deferredSearch, patientMap, providerAccess, userMap]);

  function updateForm<K extends keyof ProviderAccessFormState>(
    field: K,
    value: ProviderAccessFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.patient || !form.provider) {
      toast({
        title: "Patient and provider are required",
        description: "Choose the patient and the user receiving access.",
        variant: "destructive",
      });
      return;
    }

    await createProviderMutation.mutateAsync({
      ...form,
      organization: form.organization.trim(),
    });
  }

  const isLoading =
    patientsQuery.isLoading || providersQuery.isLoading || usersQuery.isLoading;
  const isError = patientsQuery.isError || providersQuery.isError || usersQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Access</h1>
          <p className="mt-1 text-muted-foreground">
            Manage which healthcare providers can view or manage patient data.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={!patientsQuery.isLoading && patients.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient, provider, or org..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load provider access"
          message="Provider access records could not be loaded from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            providersQuery.refetch();
            usersQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No patients available"
          description="Create a patient profile before granting provider access."
        />
      ) : filteredAccess.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={providerAccess.length === 0 ? "No provider access configured" : "No provider access found"}
          description={
            providerAccess.length === 0
              ? "Grant access to doctors, pharmacists, or care coordinators so they can review adherence data."
              : "No provider access records match your current search."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAccess.map((item) => {
            const provider = item.provider_detail || userMap[item.provider];
            const patient = patientMap[item.patient];

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                  {getInitials(provider?.full_name || "PR")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{provider?.full_name || "Provider"}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider?.email || "No email"}{" "}
                    {item.organization ? `- ${item.organization}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Patient: {patient?.full_name || "Unknown patient"}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <RoleBadge role={item.provider_role} />
                  <p className="text-xs text-muted-foreground">
                    Full list: {item.can_view_full_medication_list ? "Yes" : "No"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manage meds: {item.can_manage_medications ? "Yes" : "No"}
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
            <DialogTitle>Add Provider Access</DialogTitle>
            <DialogDescription>
              Grant a user access to view or manage patient medication information.
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
                <Label>Provider user</Label>
                <Select
                  value={form.provider}
                  onValueChange={(value) => updateForm("provider", value)}
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
                <Label>Provider role</Label>
                <Select
                  value={form.provider_role}
                  onValueChange={(value) =>
                    updateForm(
                      "provider_role",
                      value as ProviderAccessFormState["provider_role"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="care_coordinator">Care coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={form.organization}
                  onChange={(event) => updateForm("organization", event.target.value)}
                  placeholder="City Hospital"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.can_view_full_medication_list}
                  onCheckedChange={(checked) =>
                    updateForm("can_view_full_medication_list", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">View full medication list</p>
                  <p className="text-xs text-muted-foreground">
                    Allow access to the complete medication and reminder plan.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.can_manage_medications}
                  onCheckedChange={(checked) =>
                    updateForm("can_manage_medications", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Manage medications</p>
                  <p className="text-xs text-muted-foreground">
                    Allow updates to medication records and schedules.
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
              <Button type="submit" disabled={createProviderMutation.isPending}>
                {createProviderMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
