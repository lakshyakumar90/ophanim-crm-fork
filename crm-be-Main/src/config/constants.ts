// Application Constants

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Bulk Operations
export const BULK_LIMITS = {
  MAX_RECORDS: 500,
  BATCH_SIZE: 100,
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Lead Statuses - Comprehensive CRM statuses
export const LEAD_STATUSES = {
  FRESH_LEAD: "fresh_lead",
  HOT_LEAD: "hot_lead",
  MEETING_SCHEDULED: "meeting_scheduled",
  DID_NOT_PICK: "did_not_pick",
  FOLLOW_UP: "follow_up",
  FUTURE_LEAD: "future_lead",
  NOT_INTERESTED: "not_interested",
  NOT_A_LEAD: "not_a_lead",
  WON: "won",
  PROPOSAL_SENT: "proposal_sent",
} as const;

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES];

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "fresh_lead",
  "hot_lead",
  "meeting_scheduled",
  "did_not_pick",
  "follow_up",
  "future_lead",
  "not_interested",
  "not_a_lead",
  "won",
  "proposal_sent",
];

// Lead Sources - Standard CRM sources
export const LEAD_SOURCES = {
  WEBSITE: "website",
  REFERRAL: "referral",
  COLD_CALL: "cold_call",
  EMAIL_CAMPAIGN: "email_campaign",
  SOCIAL_MEDIA: "social_media",
  TRADE_SHOW: "trade_show",
  ADVERTISEMENT: "advertisement",
  PARTNER: "partner",
  ORGANIC_SEARCH: "organic_search",
  PAID_SEARCH: "paid_search",
  DIRECT: "direct",
  OTHER: "other",
} as const;

export type LeadSource = (typeof LEAD_SOURCES)[keyof typeof LEAD_SOURCES];

// Activity Types
export const ACTIVITY_TYPES = {
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  NOTE: "note",
  STATUS_CHANGE: "status_change",
  ASSIGNMENT: "assignment",
  TASK_CREATED: "task_created",
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

// Task Priorities
export const TASK_PRIORITIES = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type TaskPriority =
  (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

// Task Statuses
export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

// Attendance Statuses
export const ATTENDANCE_STATUSES = {
  PRESENT: "present",
  LATE: "late",
  HALF_DAY: "half_day",
  ABSENT: "absent",
  LEAVE: "leave",
  HOLIDAY: "holiday",
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];

// Notification Types
export const NOTIFICATION_TYPES = {
  LEAD_ASSIGNMENT: "lead_assignment",
  LEAD_STATUS_CHANGE: "lead_status_change",
  TASK_ASSIGNMENT: "task_assignment",
  TASK_DUE: "task_due",
  TASK_OVERDUE: "task_overdue",
  MENTION: "mention",
  SYSTEM: "system",
  ATTENDANCE: "attendance",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// Action Types for Activity Logs
export const LOG_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  EXPORT: "export",
  IMPORT: "import",
  LOGIN: "login",
  LOGOUT: "logout",
  BULK_UPDATE: "bulk_update",
  REASSIGN: "reassign",
} as const;

export type LogAction = (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS];

// Resource Types for Activity Logs
export const RESOURCE_TYPES = {
  LEAD: "lead",
  USER: "user",
  TASK: "task",
  TEAM: "team",
  ATTENDANCE: "attendance",
  SETTINGS: "settings",
  PROJECT: "project",
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

// API Versioning
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

// Token Types
export const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
} as const;

export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

// Departments
export const DEPARTMENTS = {
  SALES: "sales",
  HR: "hr",
  FINANCE: "finance",
  PROJECT_MANAGEMENT: "project_management",
} as const;

export type Department = (typeof DEPARTMENTS)[keyof typeof DEPARTMENTS];

// Department-based job titles mapping
// Job titles are organized by department for proper filtering
export const DEPARTMENT_JOB_TITLES = {
  sales: {
    employee: ["sales_employee"],
    manager: ["sales_manager"],
  },
  hr: {
    employee: ["hr_employee"],
    manager: ["hr_manager"],
  },
  finance: {
    employee: ["finance_employee"],
    manager: ["finance_manager"],
  },
  project_management: {
    employee: ["developer", "designer", "content_writer", "seo_specialist"],
    manager: ["project_manager"],
  },
} as const;

// All job titles flattened
export const ALL_JOB_TITLES = [
  "sales_employee",
  "sales_manager",
  "hr_employee",
  "hr_manager",
  "finance_employee",
  "finance_manager",
  "developer",
  "designer",
  "content_writer",
  "seo_specialist",
  "project_manager",
] as const;

export type JobTitle = (typeof ALL_JOB_TITLES)[number];

// Helper function to get job titles for a department and role
export function getJobTitlesForDepartment(
  department: string,
  role: "employee" | "manager",
): readonly string[] {
  const deptConfig =
    DEPARTMENT_JOB_TITLES[department as keyof typeof DEPARTMENT_JOB_TITLES];
  if (!deptConfig) return [];
  return deptConfig[role] || [];
}

// Helper function to validate job title matches department
export function isValidJobTitleForDepartment(
  jobTitle: string,
  department: string,
  role: "employee" | "manager",
): boolean {
  const validTitles = getJobTitlesForDepartment(department, role);
  return validTitles.includes(jobTitle);
}
