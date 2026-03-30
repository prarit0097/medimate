import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, FileText, Info, Search, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import {
  BROWSER_NOTIFICATIONS_STORAGE_KEY,
  buildAppNotifications,
  formatNotificationTime,
  loadNotificationPreferences,
  loadStoredIds,
  NOTIFICATION_PREFERENCES_EVENT,
  NOTIFICATION_STORAGE_KEY,
  READ_NOTIFICATIONS_STORAGE_KEY,
  saveStoredIds,
} from "@/lib/notification-utils";
import { apiClient } from "@/services/api";
import type {
  CaregiverRelationshipRecord,
  MedicationRecord,
  PatientRecord,
  PrescriptionUploadRecord,
  DoseLogRecord,
} from "@/types";

function notificationIcon(kind: string, severity: string) {
  if (kind === "refill") return AlertTriangle;
  if (kind === "prescription") return FileText;
  if (severity === "success") return CheckCircle2;
  if (severity === "warning" || severity === "danger") return AlertTriangle;
  return Info;
}

function notificationTone(severity: string) {
  if (severity === "danger") return "bg-destructive/10 text-destructive";
  if (severity === "warning") return "bg-warning/10 text-warning";
  if (severity === "success") return "bg-success/10 text-success";
  return "bg-primary/10 text-primary";
}

export function TopBar() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => loadNotificationPreferences());
  const [readIds, setReadIds] = useState(() => new Set(loadStoredIds(READ_NOTIFICATIONS_STORAGE_KEY)));
  const browserSupported = typeof window !== "undefined" && "Notification" in window;
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    browserSupported ? Notification.permission : "unsupported",
  );
  const deliveredIdsRef = useRef(new Set(loadStoredIds(BROWSER_NOTIFICATIONS_STORAGE_KEY)));
  const browserSeededRef = useRef(false);

  const patientsQuery = useQuery({
    queryKey: ["patients", "all"],
    queryFn: () => apiClient.listAll<PatientRecord>("/patients/"),
    staleTime: 30_000,
  });
  const medicationsQuery = useQuery({
    queryKey: ["medications", "all"],
    queryFn: () => apiClient.listAll<MedicationRecord>("/medications/"),
    staleTime: 30_000,
  });
  const doseLogsQuery = useQuery({
    queryKey: ["dose-logs", "all"],
    queryFn: () => apiClient.listAll<DoseLogRecord>("/dose-logs/"),
    staleTime: 30_000,
  });
  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions", "all"],
    queryFn: () => apiClient.listAll<PrescriptionUploadRecord>("/prescriptions/"),
    staleTime: 30_000,
  });
  const caregiversQuery = useQuery({
    queryKey: ["caregiver-links", "all"],
    queryFn: () => apiClient.listAll<CaregiverRelationshipRecord>("/caregiver-links/"),
    staleTime: 30_000,
  });

  const isLoading =
    patientsQuery.isLoading ||
    medicationsQuery.isLoading ||
    doseLogsQuery.isLoading ||
    prescriptionsQuery.isLoading ||
    caregiversQuery.isLoading;

  useEffect(() => {
    const syncPreferences = () => setPreferences(loadNotificationPreferences());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_STORAGE_KEY) {
        syncPreferences();
      }
    };

    window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const notifications = useMemo(
    () =>
      buildAppNotifications({
        patients: patientsQuery.data ?? [],
        medications: medicationsQuery.data ?? [],
        doseLogs: doseLogsQuery.data ?? [],
        prescriptions: prescriptionsQuery.data ?? [],
        caregivers: caregiversQuery.data ?? [],
        preferences,
      }),
    [
      caregiversQuery.data,
      doseLogsQuery.data,
      medicationsQuery.data,
      patientsQuery.data,
      preferences,
      prescriptionsQuery.data,
    ],
  );

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;

  useEffect(() => {
    if (!browserSupported || browserPermission !== "granted" || isLoading) {
      return;
    }

    if (!browserSeededRef.current) {
      browserSeededRef.current = true;
      const seededIds = new Set(deliveredIdsRef.current);
      notifications.forEach((notification) => seededIds.add(notification.id));
      deliveredIdsRef.current = seededIds;
      saveStoredIds(BROWSER_NOTIFICATIONS_STORAGE_KEY, Array.from(seededIds));
      return;
    }

    const newNotifications = notifications.filter(
      (notification) => !deliveredIdsRef.current.has(notification.id),
    );
    if (newNotifications.length === 0) {
      return;
    }

    const updatedIds = new Set(deliveredIdsRef.current);
    newNotifications.slice(0, 3).forEach((notification) => {
      const browserNotification = new Notification(notification.title, {
        body: notification.description,
        tag: notification.id,
      });
      browserNotification.onclick = () => {
        window.focus();
        window.location.assign(notification.href);
      };
      updatedIds.add(notification.id);
    });

    deliveredIdsRef.current = updatedIds;
    saveStoredIds(BROWSER_NOTIFICATIONS_STORAGE_KEY, Array.from(updatedIds));
  }, [browserPermission, browserSupported, isLoading, notifications]);

  function persistReadIds(ids: Set<string>) {
    setReadIds(new Set(ids));
    saveStoredIds(READ_NOTIFICATIONS_STORAGE_KEY, Array.from(ids));
  }

  function markAllAsRead() {
    persistReadIds(new Set(notifications.map((notification) => notification.id)));
  }

  function markAsRead(notificationId: string) {
    const updated = new Set(readIds);
    updated.add(notificationId);
    persistReadIds(updated);
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
        description: "Allow notifications from your browser site settings for localhost.",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    browserSeededRef.current = false;

    toast({
      title:
        permission === "granted"
          ? "Browser notifications enabled"
          : "Browser notifications not enabled",
      description:
        permission === "granted"
          ? "MediMate will now surface new in-app alerts through the browser."
          : "You can still use the in-app notification bell.",
      variant: permission === "granted" ? "default" : "destructive",
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="shrink-0" />

      <div className="flex flex-1 items-center">
        <div className="relative hidden max-w-sm sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients, medications..."
            className="h-9 border-0 bg-muted/50 pl-9 focus-visible:ring-1"
          />
        </div>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center px-1 text-[10px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0 sm:w-[420px]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread of {notifications.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all
                </Button>
              )}
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link to="/app/settings" onClick={() => setOpen(false)}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          {browserPermission !== "granted" && (
            <>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Browser notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {browserPermission === "unsupported"
                      ? "This browser does not support push-style notifications."
                      : browserPermission === "denied"
                        ? "Notifications are blocked. Enable them from browser settings."
                        : "Enable browser notifications for missed doses and refill alerts."}
                  </p>
                </div>
                {browserPermission !== "unsupported" && browserPermission !== "denied" && (
                  <Button size="sm" variant="outline" onClick={handleEnableBrowserNotifications}>
                    Enable
                  </Button>
                )}
              </div>
              <Separator />
            </>
          )}

          <ScrollArea className="max-h-[420px]">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-medium">No active notifications</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New missed doses, refill alerts, care-team updates, and prescription items will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcon(notification.kind, notification.severity);
                  const isUnread = !readIds.has(notification.id);

                  return (
                    <Link
                      key={notification.id}
                      to={notification.href}
                      className="block px-4 py-3 transition-colors hover:bg-muted/30"
                      onClick={() => {
                        markAsRead(notification.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notificationTone(notification.severity)}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-sm font-medium">{notification.title}</p>
                            {isUnread && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {notification.description}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {formatNotificationTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </header>
  );
}
