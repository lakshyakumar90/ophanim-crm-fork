/** Default env vars so config parsing succeeds in isolated test runs. */
export function applyTestEnv(): void {
  process.env.NODE_ENV ??= "test";
  process.env.JWT_SECRET ??= "test-secret-with-at-least-32-characters";
  process.env.FRONTEND_URL ??= "http://localhost:3000";

  const dbTests = process.env.RUN_DB_TESTS === "true";
  if (dbTests) {
    // Keep real Supabase credentials from .env for DB integration tests.
    return;
  }

  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
}

export const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

export function hasRealSupabaseConfig(): boolean {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return (
    url.length > 0 &&
    !url.includes("example.supabase.co") &&
    key.length > 0 &&
    key !== "test-service-role-key"
  );
}
