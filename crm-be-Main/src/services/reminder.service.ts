import { supabaseAdmin } from "../config/supabase.js";
import { nowIST, getTimestampIST } from "../utils/date-utils.js";

/**
 * Process lead reminders at multiple stages:
 * - 30 minutes before
 * - 5 minutes before
 * - At exact time
 * - Overdue (single notification)
 */
export async function processLeadReminders(): Promise<void> {
  const now = nowIST();
  const nowTimestamp = getTimestampIST();

  // Stage 1: 30 minutes before
  await processLeadReminder30Min(now, nowTimestamp);

  // Stage 2: 5 minutes before
  await processLeadReminder5Min(now, nowTimestamp);

  // Stage 3: At exact time
  await processLeadReminderAtTime(nowTimestamp);

  // Stage 4: Overdue (single notification)
  await processLeadReminderOverdue(now);
}

/**
 * Process lead reminders 30 minutes before
 * Only triggers for reminders that are 25-35 minutes away (30 min ± 5 min window)
 */
async function processLeadReminder30Min(
  now: Date,
  nowTimestamp: string,
): Promise<void> {
  // Define the window: reminders between 25 and 35 minutes from now
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000); // 35 min from now

  const { data: reminders, error } = await supabaseAdmin
    .from("lead_reminders")
    .select(
      "id, lead_id, user_id, reminder_at, note, sent_30min, leads:lead_id (lead_name)",
    )
    .eq("is_done", false)
    .eq("sent_30min", false)
    .gte("reminder_at", windowStart.toISOString()) // reminder_at >= 25 min from now
    .lte("reminder_at", windowEnd.toISOString()); // reminder_at <= 35 min from now

  if (error) {
    console.error(
      "[Reminder Service] Error fetching 30min lead reminders:",
      error,
    );
    return;
  }

  for (const reminder of (reminders || []) as any[]) {
    const leadName = reminder.leads?.lead_name || "Unknown Lead";

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: reminder.user_id,
        title: "Lead Reminder",
        message: `Reminder in 30 minutes: Follow up on "${leadName}"${reminder.note ? ` - ${reminder.note}` : ""}`,
        type: "lead_reminder",
        related_entity_type: "lead",
        related_entity_id: reminder.lead_id,
        priority: "medium",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create 30min notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("lead_reminders")
      .update({ sent_30min: true })
      .eq("id", reminder.id);

    console.log(`[Reminder Service] Sent 30min reminder for lead: ${leadName}`);
  }
}

/**
 * Process lead reminders 5 minutes before
 * Only triggers for reminders that are 0-10 minutes away (5 min ± 5 min window)
 */
async function processLeadReminder5Min(
  now: Date,
  nowTimestamp: string,
): Promise<void> {
  // Define the window: reminders between 0 and 10 minutes from now
  const windowStart = new Date(now.getTime()); // now
  const windowEnd = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now

  const { data: reminders, error } = await supabaseAdmin
    .from("lead_reminders")
    .select(
      "id, lead_id, user_id, reminder_at, note, sent_5min, leads:lead_id (lead_name)",
    )
    .eq("is_done", false)
    .eq("sent_5min", false)
    .eq("sent_30min", true) // Only send 5min after 30min was sent
    .gt("reminder_at", windowStart.toISOString()) // reminder_at > now
    .lte("reminder_at", windowEnd.toISOString()); // reminder_at <= 10 min from now

  if (error) {
    console.error(
      "[Reminder Service] Error fetching 5min lead reminders:",
      error,
    );
    return;
  }

  for (const reminder of (reminders || []) as any[]) {
    const leadName = reminder.leads?.lead_name || "Unknown Lead";

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: reminder.user_id,
        title: "Lead Reminder",
        message: `Reminder in 5 minutes: Follow up on "${leadName}"${reminder.note ? ` - ${reminder.note}` : ""}`,
        type: "lead_reminder",
        related_entity_type: "lead",
        related_entity_id: reminder.lead_id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create 5min notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("lead_reminders")
      .update({ sent_5min: true })
      .eq("id", reminder.id);

    console.log(`[Reminder Service] Sent 5min reminder for lead: ${leadName}`);
  }
}

