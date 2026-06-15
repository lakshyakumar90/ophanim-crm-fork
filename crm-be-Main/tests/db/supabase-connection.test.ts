import { describe, expect, it } from "vitest";
import { hasRealSupabaseConfig } from "../helpers/env.js";

const runDbTests = process.env.RUN_DB_TESTS === "true" && hasRealSupabaseConfig();

describe.skipIf(!runDbTests)("Supabase database connectivity", () => {
  it("connects and reads departments table", async () => {
    const { supabaseAdmin } = await import("../../src/config/supabase.js");
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("id, slug, name")
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("reads users table with service role", async () => {
    const { supabaseAdmin } = await import("../../src/config/supabase.js");
    const { error } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    expect(error).toBeNull();
  });
});

describe.skipIf(runDbTests)("Supabase database connectivity (skipped)", () => {
  it("documents how to enable DB tests", () => {
    if (process.env.RUN_DB_TESTS !== "true") {
      expect(process.env.RUN_DB_TESTS).not.toBe("true");
      return;
    }
    expect(hasRealSupabaseConfig()).toBe(false);
  });
});
