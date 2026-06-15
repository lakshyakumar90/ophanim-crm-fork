import type { LeadStatus } from "@/types";
import { SALES_KANBAN_STATUSES } from "@/lib/kanban-contract";

export const ALL_COLUMNS = [
  { key: "leadName", label: "Lead Name" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "businessName", label: "Business Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "website", label: "Website" },
  { key: "country", label: "Country" },
  { key: "timezone", label: "Timezone" },
  { key: "createdAt", label: "Created" },
  { key: "leadType", label: "Lead Type" },
  { key: "nalReason", label: "NAL Reason" },
  { key: "clientResponse", label: "Client Response" },
];

export const DEFAULT_COLUMNS = [
  "leadName",
  "email",
  "phone",
  "companyName",
  "status",
  "createdAt",
];

export const KANBAN_STATUSES: LeadStatus[] = SALES_KANBAN_STATUSES;
