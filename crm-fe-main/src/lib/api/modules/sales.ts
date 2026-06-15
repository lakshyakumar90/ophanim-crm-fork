import * as sq from "../../supabase-queries";
import { smartRead, type QueryStrategy } from "../../smart-read";
import { api } from "../client";
import { unwrap } from "../unwrap";

// =====================================================
// LEADS API (Supabase direct reads, backend for writes)
// =====================================================

const LEADS_READ_STRATEGY: Record<string, QueryStrategy> = {
  list: "supabase-with-fallback",
  get: "supabase-with-fallback",
  getDetailPageData: "backend-only",
  getPipeline: "supabase-with-fallback",
  getWonLeads: "supabase-with-fallback",
  getActivities: "supabase-with-fallback",
  getComments: "backend-only",
  getAllReminders: "supabase-with-fallback",
  getRemindersCount: "supabase-with-fallback",
  getReminders: "backend-only",
  getStatsByUser: "backend-only",
} as const;

export const leadsApi = {
  list: async (params?: Record<string, unknown>) => {
    return smartRead({
      routeKey: "leads.list",
      strategy: LEADS_READ_STRATEGY.list,
      supabaseQuery: () => sq.getLeads(params as any),
      backendQuery: async () => unwrap(await api.get("/leads", { params })),
    });
  },
  get: async (id: string) => {
    return smartRead({
      routeKey: "leads.get",
      strategy: LEADS_READ_STRATEGY.get,
      supabaseQuery: () => sq.getLeadById(id),
      backendQuery: async () => unwrap(await api.get(`/leads/${id}`)),
    });
  },
  getDetailPageData: async (id: string) => {
    return smartRead({
      routeKey: "leads.getDetailPageData",
      strategy: LEADS_READ_STRATEGY.getDetailPageData,
      backendQuery: async () => unwrap(await api.get(`/leads/${id}/page-data`)),
    });
  },
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  assign: (id: string, assignTo: string, reason?: string) =>
    api.post(`/leads/${id}/assign`, { assignTo, reason }),
  getPipeline: async () => {
    return smartRead({
      routeKey: "leads.getPipeline",
      strategy: LEADS_READ_STRATEGY.getPipeline,
      supabaseQuery: () => sq.getLeadPipeline(),
      backendQuery: async () => unwrap(await api.get("/leads/pipeline")),
    });
  },
  getWonLeads: async () => {
    return smartRead({
      routeKey: "leads.getWonLeads",
      strategy: LEADS_READ_STRATEGY.getWonLeads,
      supabaseQuery: () => sq.getWonLeads(),
      backendQuery: async () => unwrap(await api.get("/leads/won")),
    });
  },
  bulkAssign: (ids: string[], assignTo: string) =>
    api.post("/leads/bulk-assign", { ids, assignTo }),
  bulkUpdate: (ids: string[], data: Record<string, unknown>) =>
    api.post("/leads/bulk-update", { ids, data }),
  bulkDelete: (leadIds: string[]) =>
    api.post("/leads/bulk-delete", { ids: leadIds }),
  getActivities: async (id: string) => {
    return smartRead({
      routeKey: "leads.getActivities",
      strategy: LEADS_READ_STRATEGY.getActivities,
      supabaseQuery: () => sq.getLeadActivities(id),
      backendQuery: async () => unwrap(await api.get(`/leads/${id}/activities`)),
    });
  },
  addActivity: (id: string, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/activities`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/leads/${id}/status`, { status, reason }),
  getComments: async (id: string) => {
    return smartRead({
      routeKey: "leads.getComments",
      strategy: LEADS_READ_STRATEGY.getComments,
      supabaseQuery: () => sq.getLeadComments(id),
      backendQuery: async () => unwrap(await api.get(`/leads/${id}/comments`)),
    });
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
    return smartRead({
      routeKey: "leads.getAllReminders",
      strategy: LEADS_READ_STRATEGY.getAllReminders,
      supabaseQuery: () => sq.getAllReminders(params),
      backendQuery: async () => {
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
          },
        };
      },
    });
  },
  getRemindersCount: async (params?: {
    userId?: string;
    status?: "pending" | "sent" | "all";
    date?: string;
  }) => {
    return smartRead({
      routeKey: "leads.getRemindersCount",
      strategy: LEADS_READ_STRATEGY.getRemindersCount,
      supabaseQuery: () => sq.getRemindersCount(params),
      backendQuery: async () => unwrap(await api.get("/leads/reminders/count", { params })),
    });
  },
  getReminders: async (id: string) => {
    return smartRead({
      routeKey: "leads.getReminders",
      strategy: LEADS_READ_STRATEGY.getReminders,
      backendQuery: async () => unwrap(await api.get(`/leads/${id}/reminders`)),
    });
  },
  createReminder: (id: string, reminderAt: string, note?: string) =>
    api.post(`/leads/${id}/reminders`, { reminderAt, note }),
  deleteReminder: (leadId: string, reminderId: string) =>
    api.delete(`/leads/${leadId}/reminders/${reminderId}`),
  markReminderDone: (reminderId: string) =>
    api.patch(`/leads/reminders/${reminderId}/done`),
  getStatsByUser: async () => {
    return smartRead({
      routeKey: "leads.getStatsByUser",
      strategy: LEADS_READ_STRATEGY.getStatsByUser,
      backendQuery: async () => unwrap(await api.get("/leads/stats/by-user")),
    });
  },
  getActivityCountsByUser: async (): Promise<Record<string, number>> => {
    try {
      return await sq.getLeadActivitiesCountByUser();
    } catch (error) {
      console.error("Failed to fetch lead activity counts by user", error);
      return {};
    }
  },
  getLeadsWorkedByUser: async (): Promise<Record<string, number>> => {
    try {
      return await sq.getDistinctLeadsWorkedByUser();
    } catch (error) {
      console.error("Failed to fetch distinct leads worked by user", error);
      return {};
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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase tasks read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/tasks", { params });
      return unwrap(res);
    }
  },
  get: async (id: string) => {
    try {
      return await sq.getTaskById(id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Supabase task read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
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
      if (process.env.NODE_ENV !== "production") console.warn("Supabase task summary read failed, falling back to API", (error as any)?.message || (error as any)?.code || String(error));
      const res = await api.get("/tasks/summary");
      return unwrap(res);
    }
  },
  getComments: async (id: string) => {
    const res = await api.get(`/tasks/${id}/comments`);
    return unwrap(res);
  },
  addComment: (id: string, commentText: string) =>
    api.post(`/tasks/${id}/comments`, { commentText }),
  /** Check and send due reminder notifications for the current user. Idempotent. */
  checkReminders: () => api.post("/tasks/reminders/check"),
};

// =====================================================
// CSV API (always through backend)
// =====================================================

export const csvApi = {
  getTemplate: () => api.get("/csv/leads/template", { responseType: "blob" }),
  importLeads: (
    csvData: string,
    assignTo?: string,
    status?: string,
    rowActions?: Record<number, "import" | "skip" | "update">,
  ) => api.post("/csv/leads/import", { csvData, assignTo, status, rowActions }),
  previewCheck: (csvData: string) =>
    api.post("/csv/leads/preview-check", { csvData }),
  exportLeads: (params?: Record<string, unknown>) =>
    api.get("/csv/leads/export", { params, responseType: "blob" }),
  getDuplicateLeads: () => api.get("/csv/leads/duplicates"),
};
