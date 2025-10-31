import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

function sanitizeUsername(input: string): string {
  const base = (input || '').toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
  const collapsed = base.replace(/\.{2,}/g, '.').replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
  const trimmed = collapsed.replace(/^[._-]+|[._-]+$/g, '');
  return trimmed.slice(0, 32);
}

function deriveDisplayName(user: any): string | null {
  if (!user) return null;
  const meta = (user as any).user_metadata || {};
  const candidates = [
    meta.full_name,
    meta.name,
    meta.preferred_username,
    meta.user_name,
    meta.username,
  ];
  for (const cand of candidates) {
    if (typeof cand === 'string') {
      const trimmed = cand.trim();
      if (trimmed) return trimmed;
    }
  }
  const email: string | undefined = (user.email as string | undefined) ?? (meta.email as string | undefined);
  if (email && typeof email === 'string') {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }
  return null;
}

async function ensureUsername(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Best-effort: derive and persist username if missing
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    const uid = user.id;

    const admin = createAdminClient();

    // Fetch existing values (do not overwrite if already set)
    let existingProfileUsername: string | null = null;
    let hasProfileRow = false;
    const meta = (user as any).user_metadata || {};
    const email: string | null = (user.email as string | null) ?? (meta.email as string | null) ?? null;
    try {
      const { data: prow } = await supabase
        .from('profiles')
        .select('id, username, email, full_name')
        .eq('id', uid)
        .maybeSingle<any>();
      existingProfileUsername = (prow?.username as string | null) ?? null;
      hasProfileRow = !!prow;
    } catch {}

    // Ensure a profile row exists for this auth user (non-destructive)
    // Also ensure email is saved to profiles.email
    if (!hasProfileRow) {
      try {
        await supabase
          .from('profiles')
          .upsert({ 
            id: uid,
            email: email ? email.toLowerCase() : null
          } as any, { onConflict: 'id' });
        hasProfileRow = true;
      } catch {}
    } else if (email) {
      // Update email if profile exists but email is missing
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', uid)
          .maybeSingle();
        if (!existingProfile?.email) {
          await supabase
            .from('profiles')
            .update({ email: email.toLowerCase() } as any)
            .eq('id', uid);
        }
      } catch {}
    }

    // Use profile username if it exists
    let finalUsername: string | null = existingProfileUsername;

    // Otherwise, compute it from metadata (SignUp provided value or provider info)
    if (!finalUsername) {
      const emailForUsername: string | undefined = user.email || meta.email;
      const preferred: string | undefined = meta.preferred_username || meta.user_name || meta.username;
      const name: string | undefined = meta.name || meta.full_name;

      let candidate =
        preferred ||
        (emailForUsername ? emailForUsername.split('@')[0] : undefined) ||
        name ||
        `user_${uid.slice(0, 6)}`;
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
          .from('profiles')
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
