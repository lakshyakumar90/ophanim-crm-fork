import { projectsApi } from "./api";

export interface CreateProjectInput {
  name: string;
  description?: string;
  clientName?: string;
  leadId?: string;
  managerId: string;
  priority?: "low" | "medium" | "high";
  startDate?: Date;
  endDate?: Date;
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
    taskCompletionRate?: number;
    overdueTasks?: number;
  }[];
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  teamWorkload?: {
    userId: string;
    userName: string;
    activeTasks: number;
  }[];
  totalOverdueTasks: number;
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

export { projectsApi };
