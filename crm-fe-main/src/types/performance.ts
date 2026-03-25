/** Aligned with crm-be performance validators + service */

export type ReviewCycleStatus = "draft" | "active" | "completed";
export type ReviewCycleScope = "all" | "department";
export type ReviewStatus =
  | "draft"
  | "self_submitted"
  | "manager_submitted"
  | "calibrated"
  | "director_approved"
  | "released";
export type ReviewFrequency = "quarterly" | "half_yearly" | "annual";

export type CalibratedRating =
  | "exceptional"
  | "exceeds"
  | "meets"
  | "below"
  | "unsatisfactory";

export type OverallRating = CalibratedRating;

export type PeerDimension = "collaboration" | "communication" | "delivery" | "reliability";

export interface ReviewGoal {
  title: string;
  kpi?: string;
  target?: string;
  weight?: number;
  description?: string;
}

export interface PerformanceReviewRow {
  id: string;
  cycle_id: string;
  employee_id: string;
  manager_id: string | null;
  goals: ReviewGoal[] | null;
  self_assessment?: Record<string, unknown> | null;
  manager_review?: Record<string, unknown> | null;
  peer_feedback?: Array<{
    dimension: string;
    aggregated_score?: number;
    response_count?: number;
  }> | null;
  calibrated_rating?: string | null;
  pip_triggered?: boolean | null;
  status: ReviewStatus;
  acknowledged_at?: string | null;
  acknowledgement_note?: string | null;
  employee?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string | null;
    job_title?: string | null;
  } | null;
  manager?: { id: string; full_name?: string } | null;
  cycle?: ReviewCycleRow | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewCycleRow {
  id: string;
  name: string;
  scope: string;
  department_id?: string | null;
  frequency?: string | null;
  status: ReviewCycleStatus;
  goal_setting_deadline?: string | null;
  mid_checkin_date?: string | null;
  self_assessment_deadline?: string | null;
  manager_review_deadline?: string | null;
  calibration_deadline?: string | null;
  results_release_date?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_user?: { id: string; full_name?: string } | null;
}

export interface PerformanceAnalytics {
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  pipTriggered: number;
  highPerformers: number;
  completionRate: number;
}

export interface HRPerformanceAnalytics {
  activeReviewCycles: number;
  upcomingDeadlines: ReviewCycleRow[];
  reviewStatusDistribution: Array<{ status: string; count: number }>;
  pendingManagerReviews: number;
  pendingReviewsList: Array<{ id: string; employeeName: string; status: string }>;
}

export interface PerformanceReminderCounts {
  myReview: number;
  peerFeedback: number;
  total: number;
}

export interface PeerFeedbackTarget {
  id: string;
  cycle_id: string;
  status: string;
  employee?: {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
    job_title?: string | null;
  } | null;
}
