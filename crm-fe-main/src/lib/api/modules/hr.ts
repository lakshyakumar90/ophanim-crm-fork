import { api } from "../client";
import { unwrap } from "../unwrap";

// =====================================================
// HR API - Phase 1 Analytics (Independent Card Endpoints)
// =====================================================

export const hrAnalyticsApi = {
  /**
   * Headcount stats: total, active, by department, by role
   */
  headcount: () =>
    api.get("/hr/analytics/headcount").then((res) => unwrap(res)),

  /**
   * Leave analytics: on-leave today, breakdown, pending approvals
   */
  leaves: () =>
    api.get("/hr/analytics/leaves").then((res) => unwrap(res)),

  /**
   * Recruitment analytics: open positions, pipeline, candidates
   */
  recruitment: () =>
    api.get("/hr/analytics/recruitment").then((res) => unwrap(res)),

  /**
   * Payroll analytics: current month status, trend, pending approvals
   */
  payroll: () =>
    api.get("/hr/analytics/payroll").then((res) => unwrap(res)),

  /**
   * Performance analytics: active cycles, reviews, deadlines
   */
  performance: () =>
    api.get("/hr/analytics/performance").then((res) => unwrap(res)),

  /**
   * Compliance analytics: expiring docs, probation ending
   */
  compliance: () =>
    api.get("/hr/analytics/compliance").then((res) => unwrap(res)),

  /**
   * Onboarding analytics: active onboardings, completion rate
   */
  onboarding: () =>
    api.get("/hr/analytics/onboarding").then((res) => unwrap(res)),

  /**
   * System alerts: high-priority items requiring action
   */
  alerts: () =>
    api.get("/hr/analytics/alerts").then((res) => unwrap(res)),

  /**
   * Activity feed: recent HR activities across all modules
   */
  activityFeed: (limit = 15) =>
    api
      .get("/hr/analytics/activity-feed", { params: { limit } })
      .then((res) => unwrap(res)),
};

// =====================================================
// ORG CHART
// =====================================================

export const orgChartApi = {
  get: () => api.get("/hr/org-chart").then((res) => unwrap(res)),
};

// =====================================================
// ASSETS
// =====================================================

export const assetsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/hr/assets", { params }).then((res) => unwrap(res)),
  get: (id: string) =>
    api.get(`/hr/assets/${id}`).then((res) => unwrap(res)),
  create: (data: Record<string, unknown>) => api.post("/hr/assets", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/hr/assets/${id}`, data),
  delete: (id: string) => api.delete(`/hr/assets/${id}`),
  assign: (id: string, userId: string, notes?: string) =>
    api.post(`/hr/assets/${id}/assign`, { user_id: userId, notes }),
  return: (id: string) => api.post(`/hr/assets/${id}/return`),
  listAssignments: (params?: Record<string, unknown>) =>
    api.get("/hr/assets/assignments", { params }).then((res) => unwrap(res)),
};

// =====================================================
// SKILLS
// =====================================================

export const skillsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/hr/skills", { params }).then((res) => unwrap(res)),
  get: (id: string) =>
    api.get(`/hr/skills/${id}`).then((res) => unwrap(res)),
  getMatrix: (params?: Record<string, unknown>) =>
    api.get("/hr/skills/matrix", { params }).then((res) => unwrap(res)),
  create: (data: Record<string, unknown>) => api.post("/hr/skills", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/hr/skills/${id}`, data),
  delete: (id: string) => api.delete(`/hr/skills/${id}`),
  getEmployeeSkills: (userId: string) =>
    api.get(`/hr/skills/employee/${userId}`).then((res) => unwrap(res)),
};

// =====================================================
// BENEFITS
// =====================================================

export const benefitsApi = {
  listPlans: (params?: Record<string, unknown>) =>
    api.get("/hr/benefits/plans", { params }).then((res) => unwrap(res)),
  getPlan: (id: string) =>
    api.get(`/hr/benefits/plans/${id}`).then((res) => unwrap(res)),
  createPlan: (data: Record<string, unknown>) =>
    api.post("/hr/benefits/plans", data),
  updatePlan: (id: string, data: Record<string, unknown>) =>
    api.put(`/hr/benefits/plans/${id}`, data),
  listEnrollments: (params?: Record<string, unknown>) =>
    api.get("/hr/benefits/enrollments", { params }).then((res) => unwrap(res)),
  getMyEnrollments: () =>
    api.get("/hr/benefits/enrollments/me").then((res) => unwrap(res)),
  createEnrollment: (data: Record<string, unknown>) =>
    api.post("/hr/benefits/enrollments", data),
};

// =====================================================
// EXIT
// =====================================================

export const exitApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/hr/exit", { params }).then((res) => unwrap(res)),
  get: (id: string) =>
    api.get(`/hr/exit/${id}`).then((res) => unwrap(res)),
  getByUser: (userId: string) =>
    api.get(`/hr/exit/user/${userId}`).then((res) => unwrap(res)),
  create: (data: Record<string, unknown>) => api.post("/hr/exit", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/hr/exit/${id}`, data),
  completeItem: (id: string, itemId: string) =>
    api.post(`/hr/exit/${id}/complete-item`, { item_id: itemId }),
};

// =====================================================
// SHIFTS
// =====================================================

export const shiftsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/hr/shifts", { params }).then((res) => unwrap(res)),
  getMyShifts: () =>
    api.get("/hr/shifts/me").then((res) => unwrap(res)),
  get: (id: string) =>
    api.get(`/hr/shifts/${id}`).then((res) => unwrap(res)),
  create: (data: Record<string, unknown>) => api.post("/hr/shifts", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/hr/shifts/${id}`, data),
  delete: (id: string) => api.delete(`/hr/shifts/${id}`),
};
