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
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const subscribedRef = React.useRef(false);

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
    if (!user?.id || subscribedRef.current) return;
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
    subscribedRef.current = true;
    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [supabase, user?.id]);

  const toggleRead = async (id: string, next: boolean) => {
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

  const clearAll = async () => {
    if (!user?.id) return;
    if (items.length === 0) return;
    try {
      setItems([]);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('All notifications cleared');
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to clear notifications");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">Unread: <span className="text-foreground">{unread}</span></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={markAll} disabled={!unread}>
            Mark all read
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={clearAll} disabled={items.length === 0}>
            Clear all
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No notifications yet.</div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {items.map((n) => (
            <li key={n.id} className={`px-4 py-3 transition-colors ${n.is_read ? 'bg-card hover:bg-accent' : 'bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-muted-foreground' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground leading-5">{n.title}</div>
                  {n.body ? (
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</div>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs px-2 rounded-md" 
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
  );
}
