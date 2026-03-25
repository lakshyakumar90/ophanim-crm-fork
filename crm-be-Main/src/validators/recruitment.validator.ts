import { z } from "zod";

export const recruitmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const recruitmentCandidateIdParamSchema = z.object({
  id: z.string().uuid("Invalid candidate ID format"),
});

export const recruitmentInterviewIdParamSchema = z.object({
  id: z.string().uuid("Invalid interview ID format"),
});

// ============================================================
// Job Posting Schemas
// ============================================================

export const createJobPostingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().optional(),
  positions_open: z.number().int().positive().default(1),
  description: z.string().optional(),
  required_skills: z.array(z.string()).optional(),
  salary_range_min: z.number().positive().optional(),
  salary_range_max: z.number().positive().optional(),
  application_deadline: z.string().optional(), // ISO date string
  status: z.enum(["open", "paused", "closed"]).default("open"),
});

export const updateJobPostingSchema = createJobPostingSchema.partial().extend({
  status: z.enum(["open", "paused", "closed"]).optional(),
});

// ============================================================
// Candidate Schemas
// ============================================================

export const createCandidateSchema = z.object({
  job_posting_id: z.string().uuid().optional(),
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(["referral", "job_board", "direct", "agency"]).optional(),
  resume_url: z.string().url().optional(),
});

export const updateCandidateSchema = createCandidateSchema.partial();

export const moveCandidateStageSchema = z.object({
  stage: z.enum([
    "applied",
    "screened",
    "interview_r1",
    "interview_r2",
    "hr_round",
    "offer_sent",
    "hired",
    "rejected",
    "on_hold",
  ]),
  notes: z.string().optional(),
});

// ============================================================
// Interview Schemas
// ============================================================

export const createInterviewSchema = z.object({
  round: z.number().int().positive().default(1),
  interviewer_id: z.string().uuid(),
  scheduled_at: z.string(), // ISO datetime string
  interview_type: z.enum(["video", "in_person", "phone"]).default("video"),
});

export const updateInterviewSchema = z.object({
  interviewer_id: z.string().uuid().optional(),
  scheduled_at: z.string().optional(),
  interview_type: z.enum(["video", "in_person", "phone"]).optional(),
  feedback: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

// ============================================================
// Offer Letter Schema
// ============================================================

export const sendOfferSchema = z.object({
  ctc: z.number().positive("CTC is required"),
  joining_date: z.string().min(1, "Joining date is required"),
  designation: z.string().min(1, "Designation is required"),
});

export const recordOfferResponseSchema = z.object({
  response: z.enum(["accepted", "declined"]),
});

// ============================================================
// Query Schemas
// ============================================================

export const listCandidatesQuerySchema = z.object({
  job_posting_id: z.string().uuid().optional(),
  stage: z
    .enum([
      "applied",
      "screened",
      "interview_r1",
      "interview_r2",
      "hr_round",
      "offer_sent",
      "hired",
      "rejected",
      "on_hold",
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export const listJobPostingsQuerySchema = z.object({
  status: z.enum(["open", "paused", "closed"]).optional(),
  department: z.string().optional(),
  search: z.string().optional(),
});
