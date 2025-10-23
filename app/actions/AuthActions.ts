"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export const SignIn = async (email: string, password: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const SignUp = async (email: string, password: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    }
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const SignInWithGoogle = async () => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const ResetPassword = async (email: string) => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const UpdatePassword = async (newPassword: string) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const SignOut = async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};
