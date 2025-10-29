import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { markNotificationsReadSchema } from '@/lib/validation/schemas'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const userId = authResult.userId

    // Validate request body
    const bodyValidation = await validateBody(req, markNotificationsReadSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }
    
    const { ids } = bodyValidation.data

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', ids)
      .select('id')
    if (error) throw error
    return NextResponse.json({ updated: (data ?? []).length })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}

