"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import {
  STORAGE_KEYS,
  preferencesSchema,
  DEFAULT_PREFERENCES,
  emailFrequencies,
  taskViews,
  themes,
} from "@/types/profile";
import { useTheme } from "next-themes";
import { useAuth } from "@/app/context/ContextApiProvider";
import { createNotification } from "@/utils/supabase/notifications";

export default function NotificationPreferences() {
  // Manage preferences in local storage with Zod validation
  const [prefs, setPrefs] = useLocalStorageState(
    STORAGE_KEYS.PREFERENCES,
    preferencesSchema,
    DEFAULT_PREFERENCES
  );
  const [saving, setSaving] = useState(false);
  const { setTheme } = useTheme();
  const { user } = useAuth();

  // Load preferences from server on component mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.preferences as any;
        if (p) {
          const next = {
            emailNotifications: !!p.email_notifications,
            emailFrequency: p.email_frequency ?? prefs.emailFrequency,
            pushNotifications: !!p.push_notifications,
            taskUpdates: !!p.task_updates_notifications,
            defaultTaskView: p.default_task_view ?? prefs.defaultTaskView,
            startTime: p.work_start_time ?? prefs.startTime,
            endTime: p.work_end_time ?? prefs.endTime,
            theme: (p.theme ?? prefs.theme) as typeof themes[number],
            availability: prefs.availability,
          } as typeof prefs;
          setPrefs(next);
          setTheme(next.theme);
        }
      } catch {
        // ignore
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme immediately when preference changes
  useEffect(() => {
    setTheme(prefs.theme);
  }, [prefs.theme, setTheme]);

  // Save preferences to server and sync timezone if present
  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const updates = {
        email_notifications: prefs.emailNotifications,
        email_frequency: prefs.emailFrequency,
        push_notifications: prefs.pushNotifications,
        task_updates_notifications: prefs.taskUpdates,
        default_task_view: prefs.defaultTaskView,
        work_start_time: prefs.startTime,
        work_end_time: prefs.endTime,
        theme: prefs.theme,
      };

      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "preferences", data: updates }),
      }).catch(() => {});

      // If timezone stored locally (from Work settings), sync it via profile update
      const local = (prefs as any);
      if (local.timezone) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "profile", data: { timezone: local.timezone } }),
        }).catch(() => {});
      }

      toast.success("Preferences saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  // Send a test notification to verify notification settings
  const sendTest = useCallback(async () => {
    if (!user?.id) return;
    try {
      await createNotification({
        user_id: user.id,
        type: "test",
        title: "Test notification",
        body: "This is a test notification from Preferences.",
        data: { source: "preferences" },
        is_read: false,
      } as any);
      toast.success("Test notification sent");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send test notification");
    }
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Notifications & Preferences</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Receive email alerts for activity</p>
            </div>
            <Switch
              checked={prefs.emailNotifications}
              onCheckedChange={(v) => setPrefs({ ...prefs, emailNotifications: v })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email frequency</label>
            <Select
              value={prefs.emailFrequency}
              onValueChange={(v) => setPrefs({ ...prefs, emailFrequency: v as typeof emailFrequencies[number] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailFrequencies.map((f) => (
                  <SelectItem key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-xs text-muted-foreground">Allow in-app notifications</p>
            </div>
            <Switch
              checked={prefs.pushNotifications}
              onCheckedChange={(v) => setPrefs({ ...prefs, pushNotifications: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Task updates</p>
              <p className="text-xs text-muted-foreground">Notify when tasks change</p>
            </div>
            <Switch
              checked={prefs.taskUpdates}
              onCheckedChange={(v) => setPrefs({ ...prefs, taskUpdates: v })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default task view</label>
            <Select
              value={prefs.defaultTaskView}
              onValueChange={(v) => setPrefs({ ...prefs, defaultTaskView: v as typeof taskViews[number] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskViews.map((v) => (
                  <SelectItem key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <Select
              value={prefs.theme}
              onValueChange={(v) => setPrefs({ ...prefs, theme: v as typeof themes[number] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" className="border-neutral-700" type="button" onClick={sendTest}>
          Send test notification
        </Button>
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Preferences"}</Button>
      </div>
    </div>
  );
}
