import * as sq from "../../supabase-queries";
import { api } from "../client";
import { unwrap } from "../unwrap";

// =====================================================
// PROJECTS API (Supabase direct reads, backend for writes)
// =====================================================

export const projectsApi = {
  list: async () => {
    // Always use the backend API for project listing.
    // The Supabase client uses user-facing RLS which can silently return an empty
    // array for managers from non-project departments (e.g. Sales Manager who is
    // also a project manager). The backend uses supabaseAdmin with role-aware
    // getAccessibleProjectIds() logic to correctly scope the results.
    const res = await api.get("/projects");
    return unwrap(res);
  },
  get: async (id: string) => {
    try {
      return await sq.getProjectById(id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase project read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get(`/projects/${id}`);
      return unwrap(res);
    }
  },
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (
    projectId: string,
    dataOrUserId: { userId: string; role: string; allocationPercentage?: number } | string,
    role?: string,
    allocationPercentage?: number,
  ) => {
    const payload =
      typeof dataOrUserId === "string"
        ? { userId: dataOrUserId, role, allocationPercentage }
        : dataOrUserId;
    return api.post(`/projects/${projectId}/members`, payload);
  },
  updateMember: (
    projectId: string,
    userId: string,
    data: { role?: string; allocationPercentage?: number },
  ) => api.put(`/projects/${projectId}/members/${userId}`, data),
  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
  getStats: async () => {
    const res = await api.get("/projects/stats");
    return unwrap(res);
  },
  getIdleProjects: async () => {
    const res = await api.get("/projects/idle");
    return unwrap(res);
  },
  getResources: async () => {
    const res = await api.get("/projects/resources");
    return unwrap(res);
  },
  getByManager: async (managerId: string) => {
    const res = await api.get(`/projects/by-manager/${managerId}`);
    return unwrap(res);
  },
};
