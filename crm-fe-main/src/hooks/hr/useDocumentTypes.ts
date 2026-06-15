import { useCallback, useState } from "react";
import {
  createDocumentType,
  fetchDocumentTypes,
  updateDocumentType,
} from "@/lib/hr-document-api";
import { toastHrError } from "@/lib/hr-error-toast";
import type { HrDocumentTypeDto } from "@/types/hr-documents";

export function useDocumentTypes() {
  const [types, setTypes] = useState<HrDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDocumentTypes(false);
      setTypes(rows);
      return rows;
    } catch (e) {
      toastHrError(e, "Failed to load document types");
      setTypes([]);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patchType = useCallback(
    async (id: string, body: Parameters<typeof updateDocumentType>[1]) => {
      const updated = await updateDocumentType(id, body);
      setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  const addType = useCallback(
    async (body: Parameters<typeof createDocumentType>[0]) => {
      const row = await createDocumentType(body);
      setTypes((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder));
      return row;
    },
    [],
  );

  return { types, setTypes, loading, load, patchType, addType };
}
