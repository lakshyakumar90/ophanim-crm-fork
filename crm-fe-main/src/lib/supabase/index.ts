/**
 * Direct Supabase queries for read-only operations.
 * These replace backend API GET calls to reduce server load.
 * RLS policies enforce access control based on the authenticated user.
 */

export { mapToCamelCase } from "./map-to-camel";
export * from "./modules/core";
export * from "./modules/sales";
export * from "./modules/tasks";
export * from "./modules/operations";
export * from "./modules/projects";
export * from "./modules/hr";
