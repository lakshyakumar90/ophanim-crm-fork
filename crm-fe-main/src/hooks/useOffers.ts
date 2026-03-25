"use client";

import { sendOffer, recordOfferResponse, getRecruitmentErrorMessage } from "@/lib/recruitment-client";
import type { Candidate } from "@/types/recruitment";
import { toast } from "sonner";

export async function sendOfferAction(
  candidateId: string,
  body: { ctc: number; joining_date: string; designation: string },
): Promise<Candidate> {
  try {
    const c = await sendOffer(candidateId, body);
    toast.success("Offer sent");
    return c;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}

export async function recordOfferResponseAction(
  candidateId: string,
  response: "accepted" | "declined",
): Promise<Candidate> {
  try {
    const c = await recordOfferResponse(candidateId, response);
    if (response === "accepted") {
      toast.success("Offer accepted — user account and onboarding checklist created.");
    } else {
      toast.success("Offer declined — candidate marked as rejected.");
    }
    return c;
  } catch (e) {
    toast.error(getRecruitmentErrorMessage(e));
    throw e;
  }
}
