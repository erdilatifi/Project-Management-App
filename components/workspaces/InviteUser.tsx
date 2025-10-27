"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Props = { workspaceId: string };
type UserLite = { id: string; email: string };
type MemberRow = { user_id: string; workspace_id: string; role: "owner" | "admin" | "member" | "viewer" };

export function InviteUser({ workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce input
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  // members
  const membersQ = useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: async (): Promise<ReadonlyArray<MemberRow>> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, user_id, role")
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return (data ?? []) as ReadonlyArray<MemberRow>;
    },
  });
  const memberIds = useMemo(() => new Set((membersQ.data ?? []).map((m) => m.user_id)), [membersQ.data]);

  // search users via public view
  const searchQ = useQuery({
    queryKey: ["auth_users_public", debounced, workspaceId],
    enabled: !!debounced,
    queryFn: async (): Promise<ReadonlyArray<UserLite>> => {
      const { data, error } = await supabase
        .from("auth_users_public")
        .select("id, email")
        .ilike("email", `%${debounced}%`)
        .limit(10);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ id: string; email: string | null }>;
      return rows
        .filter((u) => typeof u.id === "string" && typeof u.email === "string")
        .map((u) => ({ id: u.id, email: u.email! }));
    },
    select: (rows) => rows.filter((u) => !memberIds.has(u.id)),
  });

  // invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (user: UserLite) => {
      // Attempt to gather a display name from app profile
      let displayName: string | null = null;
      try {
        const { data: up } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle<any>();
        displayName = (up?.display_name as string | null) ?? null;
      } catch {}
      if (!displayName) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle<any>();
          displayName = (prof?.full_name as string | null) ?? null;
        } catch {}
      }

      // Try to include email/name columns if present; fallback to minimal upsert
      let upserted = false;
      try {
        const { error } = await supabase
          .from("workspace_members")
          .upsert(
            { workspace_id: workspaceId, user_id: user.id, role: "member", member_email: user.email, member_name: displayName } as any,
            { onConflict: "workspace_id,user_id" }
          );
        if (error) throw error;
        upserted = true;
      } catch {}
      if (!upserted) {
        try {
          const { error } = await supabase
            .from("workspace_members")
            .upsert(
              { workspace_id: workspaceId, user_id: user.id, role: "member", email: user.email, name: displayName } as any,
              { onConflict: "workspace_id,user_id" }
            );
          if (error) throw error;
          upserted = true;
        } catch {}
      }
      if (!upserted) {
        const { error } = await supabase
          .from("workspace_members")
          .upsert(
            { workspace_id: workspaceId, user_id: user.id, role: "member" } as MemberRow,
            { onConflict: "workspace_id,user_id" }
          );
        if (error) throw new Error(error.message);
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "invite",
        ref_id: workspaceId,
        workspace_id: workspaceId,
        title: "Added to workspace",
        body: "You were added to a workspace",
        is_read: false,
      });
    },
    onSuccess: (_res, user) => {
      toast.success(`Invited ${user.email}`);
      queryClient.invalidateQueries({ queryKey: ["workspace_members", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["auth_users_public", debounced, workspaceId] });
      setQuery("");
      setOpen(false);
      inputRef.current?.focus();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to invite");
    },
  });

  return (
    <div className="w-full max-w-xl">
      <Popover
        open={open && (searchQ.isFetching || (searchQ.data?.length ?? 0) > 0 || !!query)}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Invite by email"
              className="pr-24"
              aria-label="Invite user by email"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              {query ? (
                <Button variant="outline" size="sm" onClick={() => setQuery("")} className="h-7 px-2">
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-[480px]">
          <Command>
            <CommandList>
              {searchQ.isFetching ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (searchQ.data?.length ?? 0) === 0 && query.trim() ? (
                <CommandEmpty>No users found</CommandEmpty>
              ) : (
                <CommandGroup heading="Users">
                  {(searchQ.data ?? []).map((u) => (
                    <CommandItem
                      key={u.id}
                      value={u.email}
                      onSelect={() => inviteMutation.mutate(u)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[380px]">{u.email}</span>
                        <span className="text-xs text-neutral-500">Invite</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
