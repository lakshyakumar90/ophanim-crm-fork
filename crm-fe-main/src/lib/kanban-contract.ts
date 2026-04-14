import type { LeadStatus } from "@/types";

// Non-regression contract for Sales Leads Kanban.
// Do not change these values without a dedicated migration plan.
export const SALES_KANBAN_STATUSES: LeadStatus[] = [
  "fresh_lead",
  "hot_lead",
  "cold_lead",
  "did_not_pick",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "future_lead",
  "not_interested",
  "not_a_lead",
];

export const SALES_KANBAN_DEFAULT_LIMIT = 100;
export const SALES_KANBAN_LOAD_MORE_STEP = 100;
