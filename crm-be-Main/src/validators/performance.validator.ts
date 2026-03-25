import { z } from "zod";

export const performanceCycleIdParamSchema = z.object({
  id: z.string().uuid("Invalid review cycle ID"),
});

export const performanceReviewIdParamSchema = z.object({
  id: z.string().uuid("Invalid review ID"),
});

export const performanceCycleReviewsParamSchema = z.object({
  cycleId: z.string().uuid("Invalid review cycle ID"),
});

// ============================================================
// Review Cycle Schemas
// ============================================================

export const createReviewCycleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  scope: z.enum(["all", "department"]).default("all"),
  department_id: z.string().uuid().optional(),
  frequency: z.enum(["quarterly", "half_yearly", "annual"]).optional(),
  goal_setting_deadline: z.string().optional(),
  mid_checkin_date: z.string().optional(),
  self_assessment_deadline: z.string().optional(),
  manager_review_deadline: z.string().optional(),
  calibration_deadline: z.string().optional(),
  results_release_date: z.string().optional(),
});

export const updateReviewCycleSchema = createReviewCycleSchema.partial().extend({
  status: z.enum(["draft", "active", "completed"]).optional(),
});

// ============================================================
// Goal Schemas
// ============================================================

export const goalSchema = z.object({
  title: z.string().min(1),
  kpi: z.string().optional(),
  target: z.string().optional(),
  weight: z.number().min(0).max(100).optional(),
});

export const setGoalsSchema = z.object({
  goals: z.array(goalSchema).min(1, "At least one goal is required"),
});

// ============================================================
// Mid-Cycle Checkin
// ============================================================

export const midCycleCheckinSchema = z.object({
  progress_notes: z.string().optional(),
  manager_comments: z.string().optional(),
});

// ============================================================
// Self Assessment
// ============================================================

export const selfAssessmentSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  achievements: z.string().optional(),
  blockers: z.string().optional(),
  goal_self_ratings: z
    .array(
      z.object({
        goal_index: z.number().int().nonnegative(),
        self_rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .optional(),
});

// ============================================================
// Manager Review
// ============================================================

export const managerReviewSchema = z.object({
  overall_rating: z.enum(["exceptional", "exceeds", "meets", "below", "unsatisfactory"]),
  comments: z.string().min(1, "Comments are required"),
  increment_recommended: z.boolean().optional(),
  promotion_flag: z.boolean().optional(),
  goal_manager_ratings: z
    .array(
      z.object({
        goal_index: z.number().int().nonnegative(),
        manager_rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .optional(),
});

// ============================================================
// Peer Feedback
// ============================================================

export const peerFeedbackSchema = z.object({
  dimension: z.enum(["collaboration", "communication", "delivery", "reliability"]),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// ============================================================
// Calibration
// ============================================================

export const calibrationSchema = z.object({
  adjustments: z.array(
    z.object({
      review_id: z.string().uuid(),
      calibrated_rating: z.enum([
        "exceptional",
        "exceeds",
        "meets",
        "below",
        "unsatisfactory",
      ]),
      pip_triggered: z.boolean().optional(),
      notes: z.string().optional(),
    }),
  ),
});

export const directorApprovalSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const reviewAcknowledgementSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const performanceCyclesQuerySchema = z.object({
  status: z.enum(["draft", "active", "completed"]).optional(),
});

export const performanceAnalyticsQuerySchema = z.object({
  cycle_id: z.string().uuid().optional(),
  status: z
    .enum(["draft", "self_submitted", "manager_submitted", "calibrated", "director_approved", "released"])
    .optional(),
});
