import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import * as sq from "./supabase-queries";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Token storage keys
const ACCESS_TOKEN_KEY = "crm_access_token";
const REFRESH_TOKEN_KEY = "crm_refresh_token";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management - localStorage only
export const tokens = {
  get accessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  get refreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  set(accessToken: string, refreshToken: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokens.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshTokenValue = tokens.refreshToken;

      if (!refreshTokenValue) {
        tokens.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshTokenValue,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        tokens.set(accessToken, newRefreshToken);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        tokens.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// =====================================================
// Helper: unwrap backend API response for fallback
// =====================================================
function unwrap(res: any) {
  return res?.data?.data ?? res?.data ?? res;
}

// =====================================================
// AUTH API (always through backend)
// =====================================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    departmentId?: string | null;
    jobTitle?: string | null;
    shiftType?: string;
  }) => api.post("/auth/register", data),

  logout: () => api.post("/auth/logout"),

  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),

  me: () => api.get("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

// =====================================================
// DEPARTMENTS API (Supabase direct reads)
// =====================================================

export const departmentsApi = {
  list: async () => {
    try {
      return await sq.getDepartments();
    } catch (error) {
      console.error("Supabase departments read failed, falling back to API", error);
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
      console.error("Supabase users read failed, falling back to API", error);
      const res = await api.get("/users", { params });
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getUserById(id);
    } catch (error) {
      console.error("Supabase user read failed, falling back to API", error);
      const res = await api.get(`/users/${id}`);
      return unwrap(res);
    }
  },
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),
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
      console.error("Supabase project managers read failed, falling back to API", error);
      const res = await api.get("/users/project-managers");
      return unwrap(res);
    }
  },
  getByJobTitle: async (titles: string[]) => {
    try {
      return await sq.getUsersByJobTitle(titles);
    } catch (error) {
      console.error("Supabase job title read failed, falling back to API", error);
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
      console.error("Supabase job titles read failed, falling back to API", error);
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
      console.error("Supabase teams read failed, falling back to API", error);
      const res = await api.get("/teams");
      return unwrap(res) || [];
    }
  },
  get: async (id: string) => {
    const res = await api.get(`/teams/${id}`);
    return unwrap(res);
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
    const res = await api.get(`/teams/${id}/members`);
    return unwrap(res);
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
    try {
      return await sq.getTeamNotes(teamId);
    } catch (error) {
      console.error("Supabase team notes read failed, falling back to API", error);
      const res = await api.get(`/teams/${teamId}/notes`);
      return unwrap(res) || [];
    }
  },
  create: (teamId: string, content: string) =>
    api.post(`/teams/${teamId}/notes`, { content }),
  update: (noteId: string, content: string) =>
    api.put(`/teams/notes/${noteId}`, { content }),
  delete: (noteId: string) => api.delete(`/teams/notes/${noteId}`),
};

// =====================================================
// LEADS API (Supabase direct reads, backend for writes)
// =====================================================

