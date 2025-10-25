"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { acceptInvitation } from '@/lib/workspaces'
import { toast } from 'sonner'
import Link from 'next/link'

type Props = { token: string }

export default function InvitationAccept({ token }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setState('loading')
      try {
        const res = await acceptInvitation(token)
        if (!mounted) return
        setWorkspace({ id: res.workspace.id, name: res.workspace.name })
        setState('success')
        toast.success('Invitation accepted')
      } catch (e: any) {
        setMessage(e?.message ?? 'Failed to accept invitation')
        setState('error')
        toast.error(e?.message ?? 'Failed to accept invitation')
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [token])

  if (state === 'loading' || state === 'idle') {
    return <div className="text-sm text-neutral-600">Accepting invitation…</div>
  }

  if (state === 'error') {
    return <div className="text-sm text-red-600">{message}</div>
  }

  return (
    <div className="space-y-3">
      <div className="text-lg font-medium">You joined {workspace?.name ?? 'workspace'}</div>
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button>Go to Projects</Button>
        </Link>
      </div>
    </div>
  )
}