/**
 * Process lead reminders at exact time
 */
async function processLeadReminderAtTime(nowTimestamp: string): Promise<void> {
  const { data: reminders, error } = await supabaseAdmin
    .from("lead_reminders")
    .select(
      "id, lead_id, user_id, reminder_at, note, sent_at_time, leads:lead_id (lead_name)",
    )
    .eq("is_done", false)
    .eq("sent_at_time", false)
    .lte("reminder_at", nowTimestamp);

  if (error) {
    console.error(
      "[Reminder Service] Error fetching at-time lead reminders:",
      error,
    );
    return;
  }

  for (const reminder of (reminders || []) as any[]) {
    const leadName = reminder.leads?.lead_name || "Unknown Lead";

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: reminder.user_id,
        title: "Lead Reminder - Now",
        message: `Time to follow up on "${leadName}"${reminder.note ? ` - ${reminder.note}` : ""}`,
        type: "lead_reminder",
        related_entity_type: "lead",
        related_entity_id: reminder.lead_id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create at-time notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("lead_reminders")
      .update({ sent_at_time: true, is_sent: true })
      .eq("id", reminder.id);

    console.log(
      `[Reminder Service] Sent at-time reminder for lead: ${leadName}`,
    );
  }
}

/**
 * Process overdue lead reminders (single notification)
 */
async function processLeadReminderOverdue(now: Date): Promise<void> {
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const { data: reminders, error } = await supabaseAdmin
    .from("lead_reminders")
    .select(
      "id, lead_id, user_id, reminder_at, note, sent_overdue, leads:lead_id (lead_name)",
    )
    .eq("is_done", false)
    .eq("sent_overdue", false)
    .eq("sent_at_time", true)
    .lte("reminder_at", fiveMinutesAgo);

  if (error) {
    console.error(
      "[Reminder Service] Error fetching overdue lead reminders:",
      error,
    );
    return;
  }

  for (const reminder of (reminders || []) as any[]) {
    const leadName = reminder.leads?.lead_name || "Unknown Lead";

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: reminder.user_id,
        title: "Lead Reminder - Overdue",
        message: `Overdue: Follow up on "${leadName}" was scheduled earlier${reminder.note ? ` - ${reminder.note}` : ""}`,
        type: "lead_reminder",
        related_entity_type: "lead",
        related_entity_id: reminder.lead_id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create overdue notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("lead_reminders")
      .update({ sent_overdue: true })
      .eq("id", reminder.id);

    console.log(
      `[Reminder Service] Sent overdue reminder for lead: ${leadName}`,
    );
  }
}

/**
 * Process task reminders at multiple stages
 */
export async function processTaskReminders(): Promise<void> {
  const now = nowIST();
  const nowTimestamp = getTimestampIST();

  // Stage 1: 30 minutes before
  await processTaskReminder30Min(now, nowTimestamp);

  // Stage 2: 5 minutes before
  await processTaskReminder5Min(now, nowTimestamp);

  // Stage 3: At exact time
  await processTaskReminderAtTime(nowTimestamp);

  // Stage 4: Overdue (single notification)
  await processTaskReminderOverdue(now);
}

/**
 * Process task reminders 30 minutes before
 */
