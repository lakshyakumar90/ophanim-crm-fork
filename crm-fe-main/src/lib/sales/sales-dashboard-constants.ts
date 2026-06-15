import { LEAD_STATUS_CONFIG } from "@/config/constants";

export const PIPELINE_STAGES = LEAD_STATUS_CONFIG.map((s) => s.value);

export const PIPELINE_LABELS: Record<string, string> = LEAD_STATUS_CONFIG.reduce(
  (acc, s) => {
    acc[s.value] = s.label;
    return acc;
  },
  {} as Record<string, string>,
);

export const PIPELINE_COLORS: Record<string, string> = {
  fresh_lead: "#3b82f6",
  hot_lead: "#ef4444",
  cold_lead: "#06b6d4",
  meeting_scheduled: "#8b5cf6",
  did_not_pick: "#f59e0b",
  follow_up: "#6366f1",
  future_lead: "#0891b2",
  not_interested: "#64748b",
  not_a_lead: "#6b7280",
  won: "#22c55e",
  proposal_sent: "#f97316",
};

export const TOP_DEALS_PRIORITY_STATUSES = [
  "won",
  "meeting_scheduled",
  "proposal_sent",
  "hot_lead",
];

export const MAX_ACTIVITY_DISPLAY_COUNT = 1000;
export const MAX_CUSTOM_RANGE_DAYS = 365;

export const DATE_PRESETS = [
  { label: "Today", value: "0d", days: 0 },
  { label: "7 Days", value: "7d", days: 7 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
];
