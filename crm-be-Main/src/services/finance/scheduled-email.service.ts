import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";
import { getISTTimestamp } from "../../utils/date-utils.js";
import * as userEmailService from "../user-email.service.js";

/**
 * Process scheduled emails that are due
 * This function should be called by a cron job every minute
 */
export async function processScheduledEmails() {
  const now = getISTTimestamp();

  // Get all pending scheduled emails that are due
  const { data: scheduledEmails, error } = await supabaseAdmin
    .from("scheduled_emails")
    .select(
      `
      *,
      email_request:email_requests(*)
    `,
    )
    .eq("status", "pending")
    .lte("scheduled_for", now);

  if (error) {
    logger.error({ error }, "Error fetching scheduled emails");
    return { processed: 0, errors: [] };
  }

  const results = {
    processed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const scheduled of scheduledEmails || []) {
    try {
      // Mark as processing
      await supabaseAdmin
        .from("scheduled_emails")
        .update({
          status: "processing",
          last_attempt_at: getISTTimestamp(),
          attempts: (scheduled.attempts || 0) + 1,
        })
        .eq("id", scheduled.id);

      const emailRequest = scheduled.email_request;

      if (!emailRequest) {
        throw new Error("Email request not found");
      }

      // Check if email request is still approved
      if (emailRequest.status !== "approved") {
        await supabaseAdmin
          .from("scheduled_emails")
          .update({ status: "cancelled" })
          .eq("id", scheduled.id);
        continue;
      }

      // Send email using sender's SMTP configuration
      const result = await userEmailService.sendUserEmail(
        emailRequest.sender_id,
        {
          to: emailRequest.recipient_email,
          toName: emailRequest.recipient_name,
          subject: emailRequest.subject,
          html: emailRequest.body,
          leadId: emailRequest.lead_id,
        },
      );

      if (result.success) {
        // Mark scheduled email as sent
        await supabaseAdmin
          .from("scheduled_emails")
          .update({ status: "sent" })
          .eq("id", scheduled.id);

        // Update email request
        await supabaseAdmin
          .from("email_requests")
          .update({
            status: "sent",
            sent_at: getISTTimestamp(),
          })
          .eq("id", emailRequest.id);

        results.processed++;
        logger.info(
          { scheduledId: scheduled.id, to: emailRequest.recipient_email },
          "Scheduled email sent",
        );
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      const errorMessage = String(error);

      // Check retry count
      if ((scheduled.attempts || 0) >= 3) {
        // Max retries reached, mark as failed
        await supabaseAdmin
          .from("scheduled_emails")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", scheduled.id);

        // Update email request
        await supabaseAdmin
          .from("email_requests")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", scheduled.email_request_id);

        results.errors.push({ id: scheduled.id, error: errorMessage });
      } else {
        // Reset to pending for retry
        await supabaseAdmin
          .from("scheduled_emails")
          .update({
            status: "pending",
            error_message: errorMessage,
          })
          .eq("id", scheduled.id);
      }

      logger.error(
        { scheduledId: scheduled.id, error: errorMessage },
        "Error sending scheduled email",
      );
    }
  }

  if (results.processed > 0 || results.errors.length > 0) {
    logger.info(
      { processed: results.processed, errors: results.errors.length },
      "Scheduled email processing completed",
    );
  }

  return results;
}

/**
 * Get upcoming scheduled emails
 */
export async function getUpcomingScheduledEmails(
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  const { data, error, count } = await supabaseAdmin
    .from("scheduled_emails")
    .select(
      `
      *,
      email_request:email_requests(
        id,
        email_type,
        recipient_email,
        recipient_name,
        subject,
        sender:users!email_requests_sender_id_fkey(id, full_name)
      )
    `,
      { count: "exact" },
    )
    .in("status", ["pending", "processing"])
    .order("scheduled_for", { ascending: true })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  if (error) {
    throw error;
  }

  return { data: data || [], total: count || 0 };
}

/**
 * Cancel scheduled email
 */
export async function cancelScheduledEmail(scheduledId: string) {
  const { data, error } = await supabaseAdmin
    .from("scheduled_emails")
    .update({ status: "cancelled" })
    .eq("id", scheduledId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    throw new Error("Scheduled email not found or cannot be cancelled");
  }

  logger.info({ scheduledId }, "Scheduled email cancelled");
  return data;
}

/**
 * Reschedule an email
 */
export async function rescheduleEmail(
  scheduledId: string,
  newScheduledFor: string,
) {
  const { data, error } = await supabaseAdmin
    .from("scheduled_emails")
    .update({
      scheduled_for: newScheduledFor,
      status: "pending",
      attempts: 0,
      error_message: null,
    })
    .eq("id", scheduledId)
    .in("status", ["pending", "failed"])
    .select()
    .single();

  if (error || !data) {
    throw new Error("Scheduled email not found or cannot be rescheduled");
  }

  // Update email request scheduled_at
  await supabaseAdmin
    .from("email_requests")
    .update({ scheduled_at: newScheduledFor })
    .eq("id", data.email_request_id);

  logger.info({ scheduledId, newScheduledFor }, "Email rescheduled");
  return data;
}