export const leadsApi = {
  list: async (params?: Record<string, unknown>) => {
    try {
      return await sq.getLeads(params as any);
    } catch (error) {
      console.error("Supabase leads read failed, falling back to API", error);
      const res = await api.get("/leads", { params });
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getLeadById(id);
    } catch (error) {
      console.error("Supabase lead read failed, falling back to API", error);
      const res = await api.get(`/leads/${id}`);
      return unwrap(res);
    }
  },
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  assign: (id: string, assignTo: string, reason?: string) =>
    api.post(`/leads/${id}/assign`, { assignTo, reason }),
  getPipeline: async () => {
    try {
      return await sq.getLeadPipeline();
    } catch (error) {
      console.error("Supabase pipeline read failed, falling back to API", error);
      const res = await api.get("/leads/pipeline");
      return unwrap(res);
    }
  },
  getWonLeads: async () => {
    try {
      return await sq.getWonLeads();
    } catch (error) {
      console.error("Supabase won leads read failed, falling back to API", error);
      const res = await api.get("/leads/won");
      return unwrap(res);
    }
  },
  bulkAssign: (ids: string[], assignTo: string) =>
    api.post("/leads/bulk-assign", { ids, assignTo }),
  bulkUpdate: (ids: string[], data: Record<string, unknown>) =>
    api.post("/leads/bulk-update", { ids, data }),
  bulkDelete: (leadIds: string[]) =>
    api.post("/leads/bulk-delete", { leadIds }),
  getActivities: async (id: string) => {
    try {
      return await sq.getLeadActivities(id);
    } catch (error) {
      console.error("Supabase lead activities read failed, falling back to API", error);
      const res = await api.get(`/leads/${id}/activities`);
      return unwrap(res);
    }
  },
  addActivity: (id: string, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/activities`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/leads/${id}/status`, { status, reason }),
  getComments: async (id: string) => {
    try {
      return await sq.getLeadComments(id);
    } catch (error) {
      console.error("Supabase lead comments read failed, falling back to API", error);
      const res = await api.get(`/leads/${id}/comments`);
      return unwrap(res);
    }
  },
  addComment: (id: string, content: string) =>
    api.post(`/leads/${id}/comments`, { content }),
  updateComment: (leadId: string, commentId: string, content: string) =>
    api.put(`/leads/${leadId}/comments/${commentId}`, { content }),
  deleteComment: (leadId: string, commentId: string) =>
    api.delete(`/leads/${leadId}/comments/${commentId}`),
  getAllReminders: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: "pending" | "sent" | "all";
    date?: string;
  }) => {
    try {
      const sqRes = await sq.getAllReminders(params);
      const rows = sqRes?.data || [];
      const hasMissingLeadInfo = rows.some((r: any) => {
        const leadId = r?.leadId || r?.lead_id;
        const leadName =
          r?.lead?.leadName ||
          r?.lead?.lead_name ||
          r?.leads?.leadName ||
          r?.leads?.lead_name;
        return Boolean(leadId) && !leadName;
      });

      if (!hasMissingLeadInfo) {
        return sqRes;
      }

      // Supabase can return reminders without joined lead details under some role policies.
      // Fall back to backend (service role) to resolve lead names consistently.
      const res = await api.get("/leads/reminders/all", { params });
      const payload = unwrap(res);
      if (Array.isArray(payload)) {
        const page = params?.page || 1;
        const limit = params?.limit || payload.length || 1;
        return {
          data: payload,
          meta: {
            total: payload.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(payload.length / limit)),
            hasPrevPage: page > 1,
            hasNextPage: page * limit < payload.length,
          },
        };
      }
      if (payload && Array.isArray(payload.data)) {
        return payload;
      }
      return sqRes;
    } catch (error) {
      console.error("Supabase reminders read failed, falling back to API", error);
      const res = await api.get("/leads/reminders/all", { params });
      const payload = unwrap(res);
      if (Array.isArray(payload)) {
        const page = params?.page || 1;
        const limit = params?.limit || payload.length || 1;
        return {
          data: payload,
          meta: {
            total: payload.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(payload.length / limit)),
            hasPrevPage: page > 1,
            hasNextPage: page * limit < payload.length,
          },
        };
      }
      if (payload && Array.isArray(payload.data)) {
        return payload;
      }
      return {
        data: [],
        meta: {
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 20,
          totalPages: 0,
          hasPrevPage: false,
          hasNextPage: false,
        },
      };
    }
  },
  getReminders: async (id: string) => {
    try {
      const sqRes = await sq.getLeadReminders(id);
      const hasMissingLeadInfo = (sqRes || []).some((r: any) => {
        const leadId = r?.leadId || r?.lead_id;
        const leadName =
          r?.lead?.leadName ||
          r?.lead?.lead_name ||
          r?.leads?.leadName ||
          r?.leads?.lead_name;
        return Boolean(leadId) && !leadName;
      });
      if (!hasMissingLeadInfo) return sqRes;

      const res = await api.get(`/leads/${id}/reminders`);
      return unwrap(res);
    } catch (error) {
      console.error("Supabase lead reminders read failed, falling back to API", error);
      const res = await api.get(`/leads/${id}/reminders`);
      return unwrap(res);
    }
  },
  createReminder: (id: string, reminderAt: string, note?: string) =>
    api.post(`/leads/${id}/reminders`, { reminderAt, note }),
  deleteReminder: (leadId: string, reminderId: string) =>
    api.delete(`/leads/${leadId}/reminders/${reminderId}`),
  markReminderDone: (reminderId: string) =>
    api.patch(`/leads/reminders/${reminderId}/done`),
  getStatsByUser: async () => {
    try {
      return await sq.getLeadStatsByUser();
    } catch (error) {
      console.error("Supabase lead stats read failed, falling back to API", error);
      const res = await api.get("/leads/stats/by-user");
      return unwrap(res);
    }
  },
};

