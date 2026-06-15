import * as sq from "../../supabase-queries";
import { api } from "../client";
import { unwrap } from "../unwrap";

// =====================================================
// DEPARTMENTS API (Supabase direct reads)
// =====================================================

export const departmentsApi = {
  list: async () => {
    try {
      return await sq.getDepartments();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase departments read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/departments");
      return unwrap(res) || [];
    }
  },
  get: (id: string) => api.get(`/departments/${id}`),
};

// =====================================================
// USERS API (Supabase direct reads, backend for writes)
// =====================================================

export const usersApi = {
  list: async (params?: Record<string, unknown>) => {
    try {
      return await sq.getUsers(params as any);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase users read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/users", { params });
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getUserById(id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase user read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get(`/users/${id}`);
      return unwrap(res);
    }
  },
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),
  bulkUpdate: (updates: Array<{ id: string; data: Record<string, unknown> }>) =>
    api.post("/users/bulk-update", { updates }),
  activate: (id: string) => api.patch(`/users/${id}/activate`),
  deactivate: (id: string) => api.patch(`/users/${id}/deactivate`),
  resetPassword: (id: string, newPassword: string) =>
    api.patch(`/users/${id}/password`, { newPassword }),
  getProfile: () => api.get("/users/me"),
  updateProfile: (data: Record<string, unknown>) => api.put("/users/me", data),
  updatePreferences: (data: Record<string, unknown>) =>
    api.patch("/users/me/preferences", data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getProjectManagers: async () => {
    try {
      return await sq.getProjectManagers();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase project managers read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/users/project-managers");
      return unwrap(res);
    }
  },
  getByJobTitle: async (titles: string[]) => {
    try {
      return await sq.getUsersByJobTitle(titles);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase job title read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/users/by-job-title", {
        params: { titles: titles.join(",") },
      });
      return unwrap(res);
    }
  },
  getJobTitles: async (roleType?: "employee" | "manager") => {
    try {
      return await sq.getJobTitles(roleType);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase job titles read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/users/job-titles", { params: { roleType } });
      return unwrap(res);
    }
  },
};

// =====================================================
// TEAMS API (Supabase direct reads, backend for writes)
// =====================================================

export const teamsApi = {
  list: async () => {
    try {
      return await sq.getTeams();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase teams read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/teams");
      return unwrap(res) || [];
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getTeamById(id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase team read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get(`/teams/${id}`);
      return unwrap(res);
    }
  },
  create: (data: {
    name: string;
    managerId: string;
    departmentId: string;
    description?: string;
  }) => api.post("/teams", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getMembers: async (id: string) => {
    try {
      return await sq.getTeamMembers(id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase team members read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get(`/teams/${id}/members`);
      return unwrap(res);
    }
  },
  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
};

// =====================================================
// TEAM NOTES API (Supabase direct reads, backend for writes)
// =====================================================

export const teamNotesApi = {
  list: async (teamId: string) => {
    return unwrap(await api.get(`/teams/${teamId}/notes`));
  },
  create: async (teamId: string, content: string) => {
    return unwrap(await api.post(`/teams/${teamId}/notes`, { content }));
  },
  update: async (noteId: string, content: string) => {
    return unwrap(await api.put(`/teams/notes/${noteId}`, { content }));
  },
  delete: async (noteId: string) => {
    return unwrap(await api.delete(`/teams/notes/${noteId}`));
  },
  pin: async (noteId: string) => {
    return unwrap(await api.post(`/teams/notes/${noteId}/pin`));
  },
  unpin: async (noteId: string) => {
    return unwrap(await api.post(`/teams/notes/${noteId}/unpin`));
  },
};

// =====================================================
// ROLES API (RBAC dynamic role management)
// =====================================================

export const rolesApi = {
  // List all roles (with department populated) — Supabase direct with backend fallback
  list: async () => {
    try {
      return await sq.getRoles();
    } catch {
      const res = await api.get("/roles");
      return unwrap(res) as Array<{
        id: string;
        name: string;
        slug: string;
        scope: "global" | "department";
        departmentId: string | null;
        departmentIds: string[];
        departmentName: string | null;
        departmentSlug: string | null;
        permissions: string[];
        isSystem: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }
  },

  // Get a single role
  get: async (id: string) => {
    const res = await api.get(`/roles/${id}`);
    return unwrap(res);
  },

  // Create a new role (requires roles:manage)
  create: (data: {
    name: string;
    scope: "global" | "department";
    department_id?: string | null;
    permissions: string[];
  }) => api.post("/roles", data),

  // Update a role (requires roles:manage)
  update: (
    id: string,
    data: {
      name?: string;
      scope?: "global" | "department";
      department_id?: string | null;
      permissions?: string[];
    },
  ) => api.put(`/roles/${id}`, data),

  // Delete a role (requires roles:manage; system roles blocked)
  // Delete a role (requires roles:manage; system roles blocked)
  // Pass force=true to delete even when users are assigned (removes all assignments)
  delete: (id: string, force?: boolean) =>
    api.delete(`/roles/${id}`, { params: force ? { force: "true" } : undefined }),

  // Get all roles assigned to a user
  getUserRoles: async (userId: string) => {
    const res = await api.get(`/roles/users/${userId}/roles`);
    return unwrap(res) as Array<{
      id: string;
      userId: string;
      roleId: string;
      roleName: string;
      roleSlug: string;
      roleScope: "global" | "department";
      departmentName: string | null;
      assignedAt: string;
    }>;
  },

  // Assign a role to a user (requires crm:admin)
  assignRole: (userId: string, roleId: string) =>
    api.post(`/roles/users/${userId}/roles`, { role_id: roleId }),

  // Remove a role from a user (requires crm:admin)
  removeRole: (userId: string, roleId: string) =>
    api.delete(`/roles/users/${userId}/roles/${roleId}`),
};
