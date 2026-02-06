import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

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

        console.log(response);
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

// API methods
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
  }) => api.post("/auth/register", data),

  logout: () => api.post("/auth/logout"),

  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),

  me: () => api.get("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

export const departmentsApi = {
  list: () => api.get("/departments"),
  get: (id: string) => api.get(`/departments/${id}`),
};

export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get("/users", { params }),
  get: (id: string) => api.get(`/users/${id}`),
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
  // Project team assignment helpers
  getProjectManagers: () => api.get("/users/project-managers"),
  getByJobTitle: (titles: string[]) =>
    api.get("/users/by-job-title", { params: { titles: titles.join(",") } }),
  getJobTitles: (roleType?: "employee" | "manager") =>
    api.get("/users/job-titles", { params: { roleType } }),
};

export const teamsApi = {
  list: () => api.get("/teams"),
  get: (id: string) => api.get(`/teams/${id}`),
  create: (data: {
    name: string;
    managerId: string;
    departmentId: string;
    description?: string;
  }) => api.post("/teams", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getMembers: (id: string) => api.get(`/teams/${id}/members`),
  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
};

export const teamNotesApi = {
  list: (teamId: string) => api.get(`/teams/${teamId}/notes`),
  create: (teamId: string, content: string) =>
    api.post(`/teams/${teamId}/notes`, { content }),
  update: (noteId: string, content: string) =>
    api.put(`/teams/notes/${noteId}`, { content }),
  delete: (noteId: string) => api.delete(`/teams/notes/${noteId}`),
};

export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get("/leads", { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  assign: (id: string, assignTo: string, reason?: string) =>
    api.post(`/leads/${id}/assign`, { assignTo, reason }),
  getPipeline: () => api.get("/leads/pipeline"),
  getWonLeads: () => api.get("/leads/won"),
  bulkAssign: (ids: string[], assignTo: string) =>
    api.post("/leads/bulk-assign", { ids, assignTo }),
  bulkUpdate: (ids: string[], data: Record<string, unknown>) =>
    api.post("/leads/bulk-update", { ids, data }),
  bulkDelete: (leadIds: string[]) =>
    api.post("/leads/bulk-delete", { leadIds }),
  getActivities: (id: string) => api.get(`/leads/${id}/activities`),
  addActivity: (id: string, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/activities`, data),
  // Status change
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/leads/${id}/status`, { status, reason }),
  // Comments
  getComments: (id: string) => api.get(`/leads/${id}/comments`),
  addComment: (id: string, content: string) =>
    api.post(`/leads/${id}/comments`, { content }),
  updateComment: (leadId: string, commentId: string, content: string) =>
    api.put(`/leads/${leadId}/comments/${commentId}`, { content }),
  deleteComment: (leadId: string, commentId: string) =>
    api.delete(`/leads/${leadId}/comments/${commentId}`),
  getAllReminders: (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: "pending" | "sent" | "all";
    date?: string;
  }) => api.get("/leads/reminders/all", { params }),
  getReminders: (id: string) => api.get(`/leads/${id}/reminders`),
  createReminder: (id: string, reminderAt: string, note?: string) =>
    api.post(`/leads/${id}/reminders`, { reminderAt, note }),
  deleteReminder: (leadId: string, reminderId: string) =>
    api.delete(`/leads/${leadId}/reminders/${reminderId}`),
  markReminderDone: (reminderId: string) =>
    api.patch(`/leads/reminders/${reminderId}/done`),
  // Stats for filtering
  getStatsByUser: () => api.get("/leads/stats/by-user"),
};

export const tasksApi = {
  list: (params?: Record<string, unknown>) => api.get("/tasks", { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  reassign: (id: string, assignTo: string) =>
    api.post(`/tasks/${id}/reassign`, { assignTo }),
  getSummary: () => api.get("/tasks/summary"),
  getComments: (id: string) => api.get(`/tasks/${id}/comments`),
  addComment: (id: string, commentText: string) =>
    api.post(`/tasks/${id}/comments`, { commentText }),
};

export const projectsApi = {
  list: () => api.get("/projects"),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (projectId: string, data: { userId: string; role: string }) =>
    api.post(`/projects/${projectId}/members`, data),
  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

export const attendanceApi = {
  clockIn: (data?: { location?: string; notes?: string }) =>
    api.post("/attendance/clock-in", data || {}),
  clockOut: (data?: { breakDuration?: number; notes?: string }) =>
    api.post("/attendance/clock-out", data || {}),
  getToday: () => api.get("/attendance/today"),
  getSummary: (month?: number, year?: number) =>
    api.get("/attendance/summary", { params: { month, year } }),
  list: (params?: Record<string, unknown>) =>
    api.get("/attendance", { params }),
  createManual: (data: Record<string, unknown>) =>
    api.post("/attendance/manual", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/attendance/${id}`, data),
  getRules: () => api.get("/attendance/rules"),
  updateRules: (data: Record<string, unknown>) =>
    api.put("/attendance/rules", data),
  getHolidays: (year?: number) =>
    api.get("/attendance/holidays", { params: { year } }),
  createHoliday: (data: { name: string; date: string; isOptional?: boolean }) =>
    api.post("/attendance/holidays", data),
  deleteHoliday: (id: string) => api.delete(`/attendance/holidays/${id}`),
  // New endpoints for admin dashboard
  getAnalytics: (startDate?: string, endDate?: string, departmentId?: string) =>
    api.get("/attendance/analytics", {
      params: { startDate, endDate, departmentId },
    }),
  getUsersToday: (date?: string, departmentId?: string) =>
    api.get("/attendance/users-today", { params: { date, departmentId } }),
  getUserHistory: (userId: string, startDate?: string, endDate?: string) =>
    api.get(`/attendance/user/${userId}/history`, {
      params: { startDate, endDate },
    }),
  // Admin clock in/out for any user (bypasses restrictions)
  adminClockIn: (
    userId: string,
    data?: { location?: string; notes?: string },
  ) => api.post(`/attendance/admin/clock-in/${userId}`, data || {}),
  adminClockOut: (
    userId: string,
    data?: { breakDuration?: number; notes?: string },
  ) => api.post(`/attendance/admin/clock-out/${userId}`, data || {}),
  // Weekly hours chart
  getWeeklyHours: (userId?: string, weekStart?: string) =>
    api.get("/attendance/weekly-hours", { params: { userId, weekStart } }),
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: string }) =>
    api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: Record<string, boolean>) =>
    api.put("/notifications/preferences", data),
};

export const dashboardApi = {
  get: (departmentId?: string) =>
    api.get("/dashboard", { params: { departmentId } }),
  getAdmin: () => api.get("/dashboard/admin"),
  getLeadAnalytics: (startDate?: string, endDate?: string) =>
    api.get("/dashboard/lead-analytics", { params: { startDate, endDate } }),
  getUserPerformance: (userId: string, startDate?: string, endDate?: string) =>
    api.get(`/dashboard/user-performance/${userId}`, {
      params: { startDate, endDate },
    }),
  getMyPerformance: (startDate?: string, endDate?: string) =>
    api.get("/dashboard/my-performance", { params: { startDate, endDate } }),
};

export const csvApi = {
  getTemplate: () => api.get("/csv/leads/template", { responseType: "blob" }),
  importLeads: (csvData: string, assignTo?: string, status?: string) =>
    api.post("/csv/leads/import", { csvData, assignTo, status }),
  exportLeads: (params?: Record<string, unknown>) =>
    api.get("/csv/leads/export", { params, responseType: "blob" }),
};

// Activity logs API (admin only)
export const activitiesApi = {
  list: (params?: {
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
  }) => api.get("/activities", { params }),
  getLeadActivities: (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => api.get("/activities/leads", { params }),
  getStats: async (params?: {
    departmentId?: string;
    resourceType?: string;
  }) => {
    const response = await api.get("/activities/stats", {
      params,
    });
    return response.data.data;
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
    return response.data.data;
  },
};

// API methods for settings
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

// 2FA login (no auth required)
export const twoFactorApi = {
  login: async (userId: string, token: string) => {
    const response = await api.post("/auth/login/2fa", { userId, token });
    return response.data;
  },
};

// Email API
export const emailApi = {
  // User's own settings
  getSettings: () => api.get("/email/settings"),
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
  getUserSettings: (userId: string) =>
    api.get(`/email/settings/user/${userId}`),
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

  // History
  getHistory: (params?: { limit?: number; offset?: number; leadId?: string }) =>
    api.get("/email/history", { params }),

  // Info
  getInfo: () => api.get("/email/info"),
};

export default api;
