"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchJobPostings,
  fetchJobPosting,
  fetchRecruitmentMetrics,
  createJobPosting,
  updateJobPosting,
  getRecruitmentErrorMessage,
} from "@/lib/recruitment-client";
import type { JobPosting, RecruitmentMetrics } from "@/types/recruitment";
import { toast } from "sonner";

export function useJobPostingsList(filters: {
  status?: string;
  department?: string;
  search?: string;
}) {
  const { status, department, search } = filters;
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobPostings({
        status: status && status !== "all" ? status : undefined,
        department: department && department !== "all" ? department : undefined,
        search: search?.trim() || undefined,
      });
      setPostings(data);
    } catch (e) {
      const msg = getRecruitmentErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [status, department, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { postings, loading, error, refresh };
}

export function useJobPosting(id: string | undefined) {
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobPosting(id);
      setPosting(data);
    } catch (e) {
      const msg = getRecruitmentErrorMessage(e);
      setError(msg);
      setPosting(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posting, loading, error, refresh };
}

export function useRecruitmentMetricsWidget(enabled = true) {
  const [metrics, setMetrics] = useState<RecruitmentMetrics | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecruitmentMetrics();
      setMetrics(data);
    } catch (e) {
      const msg = getRecruitmentErrorMessage(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, loading, error, refresh };
}

export async function createJobPostingAction(
  body: Record<string, unknown>,
): Promise<JobPosting> {
  try {
    return await createJobPosting(body);
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}

export async function updateJobPostingAction(
  id: string,
  body: Record<string, unknown>,
): Promise<JobPosting> {
  try {
    const row = await updateJobPosting(id, body);
    toast.success("Job posting updated");
    return row;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}
