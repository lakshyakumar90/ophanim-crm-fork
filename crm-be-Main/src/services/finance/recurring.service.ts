import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";
import { USER_ROLES } from "../../config/constants.js";
import { getISTDate, getISTTimestamp } from "../../utils/date-utils.js";

// Types
export interface CreateRecurringScheduleInput {
  name: string;
  lead_id?: string;
  client_name: string;
  client_email: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string;
  base_amount: number;
  tax_rate?: number;
  line_items_template: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  auto_send_email?: boolean;
  requires_approval?: boolean;
  department_id?: string;
}

/**
 * Get recurring schedules
 */
export async function getRecurringSchedules(
  userId: string,
  role: string,
  filters: { is_active?: boolean; lead_id?: string } = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  let query = supabaseAdmin.from("recurring_schedules").select(
    `
      *,
      lead:leads(id, lead_name, business_name),
      creator:users!recurring_schedules_created_by_fkey(id, full_name)
    `,
    { count: "exact" },
  );

  // Role-based filtering - employees see only schedules for their leads
  if (role === USER_ROLES.EMPLOYEE) {
    query = query.eq("lead.assigned_to", userId);
  }

  if (filters.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }
  if (filters.lead_id) {
    query = query.eq("lead_id", filters.lead_id);
  }

  query = query
    .order("next_run_date", { ascending: true })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, "Error fetching recurring schedules");
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Get single recurring schedule
 */
