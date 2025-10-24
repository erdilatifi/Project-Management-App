"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import {
  STORAGE_KEYS,
  preferencesSchema,
  DEFAULT_PREFERENCES,
  timezones,
  availabilityStatuses,
  profileSchema,
  DEFAULT_PROFILE,
} from "@/types/profile";

type Preferences = typeof DEFAULT_PREFERENCES;

export default function WorkSettings() {
  const [prefs, setPrefs] = useLocalStorageState(
    STORAGE_KEYS.PREFERENCES,
    preferencesSchema,
    DEFAULT_PREFERENCES
  );
  const [profile, setProfile] = useLocalStorageState(
    STORAGE_KEYS.PROFILE,
    profileSchema,
    DEFAULT_PROFILE
  );
  const [saving, setSaving] = useState(false);
  
  // Hydrate from server if available
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const prefsSrv = json?.preferences as any;
        const profileSrv = json?.profile as any;
        if (prefsSrv) {
          setPrefs((cur) => ({
            ...cur,
            startTime: prefsSrv.work_start_time ?? cur.startTime,
            endTime: prefsSrv.work_end_time ?? cur.endTime,
            defaultTaskView: prefsSrv.default_task_view ?? cur.defaultTaskView,
            emailNotifications: !!prefsSrv.email_notifications,
            emailFrequency: prefsSrv.email_frequency ?? cur.emailFrequency,
            pushNotifications: !!prefsSrv.push_notifications,
            taskUpdates: !!prefsSrv.task_updates_notifications,
          }));
        }
        if (profileSrv?.timezone) {
          setProfile((cur) => ({ ...cur, timezone: profileSrv.timezone }));
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [setPrefs, setProfile]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      // Try to sync to API if available; fall back to local only
      const updates = {
        work_start_time: prefs.startTime,
        work_end_time: prefs.endTime,
        default_task_view: prefs.defaultTaskView,
        email_notifications: prefs.emailNotifications,
        email_frequency: prefs.emailFrequency,
        push_notifications: prefs.pushNotifications,
        task_updates_notifications: prefs.taskUpdates,
        theme: prefs.theme,
      };

      // Update preferences
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "preferences", data: updates }),
      }).catch(() => {});

      // Sync timezone into profile if present
      if (profile.timezone) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "profile", data: { timezone: profile.timezone } }),
        }).catch(() => {});
      }

      toast.success("Work settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const tzItems = useMemo(() => timezones.map((tz) => ({ value: tz, label: tz.toUpperCase() })), []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Work Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Timezone</label>
          <Select
            value={profile.timezone}
            onValueChange={(val) => setProfile({ ...profile, timezone: val as typeof timezones[number] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {tzItems.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Availability</label>
          <Select
            value={prefs.availability}
            onValueChange={(val) => setPrefs({ ...prefs, availability: val as Preferences["availability"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {availabilityStatuses.map((s) => (
                <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Working hours (start)</label>
          <Input
            type="time"
            value={prefs.startTime}
            onChange={(e) => setPrefs({ ...prefs, startTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Working hours (end)</label>
          <Input
            type="time"
            value={prefs.endTime}
            onChange={(e) => setPrefs({ ...prefs, endTime: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Work Settings"}</Button>
      </div>
    </div>
  );
}
