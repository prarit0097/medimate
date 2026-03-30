import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BellRing, Loader2, Sparkles } from "lucide-react";

import { AiAssistantDialog } from "@/components/ai/AiAssistantDialog";
import { RoleBadge } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  defaultNotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notification-utils";
import { apiClient } from "@/services/api";
import type { AiStatusResponse, UpdateProfilePayload, User } from "@/types";
import type { NotificationPreferences } from "@/lib/notification-utils";

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const defaultPasswordState: PasswordFormState = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState<UpdateProfilePayload>({
    full_name: "",
    phone_number: "",
    preferred_language: "en",
    timezone: "Asia/Kolkata",
  });
  const [notifications, setNotifications] =
    useState<NotificationPreferences>(defaultNotificationPreferences);
  const [passwordForm, setPasswordForm] =
    useState<PasswordFormState>(defaultPasswordState);
  const browserSupported = typeof window !== "undefined" && "Notification" in window;
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    browserSupported ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      full_name: user.full_name,
      phone_number: user.phone_number || "",
      preferred_language: user.preferred_language,
      timezone: user.timezone,
    });
  }, [user]);

  useEffect(() => {
    setNotifications(loadNotificationPreferences());
  }, []);

  const profileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiClient.patch<User>("/auth/me/", payload),
    onSuccess: async () => {
      await refreshUser();
      toast({
        title: "Profile updated",
        description: "Your account profile has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      apiClient.post<{ detail: string }>("/auth/change-password/", payload),
    onSuccess: () => {
      setPasswordForm(defaultPasswordState);
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const aiStatusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => apiClient.get<AiStatusResponse>("/ai/status/"),
    staleTime: 60_000,
  });

  if (!user) {
    return null;
  }

  function updateProfileField<K extends keyof UpdateProfilePayload>(
    field: K,
    value: UpdateProfilePayload[K],
  ) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updateNotificationField<K extends keyof NotificationPreferences>(
    field: K,
    value: NotificationPreferences[K],
  ) {
    setNotifications((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField<K extends keyof PasswordFormState>(
    field: K,
    value: PasswordFormState[K],
  ) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileForm.full_name.trim()) {
      toast({
        title: "Full name is required",
        description: "Add your name before saving the profile.",
        variant: "destructive",
      });
      return;
    }

    await profileMutation.mutateAsync({
      full_name: profileForm.full_name.trim(),
      phone_number: profileForm.phone_number?.trim() || "",
      preferred_language: profileForm.preferred_language,
      timezone: profileForm.timezone.trim(),
    });
  }

  function handleNotificationSave() {
    saveNotificationPreferences(notifications);
    toast({
      title: "Preferences saved",
      description: "Notification settings are now active across the web app.",
    });
  }

  async function handleEnableBrowserNotifications() {
    if (!browserSupported) {
      toast({
        title: "Browser notifications unavailable",
        description: "This browser does not support the Notification API.",
        variant: "destructive",
      });
      return;
    }

    if (browserPermission === "denied") {
      toast({
        title: "Notifications blocked",
        description: "Allow notifications from browser site settings for localhost.",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    toast({
      title:
        permission === "granted"
          ? "Browser notifications enabled"
          : "Browser notifications not enabled",
      description:
        permission === "granted"
          ? "Missed doses, refill alerts, and other new items can now reach the browser."
          : "In-app notifications from the bell will continue to work.",
      variant: permission === "granted" ? "default" : "destructive",
    });
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      toast({
        title: "All password fields are required",
        description: "Enter your current password and confirm the new one.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must be identical.",
        variant: "destructive",
      });
      return;
    }

    await passwordMutation.mutateAsync({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account details, preferences, and password.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form
            className="space-y-6 rounded-xl border border-border bg-card p-6"
            onSubmit={handleProfileSubmit}
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {user.full_name
                  .split(" ")
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.full_name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={profileForm.full_name}
                  onChange={(event) =>
                    updateProfileField("full_name", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} type="email" disabled />
                <p className="text-xs text-muted-foreground">
                  Email is read-only in the current backend build.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input
                  value={profileForm.phone_number || ""}
                  onChange={(event) =>
                    updateProfileField("phone_number", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred language</Label>
                <Select
                  value={profileForm.preferred_language}
                  onValueChange={(value) =>
                    updateProfileField("preferred_language", value)
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
                <Label>Timezone</Label>
                <Select
                  value={profileForm.timezone}
                  onValueChange={(value) => updateProfileField("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="America/New_York">US Eastern</SelectItem>
                    <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">UAE (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Notification Preferences</h3>
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">In-app and browser notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Bell icon top-bar alerts always work. Browser notifications need explicit permission.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status:{" "}
                    {browserPermission === "granted"
                      ? "Enabled"
                      : browserPermission === "denied"
                        ? "Blocked in browser"
                        : browserPermission === "unsupported"
                          ? "Not supported"
                          : "Not enabled"}
                  </p>
                </div>
              </div>
              {browserPermission !== "granted" && browserPermission !== "unsupported" && (
                <Button type="button" variant="outline" onClick={handleEnableBrowserNotifications}>
                  Enable browser alerts
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {[
                {
                  key: "missedDoseAlerts" as const,
                  label: "Missed dose alerts",
                  description: "Get notified when a dose is missed.",
                },
                {
                  key: "refillReminders" as const,
                  label: "Refill reminders",
                  description: "Receive alerts before medications run out.",
                },
                {
                  key: "weeklySummary" as const,
                  label: "Weekly adherence summary",
                  description: "Receive a weekly medication adherence digest.",
                },
                {
                  key: "caregiverUpdates" as const,
                  label: "Caregiver updates",
                  description: "Receive updates shared by caregivers.",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) =>
                      updateNotificationField(item.key, checked)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleNotificationSave}>
                Save preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  MediMate AI
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Server-side OpenAI features power workspace summaries, patient briefs, report narratives, and workflow guidance.
                </p>
              </div>
              <AiAssistantDialog
                surface="general"
                title="MediMate AI Workspace Assistant"
                description="Ask about your full care workspace, patient follow-up priorities, medication risks, and operational next steps."
                triggerLabel="Open AI Assistant"
                defaultQuestion="What are the top care priorities across this MediMate workspace right now?"
              />
            </div>

            {aiStatusQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking AI configuration...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {aiStatusQuery.data?.enabled ? "Configured" : "Needs OpenAI key"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {aiStatusQuery.data?.enabled
                      ? "AI features are active for the web app."
                      : "Add OPENAI_API_KEY in .env and restart Django to activate AI."}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Model
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {aiStatusQuery.data?.model || "Not available"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The OpenAI key remains server-side and is never exposed in the browser.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium">Available AI surfaces</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dashboard, patients, patient detail, medications, prescriptions, dose logs, caregivers, provider access, reports, and the global workspace assistant.
              </p>
              {aiStatusQuery.data?.missing_configuration?.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Missing configuration: {aiStatusQuery.data.missing_configuration.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <form
            className="space-y-6 rounded-xl border border-border bg-card p-6"
            onSubmit={handlePasswordSubmit}
          >
            <h3 className="font-semibold">Account Security</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    updatePasswordField("current_password", event.target.value)
                  }
                  placeholder="Current password"
                />
              </div>

              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    updatePasswordField("new_password", event.target.value)
                  }
                  placeholder="New password"
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(event) =>
                    updatePasswordField("confirm_password", event.target.value)
                  }
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update password
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
