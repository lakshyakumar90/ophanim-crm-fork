import { useCallback, useState } from "react";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";

export function useEmployees() {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await fetchHrEmployees();
      setEmployees(list);
      return list;
    } catch {
      setEmployees([]);
      setError(
        "Unable to load employees. Please verify backend connectivity and try again.",
      );
      throw new Error("load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const patchEmployee = useCallback((id: string, partial: Partial<HREmployee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...partial } : e)));
  }, []);

  return { employees, setEmployees, loading, error, load, patchEmployee };
}
