export { getAdminDashboard, getEnhancedAdminDashboard } from "./dashboard-admin.service.js";

export { getManagerDashboard, getEmployeeDashboard } from "./dashboard-manager.service.js";

export {
  getLeadAnalytics,
  getLeadAnalyticsScoped,
  getUserWiseAnalytics,
  getUserPerformance,
  getHighPriorityAlerts,
} from "./dashboard-lead-analytics.service.js";

export {
  getLeadTrendData,
  getRevenueTrendData,
  getProjectStatusData,
  getDepartmentPerformance,
  getTopPerformers,
} from "./dashboard-revenue.service.js";
