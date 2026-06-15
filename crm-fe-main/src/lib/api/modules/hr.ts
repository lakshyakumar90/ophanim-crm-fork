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
