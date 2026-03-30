import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Search, Users } from "lucide-react";

import { AdherenceRing } from "@/components/common/AdherenceRing";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { CardSkeleton } from "@/components/common/LoadingSkeleton";
import { RefillRiskBadge } from "@/components/common/Badges";
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
import {
  getAdherenceScore,
  getInitials,
  getRefillRisk,
  splitConditions,
} from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type { PatientCreatePayload, PatientRecord } from "@/types";

const patientSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp_number: z.string().trim().max(20).optional().or(z.literal("")),
  preferred_language: z.enum(["en", "hi"]),
  timezone: z.string().trim().min(3, "Timezone is required"),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other", "undisclosed"]),
  conditions: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  voice_reminders_enabled: z.boolean(),
  large_text_mode: z.boolean(),
  active: z.boolean(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const defaultValues: PatientFormValues = {
  full_name: "",
  phone_number: "",
  whatsapp_number: "",
  preferred_language: "en",
  timezone: "Asia/Kolkata",
  date_of_birth: "",
  gender: "undisclosed",
  conditions: "",
  notes: "",
  voice_reminders_enabled: false,
  large_text_mode: false,
  active: true,
};

export default function Patients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
  });

  const createPatientMutation = useMutation({
    mutationFn: (payload: PatientCreatePayload) =>
      apiClient.post<PatientRecord>("/patients/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      reset(defaultValues);
      setIsDialogOpen(false);
      toast({
        title: "Patient added",
        description: "The new patient has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add patient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const filteredPatients = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return patients;
    }

    return patients.filter((patient) => {
      const conditions = splitConditions(patient.conditions);
      return (
        patient.full_name.toLowerCase().includes(term) ||
        patient.phone_number.toLowerCase().includes(term) ||
        patient.whatsapp_number.toLowerCase().includes(term) ||
        patient.account_email?.toLowerCase().includes(term) ||
        conditions.some((condition) => condition.toLowerCase().includes(term))
      );
    });
  }, [deferredSearch, patients]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: PatientCreatePayload = {
      full_name: values.full_name.trim(),
      phone_number: values.phone_number?.trim() || "",
      whatsapp_number: values.whatsapp_number?.trim() || "",
      preferred_language: values.preferred_language,
      timezone: values.timezone.trim(),
      gender: values.gender,
      conditions: values.conditions?.trim() || "",
      notes: values.notes?.trim() || "",
      voice_reminders_enabled: values.voice_reminders_enabled,
      large_text_mode: values.large_text_mode,
      active: values.active,
    };

    if (values.date_of_birth) {
      payload.date_of_birth = values.date_of_birth;
    }

    await createPatientMutation.mutateAsync(payload);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="mt-1 text-muted-foreground">Manage and monitor patient profiles</p>
        </div>
        <Button type="button" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or condition..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {patientsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : patientsQuery.isError ? (
        <ErrorState
          title="Unable to load patients"
          message="The patient list could not be loaded from the backend."
          onRetry={() => patientsQuery.refetch()}
        />
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          variant="patients"
          title={patients.length === 0 ? "No patients yet" : "No patients found"}
          description={
            patients.length === 0
              ? "Start by adding your first patient profile."
              : "No patients match your search. Try a different term or add a new patient."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => {
            const conditions = splitConditions(patient.conditions);
            const adherenceScore = getAdherenceScore(patient.adherence_summary);
            const refillRisk = getRefillRisk(patient.adherence_summary);

            return (
              <Link
                key={patient.id}
                to={`/app/patients/${patient.id}`}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {getInitials(patient.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold transition-colors group-hover:text-primary">
                        {patient.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.account_email || patient.phone_number || "No linked login"}
                      </p>
                    </div>
                  </div>
                  <AdherenceRing score={adherenceScore} size="sm" showLabel={false} />
                </div>

                {conditions.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {conditions.slice(0, 3).map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">No conditions added yet.</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{patient.adherence_summary.active_medications} meds</span>
                  </div>
                  <RefillRiskBadge risk={refillRisk} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
            <DialogDescription>
              Create a new patient profile and connect medication tracking later.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" placeholder="Shanti Devi" {...register("full_name")} />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone number</Label>
                <Input
                  id="phone_number"
                  placeholder="+91 98765 43210"
                  {...register("phone_number")}
                />
                {errors.phone_number && (
                  <p className="text-sm text-destructive">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp number</Label>
                <Input
                  id="whatsapp_number"
                  placeholder="+91 98765 43210"
                  {...register("whatsapp_number")}
                />
                {errors.whatsapp_number && (
                  <p className="text-sm text-destructive">{errors.whatsapp_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preferred language</Label>
                <Select
                  value={watch("preferred_language")}
                  onValueChange={(value) =>
                    setValue("preferred_language", value as PatientFormValues["preferred_language"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={watch("gender")}
                  onValueChange={(value) =>
                    setValue("gender", value as PatientFormValues["gender"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undisclosed">Undisclosed</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of birth</Label>
                <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" {...register("timezone")} />
                {errors.timezone && (
                  <p className="text-sm text-destructive">{errors.timezone.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="conditions">Conditions</Label>
                <Textarea
                  id="conditions"
                  placeholder="Diabetes, Hypertension"
                  className="min-h-[96px]"
                  {...register("conditions")}
                />
                <p className="text-xs text-muted-foreground">
                  Add comma-separated or line-separated conditions.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any extra context for the caregiver or provider team."
                  className="min-h-[96px]"
                  {...register("notes")}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={watch("voice_reminders_enabled")}
                  onCheckedChange={(checked) =>
                    setValue("voice_reminders_enabled", checked === true)
                  }
                />
                <div>
                  <p className="text-sm font-medium">Voice reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Mark if the patient prefers voice-first reminders.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={watch("large_text_mode")}
                  onCheckedChange={(checked) => setValue("large_text_mode", checked === true)}
                />
                <div>
                  <p className="text-sm font-medium">Large text mode</p>
                  <p className="text-xs text-muted-foreground">
                    Better suited for elderly or low-vision users.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border p-3 sm:col-span-2">
                <Checkbox
                  checked={watch("active")}
                  onCheckedChange={(checked) => setValue("active", checked === true)}
                />
                <div>
                  <p className="text-sm font-medium">Active patient</p>
                  <p className="text-xs text-muted-foreground">
                    Keep the patient visible in active care workflows immediately.
                  </p>
                </div>
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset(defaultValues);
                  setIsDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPatientMutation.isPending}>
                {createPatientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Patient
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
