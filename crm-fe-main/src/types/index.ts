// API Types matching backend
import type {
  LeadStatus as LeadStatusType,
  LeadSource as LeadSourceType,
} from "@/config/constants";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "employee";
  teamId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  themePreference?: string;
  primaryColor?: string;
  notificationPreferences?: Record<string, boolean>;
  departmentId?: string | null;
  departmentIds?: string[];                    // Multiple departments
  departmentName?: string | null;
  departmentSlug?: string | null;
  jobTitle?: string | null;
  is2faEnabled?: boolean;
  shiftType?: "day_shift" | "night_shift" | null;
  currentCtc?: number | null;
  salaryComponents?: {
    basic_pct?: number;
    hra_pct?: number;
    allowance_pct?: number;
  } | null;
  salaryBandId?: string | null;
  // RBAC permission system
  permissions?: string[];      // e.g. ["leads:view", "crm:admin"]
  roleIds?: string[];           // UUIDs of assigned dynamic roles
  roleNames?: string[];         // Display names of assigned roles
  isGlobal?: boolean;           // true if any assigned role has global scope
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Lead {
  id: string;
  leadName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  website: string | null;
  country: string | null;
  timezone: string | null;
  nalReason: string | null;
  source: string | null;
  clientResponse: string | null;
  leadType: string | null;
  industry: string | null;
  designation: string | null;
  leadValue: number | null;
  description: string | null;
  tags: string | null;
  status: LeadStatusType;
  assignedTo: string | null;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export type CreateLeadInput = Omit<Lead, "id" | "createdAt" | "updatedAt">;
export type UpdateLeadInput = Partial<CreateLeadInput>;

// Re-export from central config for convenience
export type LeadStatus = LeadStatusType;
export type LeadSource = LeadSourceType;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  taskType: string;
  relatedLeadId: string | null;
  projectId: string | null;
  assignedTo: string;
  assignedBy: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "completed" | "cancelled";
  dueDate: string | null;
  completedAt: string | null;
  tags: string[] | null;
  departmentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  reminderBeforeMinutes?: number | null;
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  assignedUser?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string;
  };
  createdByUser?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string;
  };
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number | null;
  breakDuration: number;
  status: "present" | "late" | "half_day" | "absent" | "leave" | "holiday";
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  managerId: string | null;
  description: string | null;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  actionUrl: string | null;
  priority: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
  };
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

// Dashboard types
export interface AdminDashboard {
  users: { total: number; active: number };
  leads: {
    total: number;
    newThisMonth: number;
    wonThisMonth: number;
    pipeline: Record<string, number>;
    sources?: Record<string, number>; // Added sources
  };
  revenue: { thisMonth: number };
  tasks: { total: number; pending: number; overdue: number };
  attendance: { presentToday: number };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  commentText: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  clientName: string | null;
  leadId: string | null;
  lead?: {
    id: string;
    leadName: string;
    businessName: string | null;
    status?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  managerId: string;
  status: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  allocationPercentage: number;
  joinedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}
