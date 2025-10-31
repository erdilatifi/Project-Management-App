import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { validateBody } from '@/lib/validation/middleware'
import { emailSchema } from '@/lib/validation/schemas'

const lookupSchema = z.object({
  email: emailSchema,
})

export async function POST(req: Request) {
  try {
    const bodyValidation = await validateBody(req, lookupSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }

    const { email } = bodyValidation.data
    const supabase = await createServerSupabase()

    // Lookup user by email from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
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