// =====================================================
// TASKS API (Supabase direct reads, backend for writes)
// =====================================================

export const tasksApi = {
  list: async (params?: Record<string, unknown>) => {
    try {
      return await sq.getTasks(params as any);
    } catch (error) {
      console.error("Supabase tasks read failed, falling back to API", error);
      const res = await api.get("/tasks", { params });
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getTaskById(id);
    } catch (error) {
      console.error("Supabase task read failed, falling back to API", error);
      const res = await api.get(`/tasks/${id}`);
      return unwrap(res);
    }
  },
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  reassign: (id: string, assignTo: string) =>
    api.post(`/tasks/${id}/reassign`, { assignTo }),
  getSummary: async () => {
    try {
      return await sq.getTaskSummary();
    } catch (error) {
      console.error("Supabase task summary read failed, falling back to API", error);
      const res = await api.get("/tasks/summary");
      return unwrap(res);
    }
  },
  getComments: async (id: string) => {
    try {
      return await sq.getTaskComments(id);
    } catch (error) {
      console.error("Supabase task comments read failed, falling back to API", error);
      const res = await api.get(`/tasks/${id}/comments`);
      return unwrap(res);
    }
  },
  addComment: (id: string, commentText: string) =>
    api.post(`/tasks/${id}/comments`, { commentText }),
};

// =====================================================
// PROJECTS API (Supabase direct reads, backend for writes)
// =====================================================

