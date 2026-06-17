import type { NavItem } from "@/config/sidebar-nav/types";

type FilterNavUser = {
  role?: string;
  permissions?: string[];
  departmentSlug?: string | null;
};

export function filterGlobalNav(
  items: NavItem[],
  user: FilterNavUser | null | undefined,
  isAdmin: boolean,
  isManager: boolean,
): NavItem[] {
  return items.filter((item) => {
    if (
      item.href === "/hr/onboarding" &&
      !isAdmin &&
      user?.departmentSlug !== "hr"
    ) {
      return false;
    }

    if (!item.roles) return true;
    if (item.roles.includes("admin") && isAdmin) return true;
    if (item.roles.includes("manager") && isManager) return true;
    if (item.roles.includes("employee") && user?.role === "employee")
      return true;
    return false;
  });
}

export function filterDepartmentNav(
  items: NavItem[],
  user: FilterNavUser | null | undefined,
  isAdmin: boolean,
  isManager: boolean,
): NavItem[] {
  return items.filter((item) => {
    const p = user?.permissions ?? [];
    const permGate = item.anyPermission ?? [];
    const hasAdmin = user?.role === "admin" || p.includes("crm:admin");

    if (hasAdmin) return true;

    const permOk =
      permGate.length > 0 && permGate.some((x) => p.includes(x));

    let roleOk = true;
    if (item.roles?.length) {
      roleOk = false;
      if (item.roles.includes("admin") && isAdmin) roleOk = true;
      if (item.roles.includes("manager") && isManager) roleOk = true;
      if (item.roles.includes("employee") && user?.role === "employee")
        roleOk = true;
    } else if (!item.roles) {
      roleOk = permGate.length === 0;
    }

    if (permGate.length && item.roles?.length) {
      return permOk || roleOk;
    }
    if (permGate.length) {
      return permOk;
    }
    return roleOk;
  });
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(href))
  );
}

export function departmentBasePath(slug: string): string {
  return slug === "project-management" ? "/projects" : `/${slug}`;
}
