import { useCallback, useState } from "react";
import {
  fetchOnboardingTemplates,
  createOnboardingTemplate,
  updateOnboardingTemplate,
} from "@/lib/onboarding-api";
import type { OnboardingTemplate } from "@/types/onboarding";

export function useOnboardingTemplates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (params?: { type?: "onboarding" | "offboarding" }) => {
    setLoading(true);
    setError(null);
    try {
      return await fetchOnboardingTemplates(params);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load templates";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (body: Record<string, unknown>) => {
    return createOnboardingTemplate(body);
  }, []);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    return updateOnboardingTemplate(id, body);
  }, []);

  return { load, create, update, loading, error };
}

export type { OnboardingTemplate };