export const projectsApi = {
  list: async () => {
    try {
      return await sq.getProjects();
    } catch (error) {
      console.error("Supabase projects read failed, falling back to API", error);
      const res = await api.get("/projects");
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getProjectById(id);
    } catch (error) {
      console.error("Supabase project read failed, falling back to API", error);
      const res = await api.get(`/projects/${id}`);
      return unwrap(res);
    }
  },
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (projectId: string, data: { userId: string; role: string }) =>
    api.post(`/projects/${projectId}/members`, data),
  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

// =====================================================
// ATTENDANCE API (Supabase direct reads for history, backend for clock-in/out)
// =====================================================

export const attendanceApi = {
  // Writes - always through backend
  clockIn: (data?: { userId?: string; location?: string; notes?: string }) =>
    api.post("/attendance/clock-in", data || {}),
  clockOut: (data?: { breakDuration?: number; notes?: string }) =>
    api.post("/attendance/clock-out", data || {}),
  createManual: (data: Record<string, unknown>) =>
    api.post("/attendance/manual", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/attendance/${id}`, data),
  updateRules: (data: Record<string, unknown>) =>
    api.put("/attendance/rules", data),
  createHoliday: (data: { name: string; date: string; isOptional?: boolean }) =>
    api.post("/attendance/holidays", data),
  deleteHoliday: (id: string) => api.delete(`/attendance/holidays/${id}`),
  adminClockIn: (
    userId: string,
    data?: { location?: string; notes?: string },
  ) => api.post(`/attendance/admin/clock-in/${userId}`, data || {}),
  adminClockOut: (
    userId: string,
    data?: { breakDuration?: number; notes?: string },
  ) => api.post(`/attendance/admin/clock-out/${userId}`, data || {}),
  adminRestoreAttendance: (attendanceId: string) =>
    api.post(`/admin/restore-attendance/${attendanceId}`),

  // Reads - Supabase direct with backend fallback
  getToday: async () => {
    const res = await api.get("/attendance/today");
    return unwrap(res);
  },
  getShiftStatus: async () => {
    const res = await api.get("/attendance/shift-status");
    return unwrap(res);
  },
  getSummary: async (month?: number, year?: number) => {
    // Keep through backend since it involves shift-aware logic
    const res = await api.get("/attendance/summary", {
      params: { month, year },
    });
    return unwrap(res);
  },
  list: async (params?: Record<string, unknown>) => {
    try {
      return await sq.getAttendanceList(params as any);
    } catch (error) {
      console.error("Supabase attendance list read failed, falling back to API", error);
      const res = await api.get("/attendance", { params });
      return unwrap(res);
    }
  },
  getRules: async (shiftType?: string) => {
    try {
      return await sq.getAttendanceRules(shiftType);
    } catch (error) {
      console.error("Supabase rules read failed, falling back to API", error);
      const res = await api.get("/attendance/rules");
      return unwrap(res);
    }
  },
  getHolidays: async (year?: number) => {
    try {
      return await sq.getHolidays(year);
    } catch (error) {
      console.error("Supabase holidays read failed, falling back to API", error);
      const res = await api.get("/attendance/holidays", {
        params: { year },
      });
      return unwrap(res);
    }
  },
  getAnalytics: async (startDate?: string, endDate?: string, departmentId?: string) => {
    const res = await api.get("/attendance/analytics", {
      params: { startDate, endDate, departmentId },
    });
    return unwrap(res);
  },
  getUsersToday: async (date?: string, departmentId?: string) => {
    const res = await api.get("/attendance/users-today", {
      params: { date, departmentId },
    });
    return unwrap(res);
  },
  getUserHistory: async (userId: string, startDate?: string, endDate?: string) => {
    try {
      return await sq.getUserAttendanceHistory(userId, startDate, endDate);
    } catch (error) {
      console.error("Supabase user history read failed, falling back to API", error);
      const res = await api.get(`/attendance/user/${userId}/history`, {
        params: { startDate, endDate },
      });
      return unwrap(res);
    }
  },
  getWeeklyHours: async (userId?: string, weekStart?: string) => {
    // Keep through backend since frontend chart expects normalized 7-day shape
    // with { day, date, hours, isWeekend }.
    const res = await api.get("/attendance/weekly-hours", {
      params: { userId, weekStart },
    });
    return unwrap(res);
  },
};

// =====================================================
// NOTIFICATIONS API (Supabase direct reads, backend for writes)
// =====================================================

export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number; unreadOnly?: string }) => {
    try {
      return await sq.getNotifications({
        page: params?.page,
        limit: params?.limit,
        unreadOnly: params?.unreadOnly === "true",
      });
    } catch (error) {
      console.error("Supabase notifications read failed, falling back to API", error);
      const res = await api.get("/notifications", { params });
      return unwrap(res);
    }
  },
  getUnreadCount: async () => {
    try {
      return await sq.getUnreadNotificationCount();
    } catch (error) {
      console.error("Supabase unread count read failed, falling back to API", error);
      const res = await api.get("/notifications/unread-count");
      return unwrap(res);
    }
  },
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  getPreferences: async () => {
    const res = await api.get("/notifications/preferences");
    return unwrap(res);
  },
  updatePreferences: (data: Record<string, boolean>) =>
    api.put("/notifications/preferences", data),
};

// =====================================================
// DASHBOARD API (stays on backend - complex aggregation logic)
// =====================================================

export const dashboardApi = {
  get: async (departmentId?: string) => {
    const res = await api.get("/dashboard", { params: { departmentId } });
    return unwrap(res);
  },
  getAdmin: async () => {
    const res = await api.get("/dashboard/admin");
    return unwrap(res);
  },
  getLeadAnalytics: async (startDate?: string, endDate?: string) => {
    const res = await api.get("/dashboard/lead-analytics", { params: { startDate, endDate } });
    return unwrap(res);
  },
  getUserPerformance: async (userId: string, startDate?: string, endDate?: string) => {
    const res = await api.get(`/dashboard/user-performance/${userId}`, {
      params: { startDate, endDate },
    });
    return unwrap(res);
  },
  getMyPerformance: async (startDate?: string, endDate?: string) => {
    const res = await api.get("/dashboard/my-performance", { params: { startDate, endDate } });
    return unwrap(res);
  },
};

// =====================================================
// CSV API (always through backend)
// =====================================================

export const csvApi = {
  getTemplate: () => api.get("/csv/leads/template", { responseType: "blob" }),
  importLeads: (csvData: string, assignTo?: string, status?: string) =>
    api.post("/csv/leads/import", { csvData, assignTo, status }),
  exportLeads: (params?: Record<string, unknown>) =>
    api.get("/csv/leads/export", { params, responseType: "blob" }),
};

// =====================================================
// ACTIVITY LOGS API (Supabase direct reads, admin only)
// =====================================================

export const activitiesApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    teamId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    includeAuth?: boolean;
  }) => {
    try {
      return await sq.getActivityLogs(params);
    } catch (error) {
      console.error("Supabase activities read failed, falling back to API", error);
      const res = await api.get("/activities", { params });
      return unwrap(res);
    }
  },
  getLeadActivities: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      return await sq.getLeadActivitiesLog(params);
    } catch (error) {
      console.error("Supabase lead activities read failed, falling back to API", error);
      const res = await api.get("/activities/leads", { params });
      return unwrap(res);
    }
  },
  getStats: async (params?: {
    departmentId?: string;
    resourceType?: string;
  }) => {
    const response = await api.get("/activities/stats", { params });
    return unwrap(response);
  },
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    teamId?: string;
    userId?: string;
    interval?: "daily" | "weekly" | "monthly" | "quarterly";
    departmentId?: string;
  }) => {
    const response = await api.get("/activities/analytics", { params });
    return unwrap(response);
  },
};

// =====================================================
// SETTINGS API (always through backend)
// =====================================================

export const settingsApi = {
  changePassword: async (data: any) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  requestPasswordChangeOTP: async () => {
    const response = await api.post("/auth/request-password-otp");
    return response.data;
  },

  verifyPasswordChangeOTP: async (data: any) => {
    const response = await api.post("/auth/verify-password-otp", data);
    return response.data;
  },

  // 2FA methods
  setup2FA: async () => {
    const response = await api.post("/auth/2fa/setup");
    return response.data;
  },

  verify2FA: async (token: string) => {
    const response = await api.post("/auth/2fa/verify", { token });
    return response.data;
  },

  disable2FA: async (password: string, token: string) => {
    const response = await api.post("/auth/2fa/disable", { password, token });
    return response.data;
  },
};

// =====================================================
// 2FA LOGIN API (no auth required)
// =====================================================

export const twoFactorApi = {
  login: async (userId: string, token: string) => {
    const response = await api.post("/auth/login/2fa", { userId, token });
    return response.data;
  },
};

// =====================================================
// EMAIL API (Supabase direct reads for settings/history, backend for sends)
// =====================================================

export const emailApi = {
  // Reads via Supabase
  getSettings: async () => {
    try {
      return await sq.getEmailSettings();
    } catch (error) {
      console.error("Supabase email settings read failed, falling back to API", error);
      const res = await api.get("/email/settings");
      return unwrap(res);
    }
  },
  getHistory: async (params?: { limit?: number; offset?: number; leadId?: string }) => {
    try {
      return await sq.getEmailHistory(params);
    } catch (error) {
      console.error("Supabase email history read failed, falling back to API", error);
      const res = await api.get("/email/history", { params });
      return unwrap(res);
    }
  },
  getInfo: async () => {
    const res = await api.get("/email/info");
    return unwrap(res);
  },

  // Writes - always through backend
  saveSettings: (data: {
    emailType: "smtp" | "gmail";
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
  }) => api.post("/email/settings", data),
  deleteSettings: () => api.delete("/email/settings"),
  testSettings: () => api.post("/email/settings/test"),

  // Admin: Manage any user's settings
  getUserSettings: async (userId: string) => {
    const res = await api.get(`/email/settings/user/${userId}`);
    return unwrap(res);
  },
  saveUserSettings: (
    userId: string,
    data: {
      emailType: "smtp" | "gmail";
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      smtpSecure: boolean;
    },
  ) => api.post(`/email/settings/user/${userId}`, data),
  deleteUserSettings: (userId: string) =>
    api.delete(`/email/settings/user/${userId}`),
  testUserSettings: (userId: string) =>
    api.post(`/email/settings/user/${userId}/test`),

  // Sending
  send: (data: {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
    leadId?: string;
  }) => api.post("/email/send", data),

  sendBulk: (
    emails: Array<{
      to: string;
      toName?: string;
      subject: string;
      html: string;
      leadId?: string;
    }>,
  ) => api.post("/email/send-bulk", { emails }),
};

export default api;
