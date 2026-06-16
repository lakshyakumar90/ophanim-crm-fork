import { z } from "zod";

const quoteStatusEnum = z.enum([
  "draft",
  "pending_approval",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export const quoteLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createQuoteSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(20).optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  quoteDate: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  paymentTerms: z.string().max(100).optional(),
  notes: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  lineItems: z.array(quoteLineItemSchema).min(1),
});

export const updateQuoteSchema = createQuoteSchema.partial();

export const quoteListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: quoteStatusEnum.optional(),
  leadId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;
