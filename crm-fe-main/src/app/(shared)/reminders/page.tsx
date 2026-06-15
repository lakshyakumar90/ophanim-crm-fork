"use client";

import { useRemindersPage } from "@/hooks/shared/useRemindersPage";
import { RemindersFilters } from "@/components/reminders/RemindersFilters";
import { TaskRemindersSection } from "@/components/reminders/TaskRemindersSection";
import { LeadRemindersSection } from "@/components/reminders/LeadRemindersSection";

export default function RemindersPage() {
  const state = useRemindersPage();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">Task and lead reminders across the CRM.</p>
        </div>
        <RemindersFilters {...state} />
      </div>

      {state.showTasks && <TaskRemindersSection {...state} />}
      {state.showLeads && <LeadRemindersSection {...state} />}
    </div>
  );
}
