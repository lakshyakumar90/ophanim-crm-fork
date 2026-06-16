import { z } from "zod";
import { LEAD_STATUSES, LEAD_SOURCES } from "../../../config/constants.js";

const leadStatusEnum = z.enum([
  "fresh_lead",
  "hot_lead",
  "cold_lead",
  "meeting_scheduled",
  "did_not_pick",
  "follow_up",
  "future_lead",
  "not_interested",
  "not_a_lead",
  "won",
  "proposal_sent",
]);

const leadSourceEnum = z.enum([
  "website",
  "referral",
  "cold_call",
  "email_campaign",
  "social_media",
  "trade_show",
  "advertisement",
  "partner",
  "organic_search",
  "paid_search",
  "direct",
  "other",
]);

// Create lead
// Create lead schema
export const createLeadSchema = z.object({
  leadName: z.string().min(1, "Name is required").max(100),
  businessName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url().optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  nalReason: z.string().optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  clientResponse: z.string().optional().nullable(),
  leadType: z.string().max(100).optional().nullable(),
  // System/Status
  status: leadStatusEnum.default("fresh_lead"),
  assignedTo: z.string().uuid().optional().nullable(),
});

// Update lead
export const updateLeadSchema = createLeadSchema.partial();

// Lead list query
export const leadListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  assigned: z.enum(["assigned", "unassigned"]).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// Assign lead
export const assignLeadSchema = z.object({
  assignTo: z.string().uuid("Invalid user ID"),
  reason: z.string().max(500).optional(),
});

// Bulk assign
export const bulkAssignSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  assignTo: z.string().uuid("Invalid user ID"),
  reason: z.string().max(500).optional(),
});

// Bulk update
export const bulkUpdateLeadsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  data: updateLeadSchema,
});

// Bulk delete
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

// Lead activity
export const createActivitySchema = z.object({
  activityType: z.enum([
    "call",
    "email",
    "meeting",
    "note",
    "status_change",
    "assignment",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  outcome: z.string().max(500).optional().nullable(),
  nextAction: z.string().max(500).optional().nullable(),
});

// Change status (for employees)
export const changeStatusSchema = z.object({
  status: leadStatusEnum,
  reason: z.string().max(500).optional(),
});

// Lead comments
export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
});

export const createLeadReminderSchema = z.object({
  reminderAt: z
    .string()
    .datetime({ message: "reminderAt must be a valid ISO datetime string" }),
  note: z.string().max(500).optional().nullable(),
});

// Types
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;
export type BulkUpdateLeadsInput = z.infer<typeof bulkUpdateLeadsSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateLeadReminderInput = z.infer<typeof createLeadReminderSchema>;

// Param schema for routes that need both :id (lead) and :commentId
export const leadCommentParamSchema = z.object({
  id: z.string().uuid("Invalid lead ID format"),
  commentId: z.string().uuid("Invalid comment ID format"),
});

const convertProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  managerId: z.string().uuid().optional(),
  clientName: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  teamMembers: z
    .array(
      z.object({
        userId: z.string().uuid(),
        role: z.string().min(1),
      }),
    )
    .optional(),
});

const convertInvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0).optional(),
});

const convertInvoiceSchema = z.object({
  client_name: z.string().optional(),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  due_date: z.string().optional(),
  currency: z.enum(["USD", "CAD", "GBP", "EUR", "INR"]).optional(),
  status: z
    .enum(["draft", "pending_approval", "sent", "paid", "overdue", "cancelled"])
    .optional(),
  notes: z.string().optional(),
  department_id: z.string().uuid().optional(),
  line_items: z.array(convertInvoiceLineSchema).optional(),
});

export const convertLeadSchema = z
  .object({
    createInvoice: z.boolean().optional(),
    invoice: convertInvoiceSchema.optional(),
    createProject: z.boolean().optional(),
    project: convertProjectSchema.optional(),
    notifyFinance: z.boolean().optional(),
    notifyPM: z.boolean().optional(),
  })
  .refine((data) => data.createInvoice || data.createProject, {
    message: "At least one of createInvoice or createProject must be true",
  });

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
