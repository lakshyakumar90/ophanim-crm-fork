import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";
import { getISTTimestamp } from "../../utils/date-utils.js";

// Types
export interface CreateEmailRequestInput {
  email_type: "invoice" | "payment_reminder" | "receipt" | "custom";
  invoice_id?: string;
  lead_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  attachments?: unknown[];
  scheduled_at?: string;
}

export interface EmailRequestFilters {
  status?: string;
  email_type?: string;
  sender_id?: string;
  invoice_id?: string;
}

/**
 * Get email requests with filtering
 */
export async function getEmailRequests(
  userId: string,
  role: string,
  filters: EmailRequestFilters = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("email_requests").select(
    `
      *,
      invoice:invoices(id, invoice_number, client_name),
      lead:leads(id, lead_name),
      sender:users!email_requests_sender_id_fkey(id, full_name, email),
      approver:users!email_requests_approved_by_fkey(id, full_name)
    `,
    { count: "exact" },
  );

  // Role-based filtering - employees see only their own
  if (role === "employee") {
    query = query.eq("sender_id", userId);
  }

  // Apply filters
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.email_type) {
    query = query.eq("email_type", filters.email_type);
  }
  if (filters.sender_id) {
    query = query.eq("sender_id", filters.sender_id);
  }
  if (filters.invoice_id) {
    query = query.eq("invoice_id", filters.invoice_id);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching email requests");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Get single email request
 */
export async function getEmailRequestById(requestId: string) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .select(
      `
      *,
      invoice:invoices(id, invoice_number, client_name, client_email, total_amount),
      lead:leads(id, lead_name, email),
      sender:users!email_requests_sender_id_fkey(id, full_name, email),
      approver:users!email_requests_approved_by_fkey(id, full_name)
    `,
    )
    .eq("id", requestId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create email request (draft)
 */
export async function createEmailRequest(
  input: CreateEmailRequestInput,
  senderId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .insert({
      email_type: input.email_type,
      invoice_id: input.invoice_id,
      lead_id: input.lead_id,
      sender_id: senderId,
      recipient_email: input.recipient_email,
      recipient_name: input.recipient_name,
      subject: input.subject,
      body: input.body,
      attachments: input.attachments || [],
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, "Error creating email request");
    throw error;
  }

  logger.info({ requestId: data.id, senderId }, "Email request created");
  return data;
}

/**
 * Update draft email request
 */
export async function updateEmailRequest(
  requestId: string,
  input: Partial<CreateEmailRequestInput>,
  userId: string,
) {
  // Check email request exists and is draft
  const { data: existing } = await supabaseAdmin
    .from("email_requests")
    .select("status, sender_id")
    .eq("id", requestId)
    .single();

  if (!existing) {
    throw new Error("Email request not found");
  }

  if (existing.status !== "draft") {
    throw new Error("Only draft email requests can be edited");
  }

  if (existing.sender_id !== userId) {
    throw new Error("You can only edit your own email requests");
  }

  const updateData: Record<string, unknown> = {};

  if (input.recipient_email) updateData.recipient_email = input.recipient_email;
  if (input.recipient_name !== undefined)
    updateData.recipient_name = input.recipient_name;
  if (input.subject) updateData.subject = input.subject;
  if (input.body) updateData.body = input.body;
  if (input.attachments) updateData.attachments = input.attachments;

  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update(updateData)
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Submit email request for approval
 */
export async function submitEmailRequestForApproval(
  requestId: string,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update({
      status: "pending_approval",
    })
    .eq("id", requestId)
    .eq("status", "draft")
    .eq("sender_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Email request not found or not in draft status");
  }

  // Create approval record
  await supabaseAdmin.from("finance_approvals").insert({
    approval_type: "email",
    entity_id: requestId,
    requested_by: userId,
  });

  logger.info({ requestId }, "Email request submitted for approval");
  return data;
}

/**
 * Approve email request (Manager/Admin only)
 */
export async function approveEmailRequest(
  requestId: string,
  approvedBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: getISTTimestamp(),
    })
    .eq("id", requestId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error || !data) {
    throw new Error("Email request not found or not pending approval");
  }

  // Update approval record
  await supabaseAdmin
    .from("finance_approvals")
    .update({
      status: "approved",
      reviewed_by: approvedBy,
      reviewed_at: getISTTimestamp(),
    })
    .eq("entity_id", requestId)
    .eq("approval_type", "email")
    .eq("status", "pending");

  logger.info({ requestId, approvedBy }, "Email request approved");
  return data;
}

/**
 * Reject email request (Manager/Admin only)
 */
export async function rejectEmailRequest(
  requestId: string,
  rejectedBy: string,
  reason: string,
) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", requestId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error || !data) {
    throw new Error("Email request not found or not pending approval");
  }

  // Update approval record
  await supabaseAdmin
    .from("finance_approvals")
    .update({
      status: "rejected",
      reviewed_by: rejectedBy,
      reviewed_at: getISTTimestamp(),
      comments: reason,
    })
    .eq("entity_id", requestId)
    .eq("approval_type", "email")
    .eq("status", "pending");

  logger.info({ requestId, rejectedBy, reason }, "Email request rejected");
  return data;
}

/**
 * Schedule approved email
 */
export async function scheduleEmail(
  requestId: string,
  scheduledFor: string,
  userId: string,
) {
  // Check email is approved and belongs to user
  const { data: existing } = await supabaseAdmin
    .from("email_requests")
    .select("status, sender_id")
    .eq("id", requestId)
    .single();

  if (!existing || existing.status !== "approved") {
    throw new Error("Email request not found or not approved");
  }

  if (existing.sender_id !== userId) {
    throw new Error("You can only schedule your own email requests");
  }

  // Update email request with scheduled time
  await supabaseAdmin
    .from("email_requests")
    .update({ scheduled_at: scheduledFor })
    .eq("id", requestId);

  // Create scheduled email record
  const { data, error } = await supabaseAdmin
    .from("scheduled_emails")
    .insert({
      email_request_id: requestId,
      scheduled_for: scheduledFor,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  logger.info({ requestId, scheduledFor }, "Email scheduled");
  return data;
}

/**
 * Mark email as sent
 */
export async function markEmailSent(requestId: string) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update({
      status: "sent",
      sent_at: getISTTimestamp(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Mark email as failed
 */
export async function markEmailFailed(requestId: string, errorMessage: string) {
  const { data, error } = await supabaseAdmin
    .from("email_requests")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
