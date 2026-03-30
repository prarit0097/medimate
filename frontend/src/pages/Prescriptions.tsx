import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, Search, Upload } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { StatusBadge } from "@/components/common/Badges";
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
import { fileNameFromPath } from "@/lib/patient-utils";
import { apiClient } from "@/services/api";
import type {
  PatientRecord,
  PrescriptionUploadCreatePayload,
  PrescriptionUploadRecord,
} from "@/types";

interface PrescriptionFormState extends PrescriptionUploadCreatePayload {
  status: NonNullable<PrescriptionUploadCreatePayload["status"]>;
  file: File | null;
}

const defaultFormState: PrescriptionFormState = {
  patient: "",
  status: "pending",
  review_notes: "",
  file: null,
};

function backendAssetUrl(path: string) {
  if (!path) {
    return "#";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `http://127.0.0.1:8000${path}`;
}

export default function Prescriptions() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<PrescriptionFormState>(defaultFormState);
  const deferredSearch = useDeferredValue(search);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const patientsQuery = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
  });

  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions", "all"],
    queryFn: () => apiClient.listAll<PrescriptionUploadRecord>("/prescriptions/"),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file) {
        throw new Error("Select a prescription file before uploading.");
      }

      const payload = new FormData();
      payload.append("patient", form.patient);
      payload.append("status", form.status);
      payload.append("review_notes", form.review_notes?.trim() || "");
      payload.append("image", form.file);

      return apiClient.upload<PrescriptionUploadRecord>("/prescriptions/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setForm(defaultFormState);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsDialogOpen(false);
      toast({
        title: "Prescription uploaded",
        description: "The prescription file is now attached to the selected patient.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not upload prescription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const patients = patientsQuery.data ?? [];
  const prescriptions = prescriptionsQuery.data ?? [];

  const patientMap = useMemo(
    () =>
      patients.reduce<Record<string, PatientRecord>>((accumulator, patient) => {
        accumulator[patient.id] = patient;
        return accumulator;
      }, {}),
    [patients],
  );

  const filteredPrescriptions = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return prescriptions;
    }

    return prescriptions.filter((prescription) => {
      const patientName = patientMap[prescription.patient]?.full_name?.toLowerCase() || "";
      return (
        fileNameFromPath(prescription.image).toLowerCase().includes(term) ||
        prescription.review_notes.toLowerCase().includes(term) ||
        patientName.includes(term)
      );
    });
  }, [deferredSearch, patientMap, prescriptions]);

  function updateForm<K extends keyof PrescriptionFormState>(
    field: K,
    value: PrescriptionFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.patient) {
      toast({
        title: "Patient is required",
        description: "Select the patient the prescription belongs to.",
        variant: "destructive",
      });
      return;
    }

    if (!form.file) {
      toast({
        title: "File is required",
        description: "Choose a PDF, JPG, or PNG file to upload.",
        variant: "destructive",
      });
      return;
    }

    await uploadMutation.mutateAsync();
  }

  const isLoading = patientsQuery.isLoading || prescriptionsQuery.isLoading;
  const isError = patientsQuery.isError || prescriptionsQuery.isError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="mt-1 text-muted-foreground">
            Upload prescription documents and track review status.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={!patientsQuery.isLoading && patients.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload Prescription
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or file..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center transition-colors hover:bg-muted/40"
        onClick={() => setIsDialogOpen(true)}
        disabled={!patientsQuery.isLoading && patients.length === 0}
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Drag-and-drop coming next. Use the upload dialog for now.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports PDF, JPG, and PNG files up to your Django upload limit.
        </p>
      </button>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load prescriptions"
          message="Prescription records could not be loaded from the backend."
          onRetry={() => {
            patientsQuery.refetch();
            prescriptionsQuery.refetch();
          }}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          variant="prescriptions"
          title="Add a patient first"
          description="Prescription uploads belong to patients. Create at least one patient before uploading files."
        />
      ) : filteredPrescriptions.length === 0 ? (
        <EmptyState
          variant="prescriptions"
          title={prescriptions.length === 0 ? "No prescriptions uploaded yet" : "No prescriptions found"}
          description={
            prescriptions.length === 0
              ? "Upload the first prescription document to start building medication context."
              : "No prescriptions match your current search."
          }
          action={
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Prescription
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {fileNameFromPath(prescription.image)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Patient: {patientMap[prescription.patient]?.full_name || "Unknown patient"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded by{" "}
                  {prescription.uploaded_by_detail?.full_name || "Care team member"}
                </p>
                {prescription.review_notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {prescription.review_notes}
                  </p>
                )}
              </div>
              <StatusBadge status={prescription.status} />
              <div className="shrink-0 text-right">
                <p className="text-sm text-muted-foreground">
                  {new Date(prescription.created_at).toLocaleDateString()}
                </p>
                <a
                  className="text-sm font-medium text-primary hover:underline"
                  href={backendAssetUrl(prescription.image)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Prescription</DialogTitle>
            <DialogDescription>
              Attach a prescription file to a patient record for later review and OCR.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
              <Label>Review status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateForm(
                    "status",
                    value as PrescriptionFormState["status"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="needs_clarification">Needs clarification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prescription file</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) =>
                  updateForm("file", event.target.files?.[0] ?? null)
                }
              />
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {form.file.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Review notes</Label>
              <Textarea
                value={form.review_notes}
                onChange={(event) => updateForm("review_notes", event.target.value)}
                placeholder="Optional notes for pharmacy, doctor, or OCR review."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(defaultFormState);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  setIsDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
