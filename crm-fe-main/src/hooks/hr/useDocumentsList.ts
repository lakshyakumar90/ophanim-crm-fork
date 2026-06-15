import { useCallback, useRef, useState } from "react";
import { fetchDocuments } from "@/lib/hr-document-api";
import type { EmployeeDocumentDto } from "@/types/hr-documents";

export const DOCUMENTS_LIST_STALE_MS = 30 * 60 * 1000;

export function useDocumentsList() {
  const [documents, setDocuments] = useState<EmployeeDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef(0);
  const documentsRef = useRef<EmployeeDocumentDto[]>([]);
  documentsRef.current = documents;

  const load = useCallback(async (params?: Parameters<typeof fetchDocuments>[0], force = false) => {
    const now = Date.now();
    if (
      !force &&
      documentsRef.current.length > 0 &&
      now - lastFetchAt.current < DOCUMENTS_LIST_STALE_MS
    ) {
      return documentsRef.current;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDocuments(params);
      setDocuments(rows);
      lastFetchAt.current = Date.now();
      return rows;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      setDocuments([]);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const bumpStale = useCallback(() => {
    lastFetchAt.current = 0;
  }, []);

  return { documents, setDocuments, loading, error, load, bumpStale };
}
