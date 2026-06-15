"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeadDetail } from "@/hooks/sales/useLeadDetail";
import { LeadHeader } from "@/components/sales/leads/detail/LeadHeader";
import { LeadStatusBar } from "@/components/sales/leads/detail/LeadStatusBar";
import { LeadDetailSkeleton } from "@/components/sales/leads/detail/LeadDetailSkeleton";
import { LeadInfoTab } from "@/components/sales/leads/detail/LeadInfoTab";
import { LeadActivityTab } from "@/components/sales/leads/detail/LeadActivityTab";
import { LeadDetailDialogs } from "@/components/sales/leads/detail/LeadDetailDialogs";

export default function LeadDetailPage() {
  const detail = useLeadDetail();
  const {
    id,
    router,
    isAdmin,
    lead,
    loadingLead,
    isDuplicateLead,
    refreshLeadData,
    createReminder,
    activities,
    loadingActivities,
    pendingReminders,
    isReminderOverdue,
    handleMarkReminderDone,
    handleStatusChange,
    isChangingStatus,
    canEditLead,
    setSelectedUserId,
    setIsReassignDialogOpen,
  } = detail;

  if (loadingLead) {
    return <LeadDetailSkeleton />;
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Lead not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/sales/leads`)}>
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <LeadHeader
          lead={lead}
          leadId={id as string}
          isAdmin={isAdmin}
          canEditLead={canEditLead}
          isDuplicateLead={isDuplicateLead}
          onOpenReassign={() => {
            setSelectedUserId(lead.assignedTo || "");
            setIsReassignDialogOpen(true);
          }}
          createReminder={createReminder}
          onRefresh={refreshLeadData}
        />

        <LeadStatusBar
          lead={lead}
          pendingReminders={pendingReminders}
          isReminderOverdue={isReminderOverdue}
          onMarkReminderDone={handleMarkReminderDone}
          onStatusChange={handleStatusChange}
          isChangingStatus={isChangingStatus}
        />

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="w-auto">
            <TabsTrigger value="info" className="flex-1 sm:flex-none">
              Info
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex-1 sm:flex-none">
              Activities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <LeadInfoTab detail={detail} lead={lead} />
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <LeadActivityTab activities={activities} loading={loadingActivities} />
          </TabsContent>
        </Tabs>
      </div>

      <LeadDetailDialogs detail={detail} lead={lead} />
    </div>
  );
}