export async function getRecurringScheduleById(scheduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("recurring_schedules")
    .select(
      `
      *,
      lead:leads(id, lead_name, business_name, email),
      creator:users!recurring_schedules_created_by_fkey(id, full_name)
    `,
    )
    .eq("id", scheduleId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create recurring schedule (Manager/Admin only)
 */
export async function createRecurringSchedule(
  input: CreateRecurringScheduleInput,
  createdBy: string,
) {
  // Calculate next run date
  const nextRunDate = calculateNextRunDate(
    input.start_date,
    input.frequency,
    input.day_of_month,
    input.day_of_week,
  );

  const { data, error } = await supabaseAdmin
    .from("recurring_schedules")
    .insert({
      name: input.name,
      lead_id: input.lead_id,
      client_name: input.client_name,
      client_email: input.client_email,
      frequency: input.frequency,
      day_of_month: input.day_of_month,
      day_of_week: input.day_of_week,
      start_date: input.start_date,
      end_date: input.end_date,
      next_run_date: nextRunDate,
      base_amount: input.base_amount,
      tax_rate: input.tax_rate || 0,
      line_items_template: input.line_items_template,
      auto_send_email: input.auto_send_email || false,
      requires_approval: input.requires_approval !== false, // Default true
      department_id: input.department_id,
      created_by: createdBy,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, "Error creating recurring schedule");
    throw error;
  }

  logger.info(
    { scheduleId: data.id, name: input.name },
    "Recurring schedule created",
  );
  return data;
}

/**
 * Update recurring schedule
 */
export async function updateRecurringSchedule(
  scheduleId: string,
  input: Partial<CreateRecurringScheduleInput & { is_active: boolean }>,
  userId: string,
) {
  const updateData: Record<string, unknown> = {
    updated_at: getISTTimestamp(),
  };

  if (input.name) updateData.name = input.name;
  if (input.client_name) updateData.client_name = input.client_name;
  if (input.client_email) updateData.client_email = input.client_email;
  if (input.frequency) updateData.frequency = input.frequency;
  if (input.day_of_month !== undefined)
    updateData.day_of_month = input.day_of_month;
  if (input.day_of_week !== undefined)
    updateData.day_of_week = input.day_of_week;
  if (input.end_date !== undefined) updateData.end_date = input.end_date;
  if (input.base_amount !== undefined)
    updateData.base_amount = input.base_amount;
  if (input.tax_rate !== undefined) updateData.tax_rate = input.tax_rate;
  if (input.line_items_template)
    updateData.line_items_template = input.line_items_template;
  if (input.auto_send_email !== undefined)
    updateData.auto_send_email = input.auto_send_email;
  if (input.requires_approval !== undefined)
    updateData.requires_approval = input.requires_approval;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabaseAdmin
    .from("recurring_schedules")
    .update(updateData)
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Pause recurring schedule
 */
export async function pauseRecurringSchedule(scheduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("recurring_schedules")
    .update({
      is_active: false,
      updated_at: getISTTimestamp(),
    })
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  logger.info({ scheduleId }, "Recurring schedule paused");
  return data;
}

/**
 * Resume recurring schedule
 */
export async function resumeRecurringSchedule(scheduleId: string) {
  // Get current schedule to recalculate next run date
  const { data: schedule } = await supabaseAdmin
    .from("recurring_schedules")
    .select("*")
    .eq("id", scheduleId)
    .single();

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  // Calculate next run date from today
  const nextRunDate = calculateNextRunDate(
    getISTDate(),
    schedule.frequency,
    schedule.day_of_month,
    schedule.day_of_week,
  );

  const { data, error } = await supabaseAdmin
    .from("recurring_schedules")
    .update({
      is_active: true,
      next_run_date: nextRunDate,
      updated_at: getISTTimestamp(),
    })
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  logger.info({ scheduleId }, "Recurring schedule resumed");
  return data;
}

/**
 * Delete recurring schedule (Admin only)
 */
export async function deleteRecurringSchedule(scheduleId: string) {
  const { error } = await supabaseAdmin
    .from("recurring_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    throw error;
  }

  logger.info({ scheduleId }, "Recurring schedule deleted");
}

/**
 * Calculate next run date based on frequency
 */
function calculateNextRunDate(
  fromDate: string,
  frequency: string,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
): string {
  const date = new Date(fromDate);
  const today = new Date(getISTDate());

  // Ensure we're calculating from today or later
  if (date < today) {
    date.setTime(today.getTime());
  }

  switch (frequency) {
    case "weekly":
      // Find next occurrence of dayOfWeek (0-6, Sunday-Saturday)
      const targetDay = dayOfWeek ?? 1; // Default Monday
      const currentDay = date.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      date.setDate(date.getDate() + daysUntilTarget);
      break;

    case "monthly":
      // Set to dayOfMonth, or next month if already passed
      const targetDate = dayOfMonth ?? 1;
      date.setDate(targetDate);
      if (date <= today) {
        date.setMonth(date.getMonth() + 1);
      }
      break;

    case "quarterly":
      // Every 3 months
      const quarterMonth = Math.ceil((date.getMonth() + 1) / 3) * 3;
      date.setMonth(quarterMonth);
      date.setDate(dayOfMonth ?? 1);
      if (date <= today) {
        date.setMonth(date.getMonth() + 3);
      }
      break;

    case "yearly":
      // Same date next year
      if (date <= today) {
        date.setFullYear(date.getFullYear() + 1);
      }
      break;
  }

  return date.toISOString().split("T")[0] as string;
}

/**
 * Process recurring invoices (called by cron job)
 */
export async function processRecurringInvoices() {
  const today = getISTDate();

  // Get all active schedules where next_run_date <= today
  const { data: schedules, error } = await supabaseAdmin
    .from("recurring_schedules")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (error) {
    logger.error({ error }, "Error fetching recurring schedules");
    return { processed: 0, errors: [] };
  }

  const results = {
    processed: 0,
    errors: [] as Array<{ scheduleId: string; error: string }>,
  };

  for (const schedule of schedules || []) {
    try {
      // Check if end_date has passed
      if (schedule.end_date && schedule.end_date < today) {
        await supabaseAdmin
          .from("recurring_schedules")
          .update({ is_active: false, updated_at: getISTTimestamp() })
          .eq("id", schedule.id);
        continue;
      }

      // Calculate totals from template
      const lineItems = (schedule.line_items_template as any[]) || [];
      const subtotal = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0,
      );
      const taxAmount = subtotal * ((schedule.tax_rate || 0) / 100);
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from("invoices")
        .insert({
          lead_id: schedule.lead_id,
          client_name: schedule.client_name,
          client_email: schedule.client_email,
          invoice_date: today,
          due_date: calculateDueDate(today, 30), // Net 30 default
          subtotal,
          tax_rate: schedule.tax_rate || 0,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "draft",
          is_recurring: true,
          recurring_schedule_id: schedule.id,
          department_id: schedule.department_id,
          created_by: schedule.created_by,
        })
        .select()
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      // Create line items
      if (lineItems.length > 0) {
        await supabaseAdmin.from("invoice_line_items").insert(
          lineItems.map((item, index) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            sort_order: index,
          })),
        );
      }

      // If auto_send_email is enabled, create email request
      if (schedule.auto_send_email) {
        const emailStatus = schedule.requires_approval
          ? "pending_approval"
          : "approved";

        const { data: emailRequest } = await supabaseAdmin
          .from("email_requests")
          .insert({
            email_type: "invoice",
            invoice_id: invoice.id,
            lead_id: schedule.lead_id,
            sender_id: schedule.created_by,
            recipient_email: schedule.client_email,
            recipient_name: schedule.client_name,
            subject: `Invoice ${invoice.invoice_number} from Your Company`,
            body: generateInvoiceEmailBody(invoice, schedule),
            status: emailStatus,
          })
          .select()
          .single();

        if (emailRequest && schedule.requires_approval) {
          await supabaseAdmin.from("finance_approvals").insert({
            approval_type: "email",
            entity_id: emailRequest.id,
            requested_by: schedule.created_by,
          });
        }
      }

      // Update next_run_date
      const nextRunDate = calculateNextRunDate(
        today,
        schedule.frequency,
        schedule.day_of_month,
        schedule.day_of_week,
      );

      await supabaseAdmin
        .from("recurring_schedules")
        .update({
          next_run_date: nextRunDate,
          updated_at: getISTTimestamp(),
        })
        .eq("id", schedule.id);

      results.processed++;
      logger.info(
        { scheduleId: schedule.id, invoiceId: invoice.id },
        "Recurring invoice generated",
      );
    } catch (error) {
      results.errors.push({
        scheduleId: schedule.id,
        error: String(error),
      });
      logger.error(
        { scheduleId: schedule.id, error },
        "Error processing recurring schedule",
      );
    }
  }

  logger.info(
    { processed: results.processed, errors: results.errors.length },
    "Recurring invoice processing completed",
  );
  return results;
}

function calculateDueDate(fromDate: string, days: number): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0] as string;
}

function generateInvoiceEmailBody(invoice: any, schedule: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Invoice ${invoice.invoice_number}</h1>
      <p>Dear ${schedule.client_name},</p>
      <p>Please find attached your invoice for this billing period.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        <p><strong>Amount Due:</strong> ₹${Number(invoice.total_amount).toLocaleString()}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
      </div>
      <p>Please make the payment by the due date to avoid any late fees.</p>
      <p>Thank you for your business!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message.</p>
    </div>
  `;
}
