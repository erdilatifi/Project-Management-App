"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/ContextApiProvider";
import {
  fetchNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationRow,
} from "@/utils/supabase/notifications";
import { toast } from "sonner";

export default function NotificationsBell() {
  const supabase = createClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchNotificationsForUser(user.id, 30);
      setItems(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    setItems([]);
    if (user?.id) load();
  }, [user?.id, load]);

  // Realtime subscription to new notifications for this user
  useEffect(() => {
    if (!user?.id || hasSubscribed) return;
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new as NotificationRow;
          setItems((prev) => [n, ...prev]);
        }
      )
      .subscribe();

    setHasSubscribed(true);
    return () => {
      supabase.removeChannel(channel);
      setHasSubscribed(false);
    };
  }, [supabase, user?.id, hasSubscribed]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

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
    const pending = items.some((n) => !n.is_read);
    if (!pending) return;
    try {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await markAllNotificationsRead(user.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mark all read");
      // reload to ensure consistency
      load();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label="Notifications"
        className="relative p-2 rounded-md hover:bg-neutral-900 text-white"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-[10px] leading-4 text-white text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] overflow-auto rounded-md border border-neutral-700 bg-black shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
            <div className="text-sm font-medium text-white">Notifications</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs border-neutral-700" onClick={load} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-neutral-700" onClick={markAll} disabled={unreadCount === 0}>
                Mark all read
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-300">No notifications</div>
          ) : (
            <ul className="divide-y divide-neutral-800">
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-neutral-700"
                          onClick={() => toggleRead(n.id, !n.is_read)}
                        >
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
      )}
    </div>
  );
}