async function processTaskReminder30Min(
  now: Date,
  nowTimestamp: string,
): Promise<void> {
  const targetTime = new Date(now.getTime() + 30 * 60 * 1000);

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, due_date, reminder_sent_30min")
    .eq("is_deleted", false)
    .eq("reminder_sent_30min", false)
    .not("due_date", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .lte("due_date", targetTime.toISOString())
    .gt("due_date", nowTimestamp);

  if (error) {
    console.error("[Reminder Service] Error fetching 30min tasks:", error);
    return;
  }

  for (const task of (tasks || []) as any[]) {
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: task.assigned_to,
        title: "Task Reminder",
        message: `Task due in 30 minutes: "${task.title}"`,
        type: "task_reminder",
        related_entity_type: "task",
        related_entity_id: task.id,
        priority: "medium",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create 30min task notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("tasks")
      .update({ reminder_sent_30min: true })
      .eq("id", task.id);

    console.log(
      `[Reminder Service] Sent 30min reminder for task: ${task.title}`,
    );
  }
}

/**
 * Process task reminders 5 minutes before
 */
async function processTaskReminder5Min(
  now: Date,
  nowTimestamp: string,
): Promise<void> {
  const targetTime = new Date(now.getTime() + 5 * 60 * 1000);

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, due_date, reminder_sent_5min")
    .eq("is_deleted", false)
    .eq("reminder_sent_5min", false)
    .not("due_date", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .lte("due_date", targetTime.toISOString())
    .gt("due_date", nowTimestamp);

  if (error) {
    console.error("[Reminder Service] Error fetching 5min tasks:", error);
    return;
  }

  for (const task of (tasks || []) as any[]) {
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: task.assigned_to,
        title: "Task Reminder",
        message: `Task due in 5 minutes: "${task.title}"`,
        type: "task_reminder",
        related_entity_type: "task",
        related_entity_id: task.id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create 5min task notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("tasks")
      .update({ reminder_sent_5min: true })
      .eq("id", task.id);

    console.log(
      `[Reminder Service] Sent 5min reminder for task: ${task.title}`,
    );
  }
}

/**
 * Process task reminders at exact time
 */
async function processTaskReminderAtTime(nowTimestamp: string): Promise<void> {
  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, due_date, reminder_sent_at_time")
    .eq("is_deleted", false)
    .eq("reminder_sent_at_time", false)
    .not("due_date", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .lte("due_date", nowTimestamp);

  if (error) {
    console.error("[Reminder Service] Error fetching at-time tasks:", error);
    return;
  }

  for (const task of (tasks || []) as any[]) {
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: task.assigned_to,
        title: "Task Due Now",
        message: `Task "${task.title}" is due now`,
        type: "task_reminder",
        related_entity_type: "task",
        related_entity_id: task.id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create at-time task notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("tasks")
      .update({ reminder_sent_at_time: true, reminder_sent: true })
      .eq("id", task.id);

    console.log(
      `[Reminder Service] Sent at-time reminder for task: ${task.title}`,
    );
  }
}

/**
 * Process overdue task reminders (single notification)
 */
async function processTaskReminderOverdue(now: Date): Promise<void> {
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, due_date, reminder_sent_overdue")
    .eq("is_deleted", false)
    .eq("reminder_sent_overdue", false)
    .eq("reminder_sent_at_time", true)
    .not("due_date", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .lte("due_date", fiveMinutesAgo);

  if (error) {
    console.error("[Reminder Service] Error fetching overdue tasks:", error);
    return;
  }

  for (const task of (tasks || []) as any[]) {
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: task.assigned_to,
        title: "Task Overdue",
        message: `Task "${task.title}" is overdue`,
        type: "task_reminder",
        related_entity_type: "task",
        related_entity_id: task.id,
        priority: "high",
      });

    if (notifError) {
      console.error(
        `[Reminder Service] Failed to create overdue task notification:`,
        notifError.message,
      );
      continue;
    }

    await supabaseAdmin
      .from("tasks")
      .update({ reminder_sent_overdue: true })
      .eq("id", task.id);

    console.log(
      `[Reminder Service] Sent overdue reminder for task: ${task.title}`,
    );
  }
}

/**
 * Start the reminder processing interval (for local development)
 * On Vercel, this is handled by cron jobs instead
 */
export function startReminderService(): void {
  console.log("[Reminder Service] Starting reminder service...");

  // Run immediately on startup
  processTaskReminders();
  processLeadReminders();

  // Then run every 5 minutes (matches Vercel cron schedule)
  setInterval(
    () => {
      processTaskReminders();
      processLeadReminders();
    },
    5 * 60 * 1000,
  );

  console.log("[Reminder Service] Reminder service started (runs every 5 min)");
}
