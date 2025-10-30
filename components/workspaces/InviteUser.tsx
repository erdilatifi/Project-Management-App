"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail } from "lucide-react";

type Props = { workspaceId: string };

export function InviteUser({ workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  // Email validation
  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  // Invite by exact email (no search/enumeration)
  const inviteMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      // Validate email format
      if (!isValidEmail(emailAddress)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists with this email
      const { data: authUser } = await supabase
        .from('auth_users_public')
        .select('id, email')
        .eq('email', emailAddress.toLowerCase())
        .maybeSingle();

      if (!authUser) {
        throw new Error('No user found with this email. Ask them to sign up first.');
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existing) {
        throw new Error('This user is already a member of this workspace');
      }

      // Send invitation
      const res = await fetch('/api/workspaces/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, userId: authUser.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to send invitation');
      
      return emailAddress;
    },
    onSuccess: (emailAddress) => {
      toast.success(`Invitation sent to ${emailAddress}`);
      queryClient.invalidateQueries({ queryKey: ["workspace_members", workspaceId] });
      setEmail("");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to send invitation");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && !inviteMutation.isPending) {
      inviteMutation.mutate(email.trim());
    }
  };

  return (
    <Card className="w-full max-w-xl p-4 border-border rounded-2xl shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
          Invite Team Members
        </label>
        <p className="text-xs text-muted-foreground -mt-2">
          Enter the email address of the person you want to invite
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="h-10 rounded-xl pl-10 bg-background border-border focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Email address to invite"
              autoComplete="off"
              disabled={inviteMutation.isPending}
            />
          </div>
          <Button
            type="submit"
            disabled={inviteMutation.isPending || !email.trim()}
            className="h-10 px-6 rounded-xl"
          >
            {inviteMutation.isPending ? "Sending..." : "Send Invite"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 The user must have an account. If they don't, ask them to sign up first.
        </p>
      </form>
    </Card>
  );
}
