// Application Constants

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 10000,
} as const;

// Bulk Operations
export const BULK_LIMITS = {
  MAX_RECORDS: parseInt(process.env.BULK_OPERATION_LIMIT || "10000"),
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
  COLD_LEAD: "cold_lead",
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
  "cold_lead",
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

// Departments — values must match the `slug` column in the departments table exactly
export const DEPARTMENTS = {
  SALES: "sales",
  HR: "hr",
  FINANCE: "finance",
  PROJECT_MANAGEMENT: "project-management", // DB slug uses hyphen, not underscore
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
    manager: ["hr_manager", "hr_director"],
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
  "hr_director",
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

// Shift Types
export const SHIFT_TYPES = {
  DAY_SHIFT: "day_shift",
  NIGHT_SHIFT: "night_shift",
} as const;

export type ShiftType = (typeof SHIFT_TYPES)[keyof typeof SHIFT_TYPES];

// ============================================================
// HR MODULE CONSTANTS
// ============================================================

// Candidate Pipeline Stages
export const CANDIDATE_STAGES = {
  APPLIED: "applied",
  SCREENED: "screened",
  INTERVIEW_R1: "interview_r1",
  INTERVIEW_R2: "interview_r2",
  HR_ROUND: "hr_round",
  OFFER_SENT: "offer_sent",
  HIRED: "hired",
  REJECTED: "rejected",
  ON_HOLD: "on_hold",
} as const;

export type CandidateStage = (typeof CANDIDATE_STAGES)[keyof typeof CANDIDATE_STAGES];

export const CANDIDATE_STAGE_ORDER: CandidateStage[] = [
  "applied", "screened", "interview_r1", "interview_r2",
  "hr_round", "offer_sent", "hired",
];

// Candidate Sources
export const CANDIDATE_SOURCES = {
  REFERRAL: "referral",
  JOB_BOARD: "job_board",
  DIRECT: "direct",
  AGENCY: "agency",
} as const;

export type CandidateSource = (typeof CANDIDATE_SOURCES)[keyof typeof CANDIDATE_SOURCES];

// Interview Types
export const INTERVIEW_TYPES = {
  VIDEO: "video",
  IN_PERSON: "in_person",
  PHONE: "phone",
} as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[keyof typeof INTERVIEW_TYPES];

// Offer Response
export const OFFER_RESPONSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type OfferResponse = (typeof OFFER_RESPONSES)[keyof typeof OFFER_RESPONSES];

// Employment Types
export const EMPLOYMENT_TYPES = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  CONTRACT: "contract",
  INTERN: "intern",
} as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[keyof typeof EMPLOYMENT_TYPES];

// HR Employee Status
export const HR_EMPLOYEE_STATUSES = {
  ACTIVE: "active",
  PROBATION: "probation",
  ON_LEAVE: "on_leave",
  ARCHIVED: "archived",
} as const;

export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[keyof typeof HR_EMPLOYEE_STATUSES];

// Payroll Run Statuses
export const PAYROLL_STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  DISBURSED: "disbursed",
} as const;

export type PayrollStatus = (typeof PAYROLL_STATUSES)[keyof typeof PAYROLL_STATUSES];

// Job Posting Statuses
export const JOB_POSTING_STATUSES = {
  OPEN: "open",
  PAUSED: "paused",
  CLOSED: "closed",
} as const;

export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[keyof typeof JOB_POSTING_STATUSES];

// Review Cycle Frequencies
export const REVIEW_FREQUENCIES = {
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly",
  ANNUAL: "annual",
} as const;

export type ReviewFrequency = (typeof REVIEW_FREQUENCIES)[keyof typeof REVIEW_FREQUENCIES];

// Performance Ratings
export const PERFORMANCE_RATINGS = {
  EXCEPTIONAL: "exceptional",
  EXCEEDS: "exceeds",
  MEETS: "meets",
  BELOW: "below",
  UNSATISFACTORY: "unsatisfactory",
} as const;

export type PerformanceRating = (typeof PERFORMANCE_RATINGS)[keyof typeof PERFORMANCE_RATINGS];

// Review Statuses
export const REVIEW_STATUSES = {
  DRAFT: "draft",
  SELF_SUBMITTED: "self_submitted",
  MANAGER_SUBMITTED: "manager_submitted",
  CALIBRATED: "calibrated",
  DIRECTOR_APPROVED: "director_approved",
  RELEASED: "released",
} as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];

// Review Cycle Statuses
export const REVIEW_CYCLE_STATUSES = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export type ReviewCycleStatus = (typeof REVIEW_CYCLE_STATUSES)[keyof typeof REVIEW_CYCLE_STATUSES];

// Checklist Types
export const CHECKLIST_TYPES = {
  OFFBOARDING: "offboarding",
} as const;

export type ChecklistType = (typeof CHECKLIST_TYPES)[keyof typeof CHECKLIST_TYPES];

// Checklist Task Statuses
export const CHECKLIST_TASK_STATUSES = {
  PENDING: "pending",
  DONE: "done",
  OVERDUE: "overdue",
} as const;

export type ChecklistTaskStatus = (typeof CHECKLIST_TASK_STATUSES)[keyof typeof CHECKLIST_TASK_STATUSES];

// Increment Proposal Statuses
export const INCREMENT_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type IncrementStatus = (typeof INCREMENT_STATUSES)[keyof typeof INCREMENT_STATUSES];

// Peer Feedback Dimensions
export const PEER_FEEDBACK_DIMENSIONS = {
  COLLABORATION: "collaboration",
  COMMUNICATION: "communication",
  DELIVERY: "delivery",
  RELIABILITY: "reliability",
} as const;

export type PeerFeedbackDimension = (typeof PEER_FEEDBACK_DIMENSIONS)[keyof typeof PEER_FEEDBACK_DIMENSIONS];

// Exit Types
export const EXIT_TYPES = {
  RESIGNATION: "resignation",
  TERMINATION: "termination",
  CONTRACT_END: "contract_end",
} as const;

export type ExitType = (typeof EXIT_TYPES)[keyof typeof EXIT_TYPES];

// Exit Interview Reason Categories
export const EXIT_REASONS = {
  BETTER_OPPORTUNITY: "better_opportunity",
  COMPENSATION: "compensation",
  WORK_CULTURE: "work_culture",
  PERSONAL: "personal",
  RELOCATION: "relocation",
  OTHER: "other",
} as const;

export type ExitReason = (typeof EXIT_REASONS)[keyof typeof EXIT_REASONS];
