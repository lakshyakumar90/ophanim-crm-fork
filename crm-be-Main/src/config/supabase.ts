import {
  createClient,
  SupabaseClient as BaseSupabaseClient,
} from "@supabase/supabase-js";
import { config } from "./env.js";

// Create untyped Supabase client to avoid strict type checking issues
// In production, you should generate types using: npx supabase gen types typescript
const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;
const supabaseServiceKey = config.supabase.serviceRoleKey;

// Supabase client for authenticated user operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// Supabase admin client for server-side operations (uses service role key)
// This bypasses Row Level Security - use with caution
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type SupabaseClient = typeof supabase;
export type SupabaseAdminClient = typeof supabaseAdmin;
