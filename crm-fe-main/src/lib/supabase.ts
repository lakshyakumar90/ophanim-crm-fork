import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if ((!supabaseUrl || !supabaseAnonKey) && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in production",
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are not set. Direct Supabase reads will not work.",
  );
}

const resolvedSupabaseUrl = supabaseUrl || "http://localhost:54321";
const resolvedSupabaseAnonKey = supabaseAnonKey || "local-dev-anon-key";

// Create Supabase client for frontend direct reads
// Uses anon key with RLS policies - session is persisted so auth.uid() works in RLS
export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "crm_supabase_auth",
  },
});
