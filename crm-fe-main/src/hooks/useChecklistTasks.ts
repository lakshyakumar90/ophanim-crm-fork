import { useCallback, useState } from "react";
import { updateOnboardingChecklistTask } from "@/lib/onboarding-api";
import { normalizeChecklist } from "@/lib/onboarding-utils";
import type { OnboardingChecklist } from "@/types/onboarding";

export function useChecklistTasks() {
  const [updating, setUpdating] = useState(false);

  const updateTask = useCallback(
    async (
      checklistId: string,
      taskIndex: number,
      body: { status: "pending" | "done" | "overdue"; notes?: string },
    ): Promise<OnboardingChecklist> => {
      setUpdating(true);
      try {
        const row = await updateOnboardingChecklistTask(checklistId, taskIndex, body);
        return normalizeChecklist(row);
      } finally {
        setUpdating(false);
      }
    },
    [],
  );

  return { updateTask, updating };
}
