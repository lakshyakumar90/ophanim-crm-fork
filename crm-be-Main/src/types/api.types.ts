import type { Request } from "express";
import type { UserRole } from "../config/constants.js";

// Authenticated user from JWT
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  departmentId: string | null;
}

// Extended Request with auth user and request ID
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  requestId: string;
}

// Standard API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
  requestId?: string;
}

// API Error structure
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Pagination with data
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// Sort options
export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// Common filter params
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Lead filters
export interface LeadFilters extends DateRangeFilter {
  status?: string | string[];
  source?: string | string[];
  assignedTo?: string;
  teamId?: string;
  departmentId?: string;
  search?: string;
  tags?: string[];
  minValue?: number;
  maxValue?: number;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
}

// Task filters
export interface TaskFilters extends DateRangeFilter {
  status?: string | string[];
  priority?: string | string[];
  assignedTo?: string;
  relatedLeadId?: string;
  departmentId?: string;
  overdue?: boolean;
  dueToday?: boolean;
}

// Department type
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

// Attendance filters
export interface AttendanceFilters extends DateRangeFilter {
  userId?: string;
  teamId?: string;
  status?: string | string[];
}

// User filters
export interface UserFilters {
  role?: string | string[];
  teamId?: string;
  isActive?: boolean;
  search?: string;
}

// Bulk operation request
export interface BulkUpdateRequest<T> {
  ids: string[];
  data: Partial<T>;
}

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkAssignRequest {
  ids: string[];
  assignTo: string;
  reason?: string;
}

// Token payloads
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  type: "access";
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  type: "refresh";
}

// Auth responses
export interface LoginResponse {
  requires2FA: boolean;
  userId?: string; // Only set when requires2FA is true
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    teamId: string | null;
    avatarUrl: string | null;
    themePreference?: string;
    primaryColor?: string;
    departmentId?: string | null;
    departmentSlug?: string;
    departmentName?: string;
    shiftType?: string | null;
  } | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Dashboard stats
export interface AdminDashboardStats {
  totalUsers: number;
  totalLeads: number;
  totalTasks: number;
  leadsToday: number;
  conversionRate: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  recentActivities: unknown[];
}

export interface ManagerDashboardStats {
  teamSize: number;
  teamLeads: number;
  teamTasks: number;
  teamConversionRate: number;
  teamLeadsByStatus: Record<string, number>;
  teamMemberPerformance: unknown[];
}

export interface EmployeeDashboardStats {
  myLeads: number;
  myTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  myLeadsByStatus: Record<string, number>;
  recentActivities: unknown[];
}
