import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch active sessions
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke session(s)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const revokeAll = searchParams.get('revokeAll') === 'true'

    if (revokeAll) {
      // Revoke all other sessions except current
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_current', false)

      if (error) {
        return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'all_sessions_revoked',
        entity_type: 'user_session'
      })

      return NextResponse.json({ success: true })
    }

    if (sessionId) {
      // Revoke specific session
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'session_revoked',
        entity_type: 'user_session',
        entity_id: sessionId
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Session revoke error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
