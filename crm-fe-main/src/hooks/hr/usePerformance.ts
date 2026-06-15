import { useCallback, useEffect, useState } from "react";
import * as perf from "@/lib/performance-api";
import type { ReviewCycleRow, PerformanceReviewRow, PerformanceAnalytics } from "@/types/performance";

export function useReviewCycles() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (params?: { status?: "draft" | "active" | "completed" }) => {
    setLoading(true);
    setError(null);
    try {
      return await perf.fetchPerformanceCycles(params);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load cycles";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (body: Record<string, unknown>) => {
    return perf.createPerformanceCycle(body);
  }, []);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    return perf.updatePerformanceCycle(id, body);
  }, []);

  return { load, create, update, loading, error };
}

export function useCycleDetail(cycleId: string | undefined) {
  const [cycle, setCycle] = useState<ReviewCycleRow | null>(null);
  const [reviews, setReviews] = useState<PerformanceReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!cycleId) {
      setLoading(false);
      setCycle(null);
      setReviews([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, r] = await Promise.all([
        perf.fetchPerformanceCycle(cycleId),
        perf.fetchCycleReviews(cycleId),
      ]);
      setCycle(c);
      setReviews(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load cycle");
      setCycle(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cycle, reviews, setReviews, loading, error, refresh };
}

export function usePerformanceReview(reviewId: string | null) {
  const [review, setReview] = useState<PerformanceReviewRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    try {
      const r = await perf.fetchPerformanceReview(reviewId);
      setReview(r);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  return { review, setReview, loading, load };
}

export function usePerformanceAnalytics() {
  const [data, setData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cycleId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await perf.fetchPerformanceAnalytics(cycleId);
      setData(d);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : "Analytics failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load };
}

export function useHRPerformanceAnalytics() {
  const [data, setData] = useState<Awaited<ReturnType<typeof perf.fetchHRPerformanceAnalytics>> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await perf.fetchHRPerformanceAnalytics();
      setData(d);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : "HR analytics failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load };
}
