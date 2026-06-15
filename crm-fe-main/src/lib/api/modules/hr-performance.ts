import { api } from "@/lib/api";
import type {
  ReviewCycleRow,
  PerformanceReviewRow,
  PerformanceAnalytics,
  HRPerformanceAnalytics,
  PeerFeedbackTarget,
  PeerDimension,
  PerformanceReminderCounts,
} from "@/types/performance";

type Envelope<T> = { success?: boolean; data: T };

function unwrap<T>(res: { data: Envelope<T> }): T {
  return res.data.data;
}

export async function fetchPerformanceCycles(params?: {
  status?: "draft" | "active" | "completed";
}): Promise<ReviewCycleRow[]> {
  const res = await api.get<Envelope<ReviewCycleRow[]>>("/performance/cycles", { params });
  return unwrap(res);
}

export async function fetchPerformanceCycle(id: string): Promise<ReviewCycleRow> {
  const res = await api.get<Envelope<ReviewCycleRow>>(`/performance/cycles/${id}`);
  return unwrap(res);
}

export async function createPerformanceCycle(body: Record<string, unknown>): Promise<ReviewCycleRow> {
  const res = await api.post<Envelope<ReviewCycleRow>>("/performance/cycles", body);
  return unwrap(res);
}

export async function updatePerformanceCycle(
  id: string,
  body: Record<string, unknown>,
): Promise<ReviewCycleRow> {
  const res = await api.put<Envelope<ReviewCycleRow>>(`/performance/cycles/${id}`, body);
  return unwrap(res);
}

export async function deletePerformanceCycle(id: string): Promise<{ message: string }> {
  const res = await api.delete<Envelope<{ message: string }>>(`/performance/cycles/${id}`);
  return unwrap(res);
}

export async function fetchCycleReviews(cycleId: string): Promise<PerformanceReviewRow[]> {
  const res = await api.get<Envelope<PerformanceReviewRow[]>>(
    `/performance/cycles/${cycleId}/reviews`,
  );
  return unwrap(res);
}

export async function fetchPerformanceReview(id: string): Promise<PerformanceReviewRow> {
  const res = await api.get<Envelope<PerformanceReviewRow>>(`/performance/reviews/${id}`);
  return unwrap(res);
}

export async function fetchPeerFeedbackSubmissions(reviewId: string): Promise<unknown[]> {
  const res = await api.get<Envelope<unknown[]>>(
    `/performance/reviews/${reviewId}/peer-feedback-submissions`,
  );
  return unwrap(res);
}

export async function fetchMyPerformanceReviews(): Promise<PerformanceReviewRow[]> {
  const res = await api.get<Envelope<PerformanceReviewRow[]>>("/performance/reviews/me");
  return unwrap(res);
}

export async function fetchPeerFeedbackTargets(): Promise<PeerFeedbackTarget[]> {
  const res = await api.get<Envelope<PeerFeedbackTarget[]>>("/performance/peer-feedback/targets");
  return unwrap(res);
}

export async function fetchPerformanceReminderCounts(): Promise<PerformanceReminderCounts> {
  const res = await api.get<Envelope<PerformanceReminderCounts>>("/performance/reminder-counts");
  return unwrap(res);
}

export async function setPerformanceGoals(reviewId: string, goals: unknown[]): Promise<PerformanceReviewRow> {
  const res = await api.post<Envelope<PerformanceReviewRow>>(`/performance/reviews/${reviewId}/goals`, {
    goals,
  });
  return unwrap(res);
}

export async function submitSelfAssessment(
  reviewId: string,
  body: Record<string, unknown>,
): Promise<PerformanceReviewRow> {
  const res = await api.post<Envelope<PerformanceReviewRow>>(
    `/performance/reviews/${reviewId}/self-assessment`,
    body,
  );
  return unwrap(res);
}

export async function submitManagerReview(
  reviewId: string,
  body: Record<string, unknown>,
): Promise<PerformanceReviewRow> {
  const res = await api.post<Envelope<PerformanceReviewRow>>(
    `/performance/reviews/${reviewId}/manager-review`,
    body,
  );
  return unwrap(res);
}

export async function submitPeerFeedbackDimension(
  reviewId: string,
  payload: { dimension: PeerDimension; score: number; comment?: string },
): Promise<{ success: boolean; message?: string }> {
  const res = await api.post<Envelope<{ success: boolean; message?: string }>>(
    `/performance/reviews/${reviewId}/peer-feedback`,
    payload,
  );
  return unwrap(res);
}

export async function runCalibration(
  cycleId: string,
  adjustments: Array<{
    review_id: string;
    calibrated_rating: string;
    pip_triggered?: boolean;
    notes?: string;
  }>,
): Promise<unknown[]> {
  const res = await api.post<Envelope<unknown[]>>(`/performance/cycles/${cycleId}/calibrate`, {
    adjustments,
  });
  return unwrap(res);
}

export async function approveCycleResults(
  cycleId: string,
  note?: string,
): Promise<{ approved: number }> {
  const res = await api.post<Envelope<{ approved: number }>>(
    `/performance/cycles/${cycleId}/approve`,
    note ? { note } : {},
  );
  return unwrap(res);
}

export async function releaseCycleResults(cycleId: string): Promise<{ released: number }> {
  const res = await api.post<Envelope<{ released: number }>>(
    `/performance/cycles/${cycleId}/release`,
  );
  return unwrap(res);
}

export async function acknowledgePerformanceReview(
  reviewId: string,
  note?: string,
): Promise<{ acknowledged: boolean; alreadyAcknowledged?: boolean }> {
  const res = await api.post<Envelope<{ acknowledged: boolean; alreadyAcknowledged?: boolean }>>(
    `/performance/reviews/${reviewId}/acknowledge`,
    note ? { note } : {},
  );
  return unwrap(res);
}

export async function fetchPerformanceAnalytics(cycleId?: string): Promise<PerformanceAnalytics> {
  const res = await api.get<Envelope<PerformanceAnalytics>>("/performance/analytics", {
    params: cycleId ? { cycle_id: cycleId } : undefined,
  });
  return unwrap(res);
}

export async function fetchHRPerformanceAnalytics(): Promise<HRPerformanceAnalytics> {
  const res = await api.get<Envelope<HRPerformanceAnalytics>>("/hr/analytics/performance");
  return unwrap(res);
}
