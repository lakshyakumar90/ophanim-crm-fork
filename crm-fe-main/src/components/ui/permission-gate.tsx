"use client";

import { useAuth } from "@/providers/auth-provider";

interface PermissionGateProps {
  /** Permission key required to render children */
  perm: string;
  /** Content to render when user lacks the permission */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Render children only when the current user has the required permission.
 * Falls back to `fallback` (default: null) when access is denied.
 *
 * @example
 * // Hide a delete button from users without leads:delete
 * <PermissionGate perm="leads:delete">
 *   <Button variant="destructive">Delete Lead</Button>
 * </PermissionGate>
 *
 * @example
 * // Show limited view to employees, full view to managers
 * <PermissionGate perm="analytics:view_all" fallback={<OwnAnalytics />}>
 *   <FullOrgAnalytics />
 * </PermissionGate>
 */
export function PermissionGate({ perm, fallback = null, children }: PermissionGateProps) {
  const { can } = useAuth();
  return can(perm) ? <>{children}</> : <>{fallback}</>;
}

interface AnyPermissionGateProps {
  /** At least one of these permissions is required */
  perms: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Render children when the user has ANY of the listed permissions.
 */
export function AnyPermissionGate({ perms, fallback = null, children }: AnyPermissionGateProps) {
  const { can } = useAuth();
  return perms.some(can) ? <>{children}</> : <>{fallback}</>;
}

interface AllPermissionsGateProps {
  /** All of these permissions are required */
  perms: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Render children when the user has ALL of the listed permissions.
 */
export function AllPermissionsGate({ perms, fallback = null, children }: AllPermissionsGateProps) {
  const { can } = useAuth();
  return perms.every(can) ? <>{children}</> : <>{fallback}</>;
}
