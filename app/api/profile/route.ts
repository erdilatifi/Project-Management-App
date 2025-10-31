import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateBody, authenticateRequest, errorResponse } from '@/lib/validation/middleware'
import { updateProfileSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

// GET - Fetch user profile and preferences
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update user profile or preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const userId = authResult.userId

    // Parse request body with basic structure validation
    const bodySchema = z.object({
      type: z.enum(['profile', 'preferences', '2fa']),
      data: z.record(z.string(), z.any()),
    })
    
    const bodyValidation = await validateBody(request, bodySchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }
    
    const { type, data: updateData } = bodyValidation.data

    if (type === 'profile') {
      // Validate profile data
      const profileValidation = updateProfileSchema.safeParse(updateData)
      if (!profileValidation.success) {
        return errorResponse('Invalid profile data', 400)
      }
      
      // Update user profile in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update(profileValidation.data)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'profile_updated',
        entity_type: 'user',
        entity_id: userId,
        new_values: profileValidation.data
      })

      return NextResponse.json({ data })
    }

    if (type === 'preferences') {
      return errorResponse('Preferences updates not supported', 400)
    }

    if (type === '2fa') {
      return errorResponse('2FA updates not supported', 400)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
