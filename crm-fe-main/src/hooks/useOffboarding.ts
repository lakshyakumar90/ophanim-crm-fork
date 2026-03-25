import { useCallback, useState } from "react";
import {
  initiateOffboarding,
  submitExitInterview,
  archiveOffboardedEmployee,
} from "@/lib/onboarding-api";
import { normalizeChecklist } from "@/lib/onboarding-utils";
import type { OnboardingChecklist } from "@/types/onboarding";

export function useOffboarding() {
  const [busy, setBusy] = useState(false);

  const initiate = useCallback(
    async (
      employeeId: string,
      body: {
        resignation_date?: string;
        last_working_day: string;
        exit_type: "resignation" | "termination" | "contract_end";
        reason?: string;
      },
    ): Promise<OnboardingChecklist> => {
      setBusy(true);
      try {
        const row = await initiateOffboarding(employeeId, body);
        return normalizeChecklist(row);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const exitInterview = useCallback(
    async (checklistId: string, body: Record<string, unknown>): Promise<OnboardingChecklist> => {
      setBusy(true);
      try {
        const row = await submitExitInterview(checklistId, body);
        return normalizeChecklist(row);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const archive = useCallback(async (employeeId: string) => {
    setBusy(true);
    try {
      return await archiveOffboardedEmployee(employeeId);
    } finally {
      setBusy(false);
    }
  }, []);

  return { initiate, exitInterview, archive, busy };
}
