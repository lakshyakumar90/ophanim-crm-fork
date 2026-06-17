export { canAccessProjects } from "./department-scope";
import type { Project, User } from "@/types";

type PermissionChecker = (permission: string) => boolean;

export function isProjectManagerFor(
  project: Project | null | undefined,
  userId?: string | null,
): boolean {
  if (!project || !userId) return false;
  if (project.managerId === userId || project.manager?.id === userId) {
    return true;
  }
  return (
    project.members?.some(
      (m) =>
        (m.userId === userId || m.user?.id === userId) &&
        m.role === "project_manager",
    ) ?? false
  );
}

export function canAssignProjectMembers(
  project: Project | null | undefined,
  user: User | null | undefined,
  can: PermissionChecker,
): boolean {
  if (!user) return false;
  if (user.role === "admin" || can("projects:assign_member")) return true;
  return isProjectManagerFor(project, user.id);
}

export function canManageProject(
  project: Project | null | undefined,
  user: User | null | undefined,
  can: PermissionChecker,
): boolean {
  if (!user) return false;
  if (user.role === "admin" || can("projects:edit")) return true;
  return isProjectManagerFor(project, user.id);
}

export interface ProjectAssignee {
  id: string;
  fullName: string;
}

export function getProjectMemberAssignees(
  project: Project | null | undefined,
): ProjectAssignee[] {
  if (!project) return [];
  const map = new Map<string, ProjectAssignee>();
  if (project.manager?.id) {
    map.set(project.manager.id, {
      id: project.manager.id,
      fullName: project.manager.fullName || "Project Manager",
    });
  }
  for (const member of project.members || []) {
    const uid = member.userId || member.user?.id;
    if (!uid) continue;
    const fullName =
      member.user?.fullName ||
      (member.user as { full_name?: string } | undefined)?.full_name ||
      "Unknown";
    map.set(uid, { id: uid, fullName });
  }
  return Array.from(map.values());
}
