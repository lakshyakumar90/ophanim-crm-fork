/**
 * Supabase Auth helpers for dual sign-in
 *
 * After backend login, we also sign in to Supabase so that
 * auth.uid() works in RLS policies for direct reads.
 */

import { supabase } from "./supabase";

/**
 * Sign in to Supabase Auth after successful backend login.
 * This creates a real Supabase session so auth.uid() returns the user ID in RLS.
 * If a stale/invalid session exists, it is cleared first and the sign-in is retried.
 */
export async function syncSupabaseSession(
  email: string,
  password: string,
): Promise<void> {
  try {
    // Clear any stale session before signing in to avoid JWT decode errors
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession) {
      // If there's an existing session for a DIFFERENT user, sign out first
      if (existingSession.user?.email !== email) {
        await supabase.auth.signOut();
      } else {
        // Same user, session already valid
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // If JWT decode error, clear storage and retry once
      if (error.message?.includes("JWT") || error.status === 401) {
        console.warn("Supabase session had stale JWT, clearing and retrying...");
        await supabase.auth.signOut();
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (retryError) {
          console.error("Supabase session sync retry failed:", retryError.message);
        }
      } else {
        console.warn("Supabase session sync failed:", error.message);
      }
    }
  } catch (err) {
    console.error("Supabase session sync error:", err);
  }
}

/**
 * Clear the Supabase session on logout.
 */
export async function clearSupabaseSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase sign-out error:", err);
  }
}

/**
 * Check if we have an active Supabase session.
 * Returns true if authenticated.
 */
export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}
