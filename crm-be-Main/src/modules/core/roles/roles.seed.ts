import { supabaseAdmin } from "../../../config/supabase.js";
import { logger } from "../../../utils/logger.js";

const PM_SPECIALIST_ROLES = [
  { name: "Designer", slug: "designer" },
  { name: "SEO Specialist", slug: "seo-specialist" },
  { name: "Content Writer", slug: "content-writer" },
] as const;

const PM_EMPLOYEE_PERMISSIONS = [
  "projects:view",
  "analytics:view_own",
  "timesheets:view",
  "timesheets:manage",
];

let ensured = false;

/**
 * Idempotently ensure PM specialist RBAC roles exist.
 * Mirrors migration 086_pm_specialist_rbac_roles.sql for environments
 * that haven't applied migrations yet.
 */
export async function ensurePmSpecialistRoles(): Promise<void> {
  if (ensured) return;

  try {
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("slug", "project-management")
      .maybeSingle();

    if (!dept?.id) {
      ensured = true;
      return;
    }

    for (const role of PM_SPECIALIST_ROLES) {
      const { data: existing } = await supabaseAdmin
        .from("roles")
        .select("id, permissions")
        .eq("slug", role.slug)
        .maybeSingle();

      const mergedPermissions = Array.from(
        new Set([...(existing?.permissions ?? []), ...PM_EMPLOYEE_PERMISSIONS]),
      ).sort();

      if (existing?.id) {
        await supabaseAdmin
          .from("roles")
          .update({
            name: role.name,
            scope: "department",
            department_id: dept.id,
            permissions: mergedPermissions,
            is_system: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("roles").insert({
          name: role.name,
          slug: role.slug,
          scope: "department",
          department_id: dept.id,
          permissions: mergedPermissions,
          is_system: true,
        });
      }
    }

    ensured = true;
  } catch (error) {
    logger.warn({ error }, "Failed to ensure PM specialist RBAC roles");
  }
}
