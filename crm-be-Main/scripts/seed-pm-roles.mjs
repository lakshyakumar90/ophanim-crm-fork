#!/usr/bin/env node
/**
 * Seed PM specialist RBAC roles (Designer, SEO Specialist, Content Writer).
 * Use when `supabase db push` cannot run due to migration history drift.
 *
 * Usage: pnpm run seed:pm-roles
 */
import { ensurePmSpecialistRoles } from "../dist/modules/core/roles/roles.seed.js";

await ensurePmSpecialistRoles();
console.log("PM specialist RBAC roles ensured (designer, seo-specialist, content-writer).");
