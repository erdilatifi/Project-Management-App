import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

function sanitizeUsername(input: string): string {
  const base = (input || '').toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
  const collapsed = base.replace(/\.{2,}/g, '.').replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
  const trimmed = collapsed.replace(/^[._-]+|[._-]+$/g, '');
  return trimmed.slice(0, 32);
}

async function ensureUsername(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Best-effort: derive and persist username if missing
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    const uid = user.id;

    // Fetch existing values (do not overwrite if already set)
    let existingUsername: string | null = null;
    let existingProfileUsername: string | null = null;
    try {
      const { data: row } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', uid)
        .maybeSingle<any>();
      existingUsername = (row?.username as string | null) ?? null;
    } catch {}
    let hasProfileRow = false;
    try {
      const { data: prow } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', uid)
        .maybeSingle<any>();
      existingProfileUsername = (prow?.username as string | null) ?? null;
      hasProfileRow = !!prow;
    } catch {}

    // Ensure a profile row exists for this auth user (non-destructive)
    if (!hasProfileRow) {
      try {
        await supabase
          .from('profiles')
          .upsert({ id: uid } as any, { onConflict: 'id' });
        hasProfileRow = true;
      } catch {}
    }

    // If users.username already exists, use it as the canonical value
    let finalUsername: string | null = existingUsername;

    // Otherwise, compute it from metadata (SignUp provided value or provider info)
    if (!finalUsername) {
      const meta = (user as any).user_metadata || {};
      const email: string | undefined = user.email || meta.email;
      const preferred: string | undefined = meta.preferred_username || meta.user_name || meta.username;
      const name: string | undefined = meta.name || meta.full_name;

      let candidate = preferred || (email ? email.split('@')[0] : undefined) || name || `user_${uid.slice(0, 6)}`;
      candidate = sanitizeUsername(String(candidate || '')) || `user_${uid.slice(0, 6)}`;
      if (candidate.length < 3) candidate = `${candidate}${Math.random().toString(36).slice(2, 6)}`;
      candidate = sanitizeUsername(candidate);

      // If we stashed a desired username at signup, prefer that (email/password flow)
      if (meta && typeof meta.username === 'string') {
        const desired = sanitizeUsername(meta.username);
        if (desired.length >= 3) candidate = desired;
      }

      // Ensure uniqueness: append suffix until unique
      let unique = candidate;
      for (let i = 0; i < 10; i++) {
        const { data: clash, error } = await supabase
          .from('users')
          .select('id')
          .eq('username', unique)
          .maybeSingle<any>();
        if (error) break; // do not hard fail
        if (!clash || clash.id === uid) break;
        unique = `${candidate}${i + 2}`.slice(0, 32);
      }
      finalUsername = unique;
    }

    // Persist only where missing
    if (!existingUsername && finalUsername) {
      try { await supabase.from('users').update({ username: finalUsername } as any).eq('id', uid); } catch {}
    }
    if (!existingProfileUsername && finalUsername) {
      try { await supabase.from('profiles').update({ username: finalUsername } as any).eq('id', uid); } catch {}
    }
  } catch {}
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Best-effort populate username after OAuth/email confirmation
      await ensureUsername(supabase)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/error`)
}
