import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { USER_ROLES } from "../../../config/constants.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
} from "../../../utils/pagination.js";
import type { PaginatedResult, AuthUser } from "../../../types/api.types.js";
import type {
  CreateQuoteInput,
  UpdateQuoteInput,
  QuoteListQuery,
  QuoteLineItemInput,
} from "./quotes.validator.js";

interface QuoteLineItemRow {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  total: number;
  sort_order: number | null;
  created_at: string;
}

interface QuoteRow {
  id: string;
  quote_number: string;
  lead_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_address: string | null;
  quote_date: string;
  valid_until: string | null;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_rate: number | null;
  discount_amount: number | null;
  total_amount: number;
  status: string;
  payment_terms: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  department_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  lead?: { id: string; lead_name: string; business_name: string | null } | null;
  creator?: { id: string; full_name: string; email: string } | null;
}

function calculateLineTotal(item: QuoteLineItemInput): number {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function mapLineItem(row: QuoteLineItemRow) {
  return {
    id: row.id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxRate: row.tax_rate,
    total: Number(row.total),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapQuote(row: QuoteRow, lineItems: QuoteLineItemRow[] = []) {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    leadId: row.lead_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    clientAddress: row.client_address,
    quoteDate: row.quote_date,
    validUntil: row.valid_until,
    subtotal: Number(row.subtotal),
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    discountRate: row.discount_rate,
    discountAmount: row.discount_amount,
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentTerms: row.payment_terms,
    notes: row.notes,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    sentAt: row.sent_at,
    acceptedAt: row.accepted_at,
    departmentId: row.department_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lead: row.lead ?? null,
    creator: row.creator ?? null,
    lineItems: lineItems.map(mapLineItem),
  };
}

function applyQuoteScope(query: any, authUser: AuthUser) {
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    return query.eq("created_by", authUser.id);
  }
  if (authUser.role === USER_ROLES.MANAGER && authUser.departmentId) {
    return query.eq("department_id", authUser.departmentId);
  }
  return query;
}

async function getLineItems(quoteId: string): Promise<QuoteLineItemRow[]> {
  const { data, error } = await supabaseAdmin
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []) as QuoteLineItemRow[];
}

