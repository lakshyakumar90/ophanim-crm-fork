import { useCallback, useState } from "react";
import { fetchDocumentStats } from "@/lib/hr-document-api";
import { toastHrError } from "@/lib/hr-error-toast";
import type { DocumentStatsDto } from "@/types/hr-documents";

export function useDocumentStats() {
  const [stats, setStats] = useState<DocumentStatsDto | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchDocumentStats();
      setStats(s);
      return s;
    } catch (e) {
      toastHrError(e, "Failed to load document stats");
      setStats(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, load };
}
