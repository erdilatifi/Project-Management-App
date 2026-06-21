import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sanitizeEmail } from '@/lib/validation/sanitize'

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

function getNormalizedUserEmail(user: any): string | null {
  const meta = (user as any)?.user_metadata || {}
  const candidates = [user?.email, meta.email, meta.email_address]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const email = sanitizeEmail(candidate)
      if (email) return email
    }
  }
  return null
}

async function ensureUsername(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Best-effort: ensure OAuth/email-confirmed users have a profile row, email, and username.
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    const uid = user.id;
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    let existingProfileUsername: string | null = null;
    let existingProfileEmail: string | null = null;
    let existingProfileFullName: string | null = null;
    let hasProfileRow = false;
    const meta = (user as any).user_metadata || {};
    const email = getNormalizedUserEmail(user);
    const displayName = deriveDisplayName(user);

    const { data: prow, error: profileReadError } = await db
      .from('profiles')
      .select('id, username, email, full_name')
      .eq('id', uid)
      .maybeSingle<any>();

    if (profileReadError) {
      console.warn('[auth-callback] Failed to read profile for OAuth user', profileReadError);
    } else {
      existingProfileUsername = (prow?.username as string | null) ?? null;
      existingProfileEmail = (prow?.email as string | null) ?? null;
      existingProfileFullName = (prow?.full_name as string | null) ?? null;
      hasProfileRow = !!prow;
    }

    let finalUsername: string | null = existingProfileUsername;

    if (!finalUsername) {
      const emailForUsername: string | undefined = email ?? user.email ?? meta.email;
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

      if (meta && typeof meta.username === 'string') {
        const desired = sanitizeUsername(meta.username);
        if (desired.length >= 3) candidate = desired;
      }

      let unique = candidate;
      for (let i = 0; i < 10; i++) {
        const { data: clash, error } = await db
          .from('profiles')
          .select('id')
          .eq('username', unique)
          .maybeSingle<any>();
        if (error) break;
        if (!clash || clash.id === uid) break;
        unique = `${candidate}${i + 2}`.slice(0, 32);
      }
      finalUsername = unique;
    }

    const updates: Record<string, string> = {};
    if (email && sanitizeEmail(existingProfileEmail ?? '') !== email) updates.email = email;
    if (!existingProfileFullName && displayName) updates.full_name = displayName;
    if (!existingProfileUsername && finalUsername) updates.username = finalUsername;

    if (hasProfileRow) {
      if (Object.keys(updates).length) {
        const { error: updateError } = await db.from('profiles').update(updates as any).eq('id', uid);
        if (updateError) console.warn('[auth-callback] Failed to update profile for OAuth user', updateError);
      }
    } else {
      const payload = {
        id: uid,
        email,
        full_name: displayName,
        username: finalUsername,
      };
      const { error: upsertError } = await db.from('profiles').upsert(payload as any, { onConflict: 'id' });
      if (upsertError) console.warn('[auth-callback] Failed to create profile for OAuth user', upsertError);
    }
  } catch (error) {
    console.warn('[auth-callback] Failed to ensure OAuth profile fields', error);
  }
}

function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/workspaces'
  return next
}

function getRedirectOrigin(request: Request, origin: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return origin
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost && !forwardedHost.includes(',')) return `https://${forwardedHost}`
  return origin
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await ensureUsername(supabase)
      const base = getRedirectOrigin(request, origin)
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
