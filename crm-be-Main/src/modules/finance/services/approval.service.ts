import { supabaseAdmin } from "../../../config/supabase.js";
import { logger } from "../../../utils/logger.js";
import { getISTTimestamp } from "../../../utils/date-utils.js";

/**
 * Get pending approvals for Manager/Admin
 */
export async function getPendingApprovals(
  filters: { approval_type?: string } = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin
    .from("finance_approvals")
    .select(
      `
      *,
      requester:users!finance_approvals_requested_by_fkey(id, full_name, email)
    `,
      { count: "exact" },
    )
    .eq("status", "pending");

  if (filters.approval_type) {
    query = query.eq("approval_type", filters.approval_type);
  }

  query = query
    .order("requested_at", { ascending: true })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching pending approvals");
    throw error;
  }

  const approvals = data || [];

  // Batch entity lookups by type to avoid N+1 queries.
  const invoiceIds = [
    ...new Set(
      approvals
        .filter((approval) => approval.approval_type === "invoice")
        .map((approval) => approval.entity_id),
    ),
  ];
  const expenseIds = [
    ...new Set(
      approvals
        .filter((approval) => approval.approval_type === "expense")
        .map((approval) => approval.entity_id),
    ),
  ];
  const emailIds = [
    ...new Set(
      approvals
        .filter((approval) => approval.approval_type === "email")
        .map((approval) => approval.entity_id),
    ),
  ];

  const [{ data: invoices }, { data: expenses }, { data: emailRequests }] =
    await Promise.all([
      invoiceIds.length > 0
        ? supabaseAdmin
            .from("invoices")
            .select("id, invoice_number, client_name, total_amount, status")
            .in("id", invoiceIds)
        : Promise.resolve({ data: [] as any[] }),
      expenseIds.length > 0
        ? supabaseAdmin
            .from("expenses")
            .select(
              `
              id,
              expense_number,
              amount,
              description,
              status,
              category:expense_categories(name)
            `,
            )
            .in("id", expenseIds)
        : Promise.resolve({ data: [] as any[] }),
      emailIds.length > 0
        ? supabaseAdmin
            .from("email_requests")
            .select("id, subject, recipient_email, status, email_type")
            .in("id", emailIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const invoiceMap = new Map((invoices || []).map((row: any) => [row.id, row]));
  const expenseMap = new Map((expenses || []).map((row: any) => [row.id, row]));
  const emailMap = new Map((emailRequests || []).map((row: any) => [row.id, row]));

  const enrichedApprovals = approvals.map((approval) => {
    let entity: any = null;

    switch (approval.approval_type) {
      case "invoice":
        entity = invoiceMap.get(approval.entity_id) || null;
        break;
      case "expense":
        entity = expenseMap.get(approval.entity_id) || null;
        break;
      case "email":
        entity = emailMap.get(approval.entity_id) || null;
        break;
    }

    return {
      ...approval,
      entity,
    };
  });

  return { data: enrichedApprovals, total: count || 0 };
}

/**
 * Get pending approval count for dashboard badge
 */
export async function getPendingApprovalCount(approvalType?: string) {
  let query = supabaseAdmin
    .from("finance_approvals")
    .select("id", { count: "exact" })
    .eq("status", "pending");

  if (approvalType) {
    query = query.eq("approval_type", approvalType);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count || 0;
}

/**
 * Get approval history for an entity
 */
export async function getApprovalHistory(entityId: string) {
  const { data, error } = await supabaseAdmin
    .from("finance_approvals")
    .select(
      `
      *,
      requester:users!finance_approvals_requested_by_fkey(id, full_name),
      reviewer:users!finance_approvals_reviewed_by_fkey(id, full_name)
    `,
    )
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Bulk approve (Admin only - for their own items too)
 */
export async function bulkApprove(approvalIds: string[], approvedBy: string) {
  const results = {
    success: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  for (const approvalId of approvalIds) {
    try {
      const { data: approval } = await supabaseAdmin
        .from("finance_approvals")
        .select("*")
        .eq("id", approvalId)
        .eq("status", "pending")
        .single();

      if (!approval) {
        results.failed.push({
          id: approvalId,
          error: "Not found or not pending",
        });
        continue;
      }

      // Update approval record
      await supabaseAdmin
        .from("finance_approvals")
        .update({
          status: "approved",
          reviewed_by: approvedBy,
          reviewed_at: getISTTimestamp(),
        })
        .eq("id", approvalId);

      // Update the actual entity based on type
      switch (approval.approval_type) {
        case "invoice":
          await supabaseAdmin
            .from("invoices")
            .update({
              status: "sent",
              approved_by: approvedBy,
              approved_at: getISTTimestamp(),
              updated_at: getISTTimestamp(),
            })
            .eq("id", approval.entity_id);
          break;

        case "expense":
          await supabaseAdmin
            .from("expenses")
            .update({
              status: "approved",
              approved_by: approvedBy,
              approved_at: getISTTimestamp(),
              updated_at: getISTTimestamp(),
            })
            .eq("id", approval.entity_id);
          break;

        case "email":
          await supabaseAdmin
            .from("email_requests")
            .update({
              status: "approved",
              approved_by: approvedBy,
              approved_at: getISTTimestamp(),
            })
            .eq("id", approval.entity_id);
          break;
      }

      results.success.push(approvalId);
    } catch (error) {
      results.failed.push({ id: approvalId, error: String(error) });
    }
  }

  logger.info(
    {
      approvedBy,
      success: results.success.length,
      failed: results.failed.length,
    },
    "Bulk approval completed",
  );
  return results;
}
