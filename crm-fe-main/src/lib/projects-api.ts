import api from "./api";
import type { Project, ProjectMember, ApiResponse } from "@/types";

function unwrap(res: any) {
  return res?.data?.data ?? res?.data ?? res;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  clientName?: string;
  leadId?: string;
  managerId: string;
  priority?: "low" | "medium" | "high";
  startDate?: Date;
  endDate?: Date;
  // Team members to add on creation
  teamMembers?: { userId: string; role: string }[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  clientName?: string;
  status?: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  planned: number;
  cancelled: number;
  idle: number;
  byManager: {
    managerId: string;
    managerName: string;
    managerAvatar: string | null;
    projectCount: number;
    activeCount: number;
    completedCount: number;
    taskCompletionRate?: number; // New
    overdueTasks?: number; // New
  }[];
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  teamWorkload?: {
    // New
    userId: string;
    userName: string;
    activeTasks: number;
  }[];
  totalOverdueTasks: number; // New
}

export interface ProjectResources {
  developers: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
  designers: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
  seoSpecialists: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
  contentWriters: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
  projectManagers: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
}

export const projectsApi = {
  // Standard CRUD
  list: async () => {
    const res = await api.get<ApiResponse<Project[]>>("/projects");
    return unwrap(res);
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return unwrap(res);
  },
  create: (data: CreateProjectInput) =>
    api.post<ApiResponse<Project>>("/projects", data),
  update: (id: string, data: UpdateProjectInput) =>
    api.put<ApiResponse<Project>>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),

  // Dashboard & Analytics
  getStats: async () => {
    const res = await api.get<ApiResponse<ProjectStats>>("/projects/stats");
    return unwrap(res);
  },
  getIdleProjects: async () => {
    const res = await api.get<ApiResponse<Project[]>>("/projects/idle");
    return unwrap(res);
  },
  getResources: async () => {
    const res = await api.get<ApiResponse<ProjectResources>>("/projects/resources");
    return unwrap(res);
  },
  getByManager: async (managerId: string) => {
    const res = await api.get<ApiResponse<Project[]>>(`/projects/by-manager/${managerId}`);
    return unwrap(res);
  },

  // Members
  addMember: (
    projectId: string,
    userId: string,
    role: string,
    allocationPercentage?: number,
  ) =>
    api.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, {
      userId,
      role,
      allocationPercentage,
    }),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),

  updateMember: (
    projectId: string,
    userId: string,
    data: { role?: string; allocationPercentage?: number },
  ) => api.put(`/projects/${projectId}/members/${userId}`, data),
};
