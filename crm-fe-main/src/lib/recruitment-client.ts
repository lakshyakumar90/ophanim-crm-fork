import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  Candidate,
  CandidatesListResponse,
  JobPosting,
  RecruitmentMetrics,
  Interview,
} from "@/types/recruitment";

export function getRecruitmentErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  return getApiErrorMessage(err, {
    fallback,
    statusMessages: { 403: "You don't have permission to perform this action." },
    serverMessage: "Something went wrong. Please try again.",
  });
}

export async function fetchJobPostings(params?: {
  status?: string;
  department?: string;
  search?: string;
}): Promise<JobPosting[]> {
  const res = await api.get("/recruitment/job-postings", { params });
  const data = res.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  const res = await api.get(`/recruitment/job-postings/${id}`);
  return res.data?.data;
}

export async function createJobPosting(
  body: Record<string, unknown>,
): Promise<JobPosting> {
  const res = await api.post("/recruitment/job-postings", body);
  return res.data?.data;
}

export async function updateJobPosting(
  id: string,
  body: Record<string, unknown>,
): Promise<JobPosting> {
  const res = await api.put(`/recruitment/job-postings/${id}`, body);
  return res.data?.data;
}

export async function fetchRecruitmentMetrics(): Promise<RecruitmentMetrics> {
  const res = await api.get("/recruitment/metrics");
  return res.data?.data;
}

export function normalizeCandidatesList(payload: unknown): CandidatesListResponse {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as CandidatesListResponse).data)
  ) {
    return payload as CandidatesListResponse;
  }
  if (Array.isArray(payload)) {
    return {
      data: payload as Candidate[],
      total: payload.length,
      page: 1,
      limit: payload.length,
      totalPages: 1,
    };
  }
  return {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
}

export async function fetchCandidates(params: {
  job_posting_id?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CandidatesListResponse> {
  const res = await api.get("/recruitment/candidates", { params: { ...params, limit: params.limit ?? 500 } });
  return normalizeCandidatesList(res.data?.data);
}

export async function fetchCandidate(id: string): Promise<Candidate> {
  const res = await api.get(`/recruitment/candidates/${id}`);
  return res.data?.data;
}

export async function createCandidate(body: Record<string, unknown>): Promise<Candidate> {
  const res = await api.post("/recruitment/candidates", body);
  return res.data?.data;
}

export async function moveCandidateStage(
  id: string,
  stage: string,
  notes?: string,
): Promise<Candidate> {
  const res = await api.post(`/recruitment/candidates/${id}/move-stage`, {
    stage,
    notes,
  });
  return res.data?.data;
}

export async function fetchInterviews(candidateId: string): Promise<Interview[]> {
  const res = await api.get(`/recruitment/candidates/${candidateId}/interviews`);
  const data = res.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function scheduleInterview(
  candidateId: string,
  body: {
    round: number;
    interviewer_id: string;
    scheduled_at: string;
    interview_type: string;
  },
): Promise<Interview> {
  const res = await api.post(`/recruitment/candidates/${candidateId}/interviews`, body);
  return res.data?.data;
}

export async function updateInterview(
  id: string,
  body: Record<string, unknown>,
): Promise<Interview> {
  const res = await api.put(`/recruitment/interviews/${id}`, body);
  return res.data?.data;
}

export async function sendOffer(
  candidateId: string,
  body: { ctc: number; joining_date: string; designation: string },
): Promise<Candidate> {
  const res = await api.post(`/recruitment/candidates/${candidateId}/offer`, body);
  return res.data?.data;
}

export async function recordOfferResponse(
  candidateId: string,
  response: "accepted" | "declined",
): Promise<Candidate> {
  const res = await api.post(`/recruitment/candidates/${candidateId}/offer/respond`, {
    response,
  });
  return res.data?.data;
}

/** Average of interview ratings (1–5), using `rating` column */
export function averageInterviewRating(interviews: Interview[] | undefined | null): number | null {
  if (!interviews?.length) return null;
  const nums = interviews
    .map((i) => (typeof i.rating === "number" ? i.rating : typeof i.score === "number" ? i.score : null))
    .filter((n): n is number => n != null && !Number.isNaN(n));
  if (!nums.length) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}
