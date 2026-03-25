"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCandidates,
  fetchCandidate,
  createCandidate,
  moveCandidateStage,
  getRecruitmentErrorMessage,
} from "@/lib/recruitment-client";
import type { Candidate, CandidatesListResponse } from "@/types/recruitment";
import { toast } from "sonner";

export function useCandidatesForJob(jobPostingId: string | undefined) {
  const [result, setResult] = useState<CandidatesListResponse>({
    data: [],
    total: 0,
    page: 1,
    limit: 500,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(Boolean(jobPostingId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!jobPostingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandidates({ job_posting_id: jobPostingId, limit: 500 });
      setResult(data);
    } catch (e) {
      const msg = getRecruitmentErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [jobPostingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...result, loading, error, refresh };
}

export async function loadCandidateDetail(id: string): Promise<Candidate> {
  return fetchCandidate(id);
}

export async function createCandidateAction(body: Record<string, unknown>): Promise<Candidate> {
  try {
    const c = await createCandidate(body);
    toast.success("Candidate added");
    return c;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}

export async function moveCandidateStageAction(
  id: string,
  stage: string,
  notes?: string,
): Promise<Candidate> {
  try {
    const c = await moveCandidateStage(id, stage, notes);
    toast.success("Stage updated");
    return c;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}
