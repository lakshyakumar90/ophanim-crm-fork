import { useCallback, useState } from "react";
import { fetchOnboardingAnalytics } from "@/lib/onboarding-api";
import type { OnboardingAnalyticsResponse } from "@/types/onboarding";

export function useOnboardingAnalytics() {
  const [data, setData] = useState<OnboardingAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await fetchOnboardingAnalytics();
      if (row == null || typeof row !== "object") {
        throw new Error("Unexpected analytics response");
      }
      setData(row);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : "Analytics unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load, setError };
}
