import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Request account deletion
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reason } = body

    // Schedule deletion for 30 days from now
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + 30)

    // Create deletion request
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason: reason || null,
        scheduled_deletion_at: scheduledDate.toISOString()
      })
      .select()
      .single()

    if (error) {
      // Check if request already exists
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'Deletion request already exists'
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 })
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'account_deletion_requested',
      entity_type: 'account_deletion_request',
      entity_id: data.id,
      new_values: { scheduled_deletion_at: scheduledDate.toISOString() }
    })

    return NextResponse.json({
      success: true,
      message: `Account deletion scheduled for ${scheduledDate.toLocaleDateString()}. You can cancel this request anytime before then.`,
      scheduledDate: scheduledDate.toISOString()
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
