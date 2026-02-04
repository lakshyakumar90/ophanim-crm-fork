// Application Constants - Mirroring backend/src/config/constants.ts
// This is the central source of truth for all constants in the frontend

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
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

// Lead Status UI Config (labels and colors for frontend display)
export interface StatusConfig {
  value: LeadStatus;
  label: string;
  color: string;
}

export const LEAD_STATUS_CONFIG: StatusConfig[] = [
  {
    value: "fresh_lead",
    label: "Fresh Lead",
    color: "bg-blue-100 text-blue-700",
  },
  { value: "hot_lead", label: "Hot Lead", color: "bg-red-100 text-red-700" },
  {
    value: "meeting_scheduled",
    label: "Meeting Scheduled",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "did_not_pick",
    label: "Did Not Pick",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "follow_up",
    label: "Follow Up",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "future_lead",
    label: "Future Lead",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "not_interested",
    label: "Not Interested",
    color: "bg-slate-100 text-slate-700",
  },
  {
    value: "not_a_lead",
    label: "Not A Lead",
    color: "bg-gray-100 text-gray-700",
  },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  {
    value: "proposal_sent",
    label: "Proposal Sent",
    color: "bg-amber-100 text-amber-700",
  },
];

// Helper functions for lead status
export const getStatusColor = (status: string): string => {
  const config = LEAD_STATUS_CONFIG.find((s) => s.value === status);
  return config?.color || "bg-gray-100 text-gray-700";
};

export const getStatusLabel = (status: string): string => {
  const config = LEAD_STATUS_CONFIG.find((s) => s.value === status);
  return config?.label || status?.replace(/_/g, " ") || "Unknown";
};

export const getAllStatuses = () => LEAD_STATUS_CONFIG;

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
