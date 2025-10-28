"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

 

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Preferences</h3>
        <p className="text-sm text-muted-foreground mt-1">Customize your application experience</p>
      </div>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <Select
            value={prefs.theme}
            onValueChange={(v) => {
              const newTheme = v as typeof themes[number];
              setPrefs({ ...prefs, theme: newTheme });
              setTheme(newTheme);
              toast.success(`Theme changed to ${newTheme}`);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Choose your preferred color scheme. Changes apply immediately.</p>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Note:</strong> Theme preference is saved automatically. Additional notification settings will be available in future updates.
        </p>
      </div>
    </div>
  );
}
