"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  is_archived?: boolean | null;
}

type LoadParams = {
  workspaceId?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useProjects(initial: Partial<LoadParams> = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page ?? 1);
  const [pageSize] = useState(initial.pageSize ?? 10);
  const [search, setSearch] = useState(initial.search ?? "");
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(
    initial.workspaceId
  );
  const [total, setTotal] = useState<number>(0);

  const subscribedRef = useRef(false);

  const load = useCallback(
    async (opts?: Partial<LoadParams>) => {
      const ws = opts?.workspaceId ?? workspaceId;
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

        // Build filters without relying on PostgREST join relationships
        let query = supabase
          .from("projects")
          .select(
            "id, workspace_id, name, description, created_by, created_at, is_archived",
            { count: "exact" }
          )
          .order("created_at", { ascending: false });

        if (ws) {
          query = query.eq("workspace_id", ws);
        } else if (uid) {
          const { data: memberships, error: memErr } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", uid);
          if (memErr) throw memErr;
          const wsIds = (memberships ?? []).map((r: any) => r.workspace_id as string);
          if (wsIds.length === 0) {
            setItems([]);
            setTotal(0);
            setLoading(false);
            return;
          }
          query = query.in("workspace_id", wsIds);
        }
        if (q && q.trim().length) {
          const like = `%${q.trim()}%`;
          query = query.or(
            `name.ilike.${like},description.ilike.${like}`
          );
        }

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        const rows = (data ?? []).map((r: any) => ({
          id: r.id,
          workspace_id: r.workspace_id,
          name: r.name,
          description: r.description,
          created_by: r.created_by,
          created_at: r.created_at,
          is_archived: r.is_archived ?? null,
        })) as ProjectRow[];
        setItems(rows);
        setTotal(count ?? 0);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load projects");
      } finally {
        setLoading(false);
      }
    },
    [supabase, workspaceId, search, page, pageSize]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, search, page, pageSize]);

  useEffect(() => {
    if (!workspaceId || subscribedRef.current) return;
    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          // Keep it simple: reload on any change
          load();
        }
      )
      .subscribe();
    subscribedRef.current = true;
    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [supabase, workspaceId, load]);

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
    setWorkspaceId,
    workspaceId,
    reload: load,
    setItems, // allow optimistic updates
  } as const;
}
