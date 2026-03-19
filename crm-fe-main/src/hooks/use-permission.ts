import { useAuth } from "@/providers/auth-provider";

/**
 * Check if the current user has a specific permission.
 * Users with `crm:admin` always return true.
 *
 * @example
 * const canDeleteLeads = usePermission('leads:delete');
 */
export function usePermission(perm: string): boolean {
  const { can } = useAuth();
  return can(perm);
}

/**
 * Check if the current user has ALL of the listed permissions (AND gate).
 *
 * @example
 * const canManageTeam = usePermissions(['leads:assign', 'analytics:view_team']);
 */
export function usePermissions(perms: string[]): boolean {
  const { can } = useAuth();
  return perms.every(can);
}

/**
 * Check if the current user has AT LEAST ONE of the listed permissions (OR gate).
 *
 * @example
 * const canViewAnalytics = useAnyPermission(['analytics:view_own', 'analytics:view_all']);
 */
export function useAnyPermission(perms: string[]): boolean {
  const { can } = useAuth();
  return perms.some(can);
}
