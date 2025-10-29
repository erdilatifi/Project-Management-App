"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  owner_id: string;
  created_at: string;
}

type LoadParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useWorkspaces(initial: Partial<LoadParams> = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page ?? 1);
  const [pageSize] = useState(initial.pageSize ?? 10);
  const [search, setSearch] = useState(initial.search ?? "");
  const [total, setTotal] = useState<number>(0);

  const subscribedRef = useRef(false);

  const load = useCallback(
    async (opts?: Partial<LoadParams>) => {
      const q = opts?.search ?? search;
      const p = opts?.page ?? page;
      const size = opts?.pageSize ?? pageSize;

      setLoading(true);
      setError(null);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id ?? null;
        const from = (p - 1) * size;
        const to = from + size - 1;

        // Fetch memberships first and then filter workspaces by IDs
        let ids: string[] | null = null;
        if (uid) {
          const { data: memberships, error: memErr } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", uid);
          if (memErr) throw memErr;
          ids = (memberships ?? []).map((r: any) => r.workspace_id as string);
          if ((ids?.length ?? 0) === 0) {
            setItems([]);
            setTotal(0);
            setLoading(false);
            return;
          }
        }

        let query = supabase
          .from("workspaces")
          .select("id, name, slug, description, owner_id, created_at", { count: "exact" })
          .order("created_at", { ascending: false });

        if (ids && ids.length) query = query.in("id", ids);

        if (q && q.trim().length) {
          const like = `%${q.trim()}%`;
          query = query.or(`name.ilike.${like},description.ilike.${like},slug.ilike.${like}`);
        }

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        
        const rows = (data ?? []).map((w: any) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          description: w.description,
          owner_id: w.owner_id,
          created_at: w.created_at,
        })) as WorkspaceRow[];
        
        setItems(rows);
        setTotal(count ?? 0);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load workspaces");
      } finally {
        setLoading(false);
      }
    },
    [supabase, search, page, pageSize]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, pageSize]);

  useEffect(() => {
    if (subscribedRef.current) return;
    const channel = supabase
      .channel("workspaces-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspaces",
        },
        () => {
          // Reload on any change
          load();
        }
      )
      .subscribe();
    subscribedRef.current = true;
    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [supabase, load]);

  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  return {
    items,
    loading,
    error,
    page,
    pageSize,
    total,
    canPrev,
    canNext,
    search,
    setSearch,
    setPage,
    reload: load,
    setItems, // allow optimistic updates
  } as const;
}
