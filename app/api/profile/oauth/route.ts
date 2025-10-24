import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Disconnect OAuth provider
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider required' }, { status: 400 })
    }

    // Delete OAuth connection
    const { error } = await supabase
      .from('oauth_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'oauth_disconnected',
      entity_type: 'oauth_connection',
      old_values: { provider }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('OAuth disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
