import * as sq from "../../supabase-queries";
import { smartRead, type QueryStrategy } from "../../smart-read";
import { api } from "../client";
import { unwrap } from "../unwrap";

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
  adminRestoreAttendance: (attendanceId: string) =>
    api.post(`/attendance/admin/restore/${attendanceId}`),

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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase attendance list read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/attendance", { params });
      return unwrap(res);
    }
  },
  getRules: async (shiftType?: string) => {
    try {
      return await sq.getAttendanceRules(shiftType);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase rules read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/attendance/rules");
      return unwrap(res);
    }
  },
  getHolidays: async (year?: number) => {
    try {
      return await sq.getHolidays(year);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase holidays read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/attendance/holidays", {
        params: { year },
      });
      return unwrap(res);
    }
  },
  getApprovedLeaves: async (startDate?: string, endDate?: string) => {
    const res = await api.get("/attendance/leaves", {
      params: { startDate, endDate },
    });
    return unwrap(res);
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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase user history read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase notifications read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/notifications", { params });
      return unwrap(res);
    }
  },
  getUnreadCount: async () => {
    try {
      return await sq.getUnreadNotificationCount();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase unread count read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
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
  getLeadAnalytics: async (
    startDate?: string,
    endDate?: string,
    teamId?: string,
    userId?: string,
    departmentId?: string,
  ) => {
    const res = await api.get("/dashboard/lead-analytics", {
      params: { startDate, endDate, teamId, userId, departmentId },
    });
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
  getUserWiseAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    teamId?: string;
    userId?: string;
    departmentId?: string;
  }) => {
    const res = await api.get("/dashboard/user-wise-analytics", { params });
    return unwrap(res);
  },
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
    /** Filter to a specific entity by ID (e.g. a project UUID) */
    entityId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    includeAuth?: boolean;
    scope?: "self" | "team" | "department" | "all-crm" | "member";
    commentsOnly?: boolean;
    /** Opt-in to cursor-based pagination from the activity_events table */
    useEventsFeed?: boolean;
    /** Cursor from previous page's meta.nextCursor.createdAt */
    cursorTime?: string;
    /** Cursor from previous page's meta.nextCursor.id */
    cursorId?: string;
  }) => {
    const { useEventsFeed, cursorTime, cursorId, entityId, commentsOnly, ...rest } = params ?? {};

    const requiresBackendOnly = Boolean(
      useEventsFeed || cursorTime || cursorId || entityId || commentsOnly,
    );

    const strategy: QueryStrategy = requiresBackendOnly
      ? "backend-only"
      : "supabase-with-fallback";

    return smartRead({
      routeKey: "activities.list",
      strategy,
      supabaseQuery: async () =>
        sq.getActivityLogs({
          page: rest.page,
          limit: rest.limit,
          userId: rest.userId,
          teamId: rest.teamId,
          resourceType: rest.resourceType,
          action: rest.action,
          startDate: rest.startDate,
          endDate: rest.endDate,
          departmentId: rest.departmentId,
        }),
      backendQuery: async () => {
        const queryParams: Record<string, unknown> = {
          ...rest,
          ...(entityId ? { entityId } : {}),
          ...(commentsOnly ? { commentsOnly } : {}),
        };

        if (useEventsFeed) {
          queryParams.use_events_feed = "true";
          if (cursorTime) queryParams.cursor_time = cursorTime;
          if (cursorId) queryParams.cursor_id = cursorId;
        }

        const res = await api.get("/activities", { params: queryParams });
        return {
          data: res.data.data,
          meta: res.data.meta,
        };
      },
    });
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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase lead activities read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/activities/leads", { params });
      return unwrap(res);
    }
  },
  getStats: async (params?: {
    departmentId?: string;
    resourceType?: string;
    teamId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    scope?: "self" | "team" | "department" | "all-crm" | "member";
    commentsOnly?: boolean;
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
// EMAIL API (Supabase direct reads for settings/history, backend for sends)
// =====================================================

export const emailApi = {
  // Reads via Supabase
  getSettings: async () => {
    try {
      return await sq.getEmailSettings();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase email settings read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/email/settings");
      return unwrap(res);
    }
  },
  getHistory: async (params?: { limit?: number; offset?: number; leadId?: string }) => {
    try {
      return await sq.getEmailHistory(params);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase email history read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
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
