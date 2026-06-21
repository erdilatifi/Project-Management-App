import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { emailSchema } from '@/lib/validation/schemas'

const lookupSchema = z.object({
  email: emailSchema,
})

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

export async function POST(req: Request) {
  try {
    const bodyValidation = await validateBody(req, lookupSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }

    const { email } = bodyValidation.data
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const db = getDb(supabase)

    const { data, error } = await db
      .from('profiles')
      .select('id, email')
      .ilike('email', email.toLowerCase())
      .maybeSingle()

    if (error || !data || !data.id) {
      return NextResponse.json(
        { error: 'No user found with this email' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      id: data.id,
      email: data.email ?? email,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to resolve user by email' },
      { status: 500 },
    )
  }
}
