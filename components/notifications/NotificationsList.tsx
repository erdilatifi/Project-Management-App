"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/ContextApiProvider";
import { createClient } from "@/utils/supabase/client";
import {
  fetchNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationRow,
} from "@/utils/supabase/notifications";
import { toast } from "sonner";

export default function NotificationsList() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [subscribed, setSubscribed] = useState(false);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchNotificationsForUser(user.id, 50);
      setItems(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setItems([]);
    if (user?.id) load();
  }, [user?.id, load]);

  useEffect(() => {
    if (!user?.id || subscribed) return;
    const channel = supabase
      .channel("profile-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          setItems((prev) => [n, ...prev]);
        }
      )
      .subscribe();
    setSubscribed(true);
    return () => {
      supabase.removeChannel(channel);
      setSubscribed(false);
    };
  }, [supabase, user?.id, subscribed]);

  const toggleRead = async (id: number, next: boolean) => {
    try {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: next } : n)));
      await markNotificationRead(id, next);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update notification");
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: !next } : n)));
    }
  };

  const markAll = async () => {
    if (!user?.id) return;
    if (!unread) return;
    try {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await markAllNotificationsRead(user.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mark all read");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-300">Unread: {unread}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-neutral-700" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" className="border-neutral-700" onClick={markAll} disabled={!unread}>
            Mark all read
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-neutral-400">No notifications yet.</div>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
          {items.map((n) => (
            <li key={n.id} className={`px-3 py-3 ${n.is_read ? 'bg-black' : 'bg-neutral-950'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${n.is_read ? 'bg-neutral-700' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{n.title}</div>
                  {n.body ? (
                    <div className="text-xs text-neutral-300 mt-1 whitespace-pre-wrap">{n.body}</div>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-neutral-700" onClick={() => toggleRead(n.id, !n.is_read)}>
                      {n.is_read ? 'Mark unread' : 'Mark read'}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

