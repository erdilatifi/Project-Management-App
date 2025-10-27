"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { X } from "lucide-react";

type Props = { workspaceId: string };
type UserLite = { id: string; email: string; name?: string | null };
type MemberRow = { user_id: string; workspace_id: string; role: "owner" | "admin" | "member" | "viewer" };

export function InviteUser({ workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 180);
    return () => clearTimeout(id);
  }, [query]);

  // Members in workspace
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

  // Email helper
  const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

  // Search users by email or name. When empty, show first N users by email.
  const searchQ = useQuery({
    queryKey: ["people_search", debounced, workspaceId],
    queryFn: async (): Promise<ReadonlyArray<UserLite>> => {
      const term = debounced.trim();

      // Case 1: empty -> list
      if (!term) {
        const { data, error } = await supabase
          .from("auth_users_public")
          .select("id, email")
          .order("email", { ascending: true })
          .limit(25);
        if (error) throw new Error(error.message);

        const base = ((data ?? []) as Array<{ id: string; email: string | null }>).filter(
          (u) => typeof u.id === "string" && typeof u.email === "string"
        );

        const ids = base.map((u) => u.id);
        let nameMap: Record<string, string | null> = {};
        if (ids.length) {
          try {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", ids);
            nameMap = Object.fromEntries((profs ?? []).map((p: any) => [String(p.id), (p.full_name as string | null) ?? null]));
          } catch {}
        }
        return base.map((u) => ({ id: u.id, email: String(u.email), name: nameMap[u.id] ?? null }));
      }

      // Case 2: term -> search email + name, then merge
      const [byEmail, byNameIds] = await Promise.all([
        supabase.from("auth_users_public").select("id, email").ilike("email", `%${term}%`).limit(20),
        supabase.from("profiles").select("id").ilike("full_name", `%${term}%`).limit(30),
      ]);
      if (byEmail.error) throw new Error(byEmail.error.message);

      const emailRows = ((byEmail.data ?? []) as Array<{ id: string; email: string | null }>).filter(
        (u) => typeof u.id === "string" && typeof u.email === "string"
      );
      const nameIds = ((byNameIds.data ?? []) as Array<{ id: string }>).map((r) => r.id);

      let nameRows: Array<{ id: string; email: string | null }> = [];
      if (nameIds.length) {
        try {
          const { data } = await supabase
            .from("auth_users_public")
            .select("id, email")
            .in("id", nameIds)
            .limit(50);
          nameRows = (data ?? []) as Array<{ id: string; email: string | null }>;
        } catch {}
      }

      const map = new Map<string, { id: string; email: string | null }>();
      [...emailRows, ...nameRows].forEach((u) => {
        if (u?.id) map.set(String(u.id), { id: String(u.id), email: u.email });
      });

      const merged = Array.from(map.values()).filter((u) => typeof u.email === "string");
      const ids = merged.map((u) => u.id);
      let nameMap: Record<string, string | null> = {};
      if (ids.length) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          nameMap = Object.fromEntries((profs ?? []).map((p: any) => [String(p.id), (p.full_name as string | null) ?? null]));
        } catch {}
      }
      return merged.map((u) => ({ id: u.id, email: String(u.email), name: nameMap[u.id] ?? null }));
    },
    select: (rows) => rows.filter((u) => !memberIds.has(u.id)),
  });

  // Invite mutation (existing users only)
  const inviteMutation = useMutation({
    mutationFn: async (user: UserLite) => {
      // Create invitation server-side (does not add member) and send notification
      const res = await fetch('/api/workspaces/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, userId: user.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create invitation')
    },
    onSuccess: (_res, user) => {
      toast.success(`Invited ${user.email}`);
      queryClient.invalidateQueries({ queryKey: ["workspace_members", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["people_search", debounced, workspaceId] });
      setQuery("");
      setOpen(false);
      inputRef.current?.focus();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to invite");
    },
  });

  // Key handler: first Enter opens results & triggers immediate search. No auto-invite.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Force the debounced term immediately so results show right away
      setDebounced(query.trim());
      setOpen(true);
    }
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Card className="w-full max-w-xl p-3 border border-neutral-200 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-2">
        <label htmlFor="invite" className="text-xs text-neutral-600 px-1">
          Invite by email (search existing users)
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                id="invite"
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Type a name or email, press Enter to search…"
                className="h-10 rounded-xl pr-10 bg-white border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400"
                aria-label="Invite user by email"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0 w-[480px] rounded-xl shadow-lg border border-neutral-200">
            <Command shouldFilter={false}>
              <CommandList className="max-h-72 overflow-auto">
                {searchQ.isFetching ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded-md bg-neutral-100" />
                    ))}
                  </div>
                ) : (searchQ.data?.length ?? 0) === 0 ? (
                  <CommandEmpty className="py-6 text-neutral-500">
                    {debounced ? "No users found" : "Press Enter to search"}
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading="Users">
                    {(searchQ.data ?? []).map((u) => (
                      <CommandItem
                        key={u.id}
                        value={u.email}
                        onSelect={() => {
                          inviteMutation.mutate(u);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="min-w-0">
                            <div className="truncate max-w-[360px] text-sm">
                              {u.name ? (
                                <>
                                  <span className="font-medium">{u.name}</span>
                                  <span className="text-neutral-500"> — {u.email}</span>
                                </>
                              ) : (
                                <span>{u.email}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500 shrink-0">
                            {inviteMutation.isPending ? "Inviting…" : "Invite"}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-neutral-500">
            Type, press <kbd className="px-1 py-0.5 rounded bg-neutral-100 border">Enter</kbd> to show results.
          </span>
          <Button
            size="sm"
            onClick={() => {
              const first = (searchQ.data ?? [])[0];
              if (first) inviteMutation.mutate(first);
              else if (isEmail(query)) {
                toast.error("That email isn't registered. Ask them to sign up, then invite again.");
              } else {
                setOpen(true);
                setDebounced(query.trim());
              }
            }}
            disabled={inviteMutation.isPending}
            className="h-8 rounded-lg"
          >
            {inviteMutation.isPending ? "Inviting…" : "Invite"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
