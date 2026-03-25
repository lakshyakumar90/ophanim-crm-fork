import { useState, useCallback } from "react";
import { updateHrEmployee } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";
import { toastHrError } from "@/lib/hr-error-toast";
import { toast } from "sonner";

export function useBulkDeactivate() {
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const run = useCallback(
    async (
      ids: string[],
      employees: HREmployee[],
    ): Promise<{ ok: string[]; failed: { id: string; name: string }[] }> => {
      const ok: string[] = [];
      const failed: { id: string; name: string }[] = [];
      let i = 0;
      for (const id of ids) {
        i += 1;
        setProgress({ current: i, total: ids.length });
        const name = employees.find((e) => e.id === id)?.fullName || id;
        try {
          await updateHrEmployee(id, { isActive: false });
          ok.push(id);
        } catch {
          failed.push({ id, name });
        }
      }
      setProgress(null);
      return { ok, failed };
    },
    [],
  );

  return { progress, run };
}

export async function deactivateOne(id: string): Promise<void> {
  try {
    await updateHrEmployee(id, { isActive: false });
    toast.success("Account deactivated");
  } catch (e) {
    toastHrError(e, "Failed to deactivate");
    throw e;
  }
}

export async function activateOne(id: string): Promise<void> {
  try {
    await updateHrEmployee(id, { isActive: true });
    toast.success("Account reactivated");
  } catch (e) {
    toastHrError(e, "Failed to reactivate");
    throw e;
  }
}