async function syncLineItems(quoteId: string, lineItems: QuoteLineItemInput[]) {
  await supabaseAdmin.from("quote_line_items").delete().eq("quote_id", quoteId);

  if (lineItems.length === 0) return;

  const rows = lineItems.map((item, index) => ({
    quote_id: quoteId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate ?? 0,
    total: calculateLineTotal(item),
    sort_order: item.sortOrder ?? index,
  }));

  const { error } = await supabaseAdmin.from("quote_line_items").insert(rows);
  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function getQuotes(
  query: QuoteListQuery,
  authUser: AuthUser,
): Promise<PaginatedResult<ReturnType<typeof mapQuote>>> {
  const pagination = parsePaginationParams(query);
  const { sortBy, ascending } = parseSortParams(
    query,
    ["created_at", "quote_date", "total_amount", "status"],
    "created_at",
  );

  let baseQuery = supabaseAdmin
    .from("quotes")
    .select(
      `
      *,
      lead:leads(id, lead_name, business_name),
      creator:users!quotes_created_by_fkey(id, full_name, email)
    `,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  baseQuery = applyQuoteScope(baseQuery, authUser);

  if (query.status) baseQuery = baseQuery.eq("status", query.status);
  if (query.leadId) baseQuery = baseQuery.eq("lead_id", query.leadId);
  if (query.search) {
    baseQuery = baseQuery.or(
      `client_name.ilike.%${query.search}%,quote_number.ilike.%${query.search}%`,
    );
  }

  const offset = calculateOffset(pagination);
  const { data, error, count } = await baseQuery
    .order(sortBy, { ascending })
    .range(offset, offset + pagination.limit - 1);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const quotes = await Promise.all(
    ((data || []) as QuoteRow[]).map(async (row) => {
      const lineItems = await getLineItems(row.id);
      return mapQuote(row, lineItems);
    }),
  );

  return {
    data: quotes,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

export async function getQuoteById(id: string, authUser?: AuthUser) {
  let query = supabaseAdmin
    .from("quotes")
    .select(
      `
      *,
      lead:leads(id, lead_name, business_name),
      creator:users!quotes_created_by_fkey(id, full_name, email)
    `,
    )
    .eq("id", id)
    .eq("is_deleted", false);

  if (authUser) {
    query = applyQuoteScope(query, authUser);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Quote not found");
  }

  const lineItems = await getLineItems(id);
  return mapQuote(data as QuoteRow, lineItems);
}

export async function createQuote(
  input: CreateQuoteInput,
  createdBy: string,
  departmentId: string | null,
) {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .insert({
      lead_id: input.leadId ?? null,
      client_name: input.clientName,
      client_email: input.clientEmail,
      client_phone: input.clientPhone ?? null,
      client_address: input.clientAddress ?? null,
      quote_date: input.quoteDate ?? new Date().toISOString().slice(0, 10),
      valid_until: input.validUntil ?? null,
      tax_rate: input.taxRate ?? 0,
      discount_rate: input.discountRate ?? 0,
      payment_terms: input.paymentTerms ?? "Net 30",
      notes: input.notes ?? null,
      status: "draft",
      created_by: createdBy,
      department_id: input.departmentId ?? departmentId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  await syncLineItems(data.id, input.lineItems);
  return getQuoteById(data.id);
}

export async function updateQuote(
  id: string,
  input: UpdateQuoteInput,
  authUser: AuthUser,
) {
  const existing = await getQuoteById(id, authUser);

  if (!["draft", "pending_approval"].includes(existing.status)) {
    throw new ApiError(
      ERROR_CODES.CONFLICT,
      "Only draft or pending quotes can be edited",
    );
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: getCurrentTimestamp(),
  };

  if (input.leadId !== undefined) updatePayload.lead_id = input.leadId;
  if (input.clientName !== undefined) updatePayload.client_name = input.clientName;
  if (input.clientEmail !== undefined) updatePayload.client_email = input.clientEmail;
  if (input.clientPhone !== undefined) updatePayload.client_phone = input.clientPhone;
  if (input.clientAddress !== undefined) updatePayload.client_address = input.clientAddress;
  if (input.quoteDate !== undefined) updatePayload.quote_date = input.quoteDate;
  if (input.validUntil !== undefined) updatePayload.valid_until = input.validUntil;
  if (input.taxRate !== undefined) updatePayload.tax_rate = input.taxRate;
  if (input.discountRate !== undefined) updatePayload.discount_rate = input.discountRate;
  if (input.paymentTerms !== undefined) updatePayload.payment_terms = input.paymentTerms;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.departmentId !== undefined) updatePayload.department_id = input.departmentId;

  const { error } = await supabaseAdmin
    .from("quotes")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (input.lineItems) {
    await syncLineItems(id, input.lineItems);
  }

  return getQuoteById(id, authUser);
}

export async function deleteQuote(id: string, authUser: AuthUser) {
  const existing = await getQuoteById(id, authUser);

  if (existing.status === "accepted") {
    throw new ApiError(ERROR_CODES.CONFLICT, "Accepted quotes cannot be deleted");
  }

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({ is_deleted: true, updated_at: getCurrentTimestamp() })
    .eq("id", id);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function sendQuote(id: string, authUser: AuthUser) {
  const quote = await getQuoteById(id, authUser);

  if (!["draft", "pending_approval"].includes(quote.status)) {
    throw new ApiError(ERROR_CODES.CONFLICT, "Quote cannot be sent in its current status");
  }

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({
      status: "sent",
      sent_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", id);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getQuoteById(id, authUser);
}

export async function acceptQuote(id: string, authUser: AuthUser) {
  const quote = await getQuoteById(id, authUser);

  if (quote.status !== "sent") {
    throw new ApiError(ERROR_CODES.CONFLICT, "Only sent quotes can be accepted");
  }

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: getCurrentTimestamp(),
      approved_by: authUser.id,
      approved_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", id);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getQuoteById(id, authUser);
}
