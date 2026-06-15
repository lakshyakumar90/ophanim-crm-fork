export function getReminderLeadId(reminder: unknown): string | undefined {
  const r = reminder as Record<string, unknown>;
  const lead = r.lead as { id?: string } | undefined;
  const leads = r.leads as { id?: string } | undefined;
  return (
    (r.leadId as string | undefined) ||
    (r.lead_id as string | undefined) ||
    lead?.id ||
    leads?.id
  );
}

export function getReminderAt(reminder: unknown): string | undefined {
  const r = reminder as Record<string, unknown>;
  return (r.reminderAt as string | undefined) || (r.reminder_at as string | undefined);
}
