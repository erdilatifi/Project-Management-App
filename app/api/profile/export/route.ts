import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST - Request data export
export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create export request
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create export request' }, { status: 500 })
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'data_export_requested',
      entity_type: 'data_export_request',
      entity_id: data.id
    })

    // In production, trigger background job to generate export
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Data export request created. You will receive an email when ready.',
      requestId: data.id
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
