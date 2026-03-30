import { useState } from "react";
import type { ComponentProps } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
import type {
  AiAssistRequestPayload,
  AiAssistResponse,
  AiStatusResponse,
  AiSurface,
} from "@/types";

interface AiAssistantDialogProps {
  surface: AiSurface;
  title: string;
  description: string;
  triggerLabel: string;
  defaultQuestion?: string;
  placeholder?: string;
  patientId?: string;
  medicationId?: string;
  prescriptionId?: string;
  disabled?: boolean;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  icon?: LucideIcon;
}

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-lg bg-muted/35 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiAssistantDialog({
  surface,
  title,
  description,
  triggerLabel,
  defaultQuestion,
  placeholder = "Ask MediMate AI about this page or workflow...",
  patientId,
  medicationId,
  prescriptionId,
  disabled = false,
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName,
  icon: Icon = Sparkles,
}: AiAssistantDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(defaultQuestion || "");
  const [response, setResponse] = useState<AiAssistResponse | null>(null);
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => apiClient.get<AiStatusResponse>("/ai/status/"),
    staleTime: 60_000,
  });

  const assistMutation = useMutation({
    mutationFn: (payload: AiAssistRequestPayload) =>
      apiClient.post<AiAssistResponse>("/ai/assist/", payload),
    onSuccess: (result) => {
      setResponse(result);
    },
    onError: (error: Error) => {
      toast({
        title: "AI request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function runAssistant() {
    assistMutation.mutate({
      surface,
      patient_id: patientId,
      medication_id: medicationId,
      prescription_id: prescriptionId,
      question: question.trim() || defaultQuestion || undefined,
    });
  }

  function handleTriggerClick() {
    setOpen(true);
    if (statusQuery.data?.enabled) {
      runAssistant();
    }
  }

  const notConfigured =
    statusQuery.data && !statusQuery.data.enabled && !statusQuery.isLoading;

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        disabled={disabled}
        onClick={handleTriggerClick}
      >
        <Icon className="mr-2 h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI Prompt
              </p>
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="mt-3 min-h-[110px] bg-background"
                placeholder={placeholder}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {statusQuery.data?.model
                    ? `Model: ${statusQuery.data.model}`
                    : "Model available after backend status loads"}
                </span>
                {statusQuery.data?.enabled && (
                  <span>Server-side OpenAI integration is active for this app.</span>
                )}
              </div>
            </div>

            {statusQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking MediMate AI status...
              </div>
            ) : notConfigured ? (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">OpenAI key not configured</p>
                    <p className="text-muted-foreground">
                      Add `OPENAI_API_KEY` to the server `.env` file, restart Django, and this AI panel will become active.
                    </p>
                    <p className="text-muted-foreground">
                      {statusQuery.data?.note || "The key stays on the server and is never exposed in the browser."}
                    </p>
                  </div>
                </div>
              </div>
            ) : response ? (
              <ScrollArea className="max-h-[48vh] rounded-xl border border-border bg-card">
                <div className="space-y-5 p-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{response.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(response.generated_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{response.summary}</p>
                  </div>

                  <Separator />
                  <Section title="Highlights" items={response.highlights} />
                  <Section title="Recommended Actions" items={response.actions} />
                  <Section title="Warnings" items={response.warnings} />

                  <div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                    {response.disclaimer}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Write a prompt or use the default page question, then generate an AI insight.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={assistMutation.isPending || notConfigured === true}
              onClick={runAssistant}
            >
              {assistMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {response ? "Refresh Insight" : "Generate Insight"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
