"use client"

import InvitationAccept from '@/components/workspaces/InvitationAccept'
import { useParams } from 'next/navigation'

export default function InviteTokenPage() {
  const { token } = useParams<{ token: string }>()
  return (
    <div className="p-6 w-full">
      <InvitationAccept token={token as string} />
    </div>
  )
}
