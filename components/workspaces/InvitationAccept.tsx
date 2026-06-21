"use client"

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuth } from '@/app/context/ContextApiProvider'
import { useRouter } from 'next/navigation'

type Props = { token: string }

export default function InvitationAccept({ token }: Props) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`

  const accept = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch('/api/workspaces/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to accept invitation')
      setWorkspaceId(json.workspaceId ?? null)
      setState('success')
      toast.success('Invitation accepted')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to accept invitation'
      setMessage(msg)
      setState('error')
      toast.error(msg)
    }
  }, [token])

  if (authLoading) {
    return <div className="text-sm text-neutral-600">Loading invitation…</div>
  }

  if (!user) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Workspace invitation</h1>
        <p className="text-sm text-neutral-600">
          Sign in to accept this invitation and join the workspace.
        </p>
        <div className="flex items-center gap-3">
          <Link href={loginHref}>
            <Button>Sign in to accept</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Create account</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="space-y-3">
        <div className="text-lg font-medium">You joined the workspace</div>
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push(workspaceId ? `/workspaces/${workspaceId}` : '/workspaces')}>
            Go to workspace
          </Button>
          <Link href="/projects">
            <Button variant="outline">View projects</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">{message}</div>
        <Button variant="outline" onClick={() => setState('idle')}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Workspace invitation</h1>
      <p className="text-sm text-neutral-600">
        You&apos;re signed in as <span className="font-medium">{user.email}</span>. Accept to join this workspace.
      </p>
      <Button onClick={accept} disabled={state === 'loading'}>
        {state === 'loading' ? 'Accepting…' : 'Accept invitation'}
      </Button>
    </div>
  )
}
