/**
 * Recruitment domain types — aligned with /api/v1/recruitment backend.
 */

export type JobPostingStatus = "open" | "paused" | "closed";

export interface PostedByUser {
  id?: string;
  full_name?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  positions_open: number;
  description: string | null;
  required_skills: string[] | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  application_deadline: string | null;
  status: JobPostingStatus;
  posted_by?: string | null;
  posted_by_user?: PostedByUser | null;
  created_at: string;
  updated_at: string;
}

export type PipelineStage =
  | "applied"
  | "screened"
  | "interview_r1"
  | "interview_r2"
  | "hr_round"
  | "offer_sent"
  | "hired"
  | "rejected"
  | "on_hold";

export type CandidateSource =
  | "referral"
  | "job_board"
  | "direct"
  | "agency";

export interface StageHistoryEntry {
  from_stage?: string;
  to_stage?: string;
  stage?: string;
  moved_by?: string | null;
  moved_at?: string;
  notes?: string | null;
}

export interface OfferPayload {
  ctc: number;
  joining_date: string;
  designation: string;
  sent_at: string;
  response: "pending" | "accepted" | "declined" | string;
  response_at?: string | null;
}

export interface Candidate {
  id: string;
  job_posting_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: CandidateSource | string | null;
  resume_url: string | null;
  stage: PipelineStage | string;
  applied_at: string;
  stage_history?: StageHistoryEntry[] | null;
  offer?: OfferPayload | null;
  converted_to_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  interviews?: Interview[];
  average_score?: number | null;
  job_postings?: { id: string; title: string } | null;
}

export interface CandidatesListResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type InterviewType = "video" | "in_person" | "phone";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export interface Interview {
  id: string;
  candidate_id: string;
  round: number;
  interviewer_id: string | null;
  scheduled_at: string | null;
  interview_type: InterviewType;
  feedback: string | null;
  rating: number | null;
  score?: number | null; // legacy / unused in DB
  status: InterviewStatus;
  created_at?: string;
  interviewer?: {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
}

export interface RecruitmentMetrics {
  openPositions: number;
  totalCandidates: number;
  stageDistribution: Record<string, number>;
  sourceEffectiveness: Record<string, { total: number; hired: number }>;
  totalHired: number;
  avgTimeToHireDays: number | null;
  offerAcceptanceRate: number | null;
}

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "applied", label: "Applied" },
  { id: "screened", label: "Screened" },
  { id: "interview_r1", label: "Interview R1" },
  { id: "interview_r2", label: "Interview R2" },
  { id: "hr_round", label: "HR round" },
  { id: "offer_sent", label: "Offer sent" },
  { id: "hired", label: "Hired" },
  { id: "rejected", label: "Rejected" },
  { id: "on_hold", label: "On hold" },
];

export const STAGE_ORDER: PipelineStage[] = PIPELINE_STAGES.map((s) => s.id);
