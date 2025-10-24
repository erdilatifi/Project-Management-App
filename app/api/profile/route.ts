import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch user profile and preferences
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (preferencesError) {
      return NextResponse.json({ error: 'Preferences not found' }, { status: 404 })
    }

    // Fetch OAuth connections
    const { data: oauthConnections } = await supabase
      .from('oauth_connections')
      .select('id, provider, provider_email, connected_at')
      .eq('user_id', user.id)

    return NextResponse.json({
      profile,
      preferences,
      oauthConnections: oauthConnections || []
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update user profile or preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data: updateData } = body

    if (type === 'profile') {
      // Update user profile
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'profile_updated',
        entity_type: 'user',
        entity_id: user.id,
        new_values: updateData
      })

      return NextResponse.json({ data })
    }

    if (type === 'preferences') {
      // Update preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'preferences_updated',
        entity_type: 'user_preferences',
        entity_id: user.id,
        new_values: updateData
      })

      return NextResponse.json({ data })
    }

    if (type === '2fa') {
      // Toggle 2FA
      const { data, error } = await supabase
        .from('users')
        .update({ two_factor_enabled: updateData.enabled })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: updateData.enabled ? '2fa_enabled' : '2fa_disabled',
        entity_type: 'user',
        entity_id: user.id
      })

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
