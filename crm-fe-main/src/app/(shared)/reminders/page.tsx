"use client";

import { useRemindersPage } from "@/hooks/shared/useRemindersPage";
import { RemindersFilters } from "@/components/reminders/RemindersFilters";
import { TaskRemindersSection } from "@/components/reminders/TaskRemindersSection";
import { LeadRemindersSection } from "@/components/reminders/LeadRemindersSection";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function RemindersPage() {
  const state = useRemindersPage();

  return (
    <ListPageLayout
      title="Reminders"
      description="Task and lead reminders across the CRM."
      breadcrumbs={[{ label: "Reminders" }]}
      filters={<RemindersFilters {...state} />}
    >
      <div className="space-y-6">
        {state.showTasks && <TaskRemindersSection {...state} />}
        {state.showLeads && <LeadRemindersSection {...state} />}
      </div>
    </ListPageLayout>
  );
}
