import { useCallback, useState } from "react";
import {
  fetchOnboardingChecklists,
  fetchOnboardingChecklistById,
  fetchMyOnboardingChecklists,
} from "@/lib/onboarding-api";
import { normalizeChecklist } from "@/lib/onboarding-utils";
import type { OnboardingChecklist } from "@/types/onboarding";

export function useOnboardingChecklists() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadByType = useCallback(async (type?: "onboarding" | "offboarding") => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOnboardingChecklists(type);
      return rows.map(normalizeChecklist);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load checklists";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOne = useCallback(async (id: string): Promise<OnboardingChecklist | null> => {
    setLoading(true);
    setError(null);
    try {
      const row = await fetchOnboardingChecklistById(id);
      return normalizeChecklist(row);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load checklist";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loadByType, loadOne, loading, error };
}

export function useMyOnboardingChecklists() {
  const [data, setData] = useState<OnboardingChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyOnboardingChecklists();
      setData(rows.map(normalizeChecklist));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load your checklist");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load, setData };
}
