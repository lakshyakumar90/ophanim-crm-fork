import { supabaseAdmin } from "../config/supabase.js";
import { nowIST, getTimestampIST } from "../utils/date-utils.js";

/**
 * Process task reminders
 * Checks for tasks that need reminder notifications and sends them
 */
export async function processTaskReminders(): Promise<void> {
  const now = nowIST();

  // Find tasks where:
  // - Has a due_date
  // - Has reminder_before_minutes set
  // - Reminder not yet sent
  // - Not deleted
  // - Not completed/cancelled
  // - Due date minus reminder_before_minutes <= now
  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, due_date, reminder_before_minutes")
    .eq("is_deleted", false)
    .eq("reminder_sent", false)
    .not("reminder_before_minutes", "is", null)
    .not("due_date", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled");

  if (error) {
    console.error("[Reminder Service] Error fetching tasks:", error);
    if ((error as any).cause) {
      console.error(
        "[Reminder Service] Fetch failure cause:",
        (error as any).cause,
      );
    }
    return;
  }

  for (const task of tasks || []) {
    const dueDate = new Date(task.due_date);
    const reminderTime = new Date(
      dueDate.getTime() - task.reminder_before_minutes * 60 * 1000,
    );

    // Check if it's time to send the reminder
    if (reminderTime <= now) {
      // Create notification
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: task.assigned_to,
          title: "Task Reminder",
          message: `Reminder: "${task.title}" is due ${getTimeDescription(
            task.reminder_before_minutes,
          )}`,
          type: "task_reminder",
          related_entity_type: "task",
          related_entity_id: task.id,
          priority: "high",
        });

      if (notifError) {
        console.error(
          `[Reminder Service] Failed to create notification for task ${task.id}:`,
          notifError.message,
        );
        continue;
      }

      // Mark reminder as sent
      await supabaseAdmin
        .from("tasks")
        .update({ reminder_sent: true })
        .eq("id", task.id);

      console.log(`[Reminder Service] Sent reminder for task: ${task.title}`);
    }
  }
}

/**
 * Process lead reminders
 * Checks for lead reminders that are due and sends notifications
 */
export async function processLeadReminders(): Promise<void> {
  const now = nowIST();

  // Find lead reminders that are due
  const { data: reminders, error } = await supabaseAdmin
    .from("lead_reminders")
    .select(
      "id, lead_id, user_id, reminder_at, note, leads:lead_id (lead_name)",
    )
    .eq("is_sent", false)
    .lte("reminder_at", getTimestampIST());

  if (error) {
    console.error("[Reminder Service] Error fetching lead reminders:", error);
    if ((error as any).cause) {
      console.error(
        "[Reminder Service] Fetch failure cause:",
        (error as any).cause,
      );
    }
    return;
  }

  for (const reminder of reminders || []) {
    const leadName = (reminder.leads as any)?.lead_name || "Unknown Lead";

    // Create notification
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: reminder.user_id,
        title: "Lead Reminder",
        message: reminder.note
          ? `Reminder for "${leadName}": ${reminder.note}`
          : `Reminder: Follow up on lead "${leadName}"`,
        type: "lead_reminder",
        related_entity_type: "lead",
        related_entity_id: reminder.lead_id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create notification for lead reminder ${reminder.id}:`,
        notifError.message,
      );
      continue;
    }

    // Mark reminder as sent
    await supabaseAdmin
      .from("lead_reminders")
      .update({ is_sent: true })
      .eq("id", reminder.id);

    console.log(`[Reminder Service] Sent reminder for lead: ${leadName}`);
  }
}

/**
 * Get human-readable time description
 */
function getTimeDescription(minutes: number): string {
  if (minutes < 60) return `in ${minutes} minutes`;
  if (minutes === 60) return "in 1 hour";
  if (minutes < 1440) return `in ${Math.round(minutes / 60)} hours`;
  if (minutes === 1440) return "tomorrow";
  return `in ${Math.round(minutes / 1440)} days`;
}

/**
 * Start the reminder processing interval
 * Runs every minute to check for pending reminders
 */
export function startReminderService(): void {
  console.log("[Reminder Service] Starting reminder service...");

  // Run immediately on startup
  processTaskReminders();
  processLeadReminders();

  // Then run every minute
  setInterval(() => {
    processTaskReminders();
    processLeadReminders();
  }, 60 * 1000); // 1 minute

  console.log("[Reminder Service] Reminder service started (runs every 1 min)");
}
