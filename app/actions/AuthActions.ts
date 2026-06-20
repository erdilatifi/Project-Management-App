"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { signInSchema, signUpSchema, resetPasswordRequestSchema, passwordResetSchema, emailSchema, usernameSchema } from "@/lib/validation/schemas";
import { sanitizeEmail, sanitizeUsername } from "@/lib/validation/sanitize";

const getSiteUrl = async () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedHost) return `https://${forwardedHost}`;
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  if (host) return host.includes('localhost') ? `http://${host}` : `https://${host}`;
  return 'http://localhost:3000';
};
export const SignIn = async (email: string, password: string) => {
  try {
    // Validate and sanitize inputs
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const sanitizedEmail = sanitizeEmail(validation.data.email);
    if (!sanitizedEmail) {
      return { success: false, error: 'Invalid email format' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password: validation.data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Sign in failed' };
  }
};

export const SignUp = async (email: string, password: string, username?: string) => {
  try {
    // Validate and sanitize inputs
    const validation = signUpSchema.safeParse({ email, password, username });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const sanitizedEmail = sanitizeEmail(validation.data.email);
    if (!sanitizedEmail) {
      return { success: false, error: 'Invalid email format' };
    }

    let sanitizedUsername: string | undefined = undefined;
    if (validation.data.username) {
      sanitizedUsername = sanitizeUsername(validation.data.username);
      if (!sanitizedUsername || sanitizedUsername.length < 3) {
        return { success: false, error: 'Invalid username format' };
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ 
      email: sanitizedEmail, 
      password: validation.data.password,
      options: {
        emailRedirectTo: `${await getSiteUrl()}/auth/callback`,
        // Stash desired username in auth metadata; we'll persist to public.users on callback
        data: sanitizedUsername ? { username: sanitizedUsername } : undefined,
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Sign up failed' };
  }
};

export const SignInWithGoogle = async () => {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const ResetPassword = async (email: string) => {
  try {
    // Validate and sanitize email
    const validation = resetPasswordRequestSchema.safeParse({ email });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const sanitizedEmail = sanitizeEmail(validation.data.email);
    if (!sanitizedEmail) {
      return { success: false, error: 'Invalid email format' };
    }

    const supabase = await createClient();
    const siteUrl = await getSiteUrl();
    
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Password reset failed' };
  }
};

export const UpdatePassword = async (newPassword: string) => {
  try {
    // Validate password
    const validation = passwordResetSchema.safeParse(newPassword);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: validation.data,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Password update failed' };
  }
};

export const SignOut = async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};
