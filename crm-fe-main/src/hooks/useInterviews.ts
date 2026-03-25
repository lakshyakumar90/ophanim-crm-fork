"use client";

import {
  fetchInterviews,
  scheduleInterview,
  updateInterview,
  getRecruitmentErrorMessage,
} from "@/lib/recruitment-client";
import type { Interview } from "@/types/recruitment";
import { toast } from "sonner";

export async function loadInterviews(candidateId: string): Promise<Interview[]> {
  return fetchInterviews(candidateId);
}

export async function scheduleInterviewAction(
  candidateId: string,
  body: {
    round: number;
    interviewer_id: string;
    scheduled_at: string;
    interview_type: string;
  },
): Promise<Interview> {
  try {
    const row = await scheduleInterview(candidateId, body);
    toast.success("Interview scheduled");
    return row;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}

export async function updateInterviewAction(
  id: string,
  body: Record<string, unknown>,
): Promise<Interview> {
  try {
    const row = await updateInterview(id, body);
    toast.success("Interview updated");
    return row;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}
