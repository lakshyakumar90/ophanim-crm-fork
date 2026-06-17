"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { useLeadDetail } from "@/hooks/sales/useLeadDetail";
import { LeadHeader } from "@/components/sales/leads/detail/LeadHeader";
import { LeadStatusBar } from "@/components/sales/leads/detail/LeadStatusBar";
import { LeadDetailSkeleton } from "@/components/sales/leads/detail/LeadDetailSkeleton";
import { LeadInfoTab } from "@/components/sales/leads/detail/LeadInfoTab";
import { LeadActivityTab } from "@/components/sales/leads/detail/LeadActivityTab";
import { LeadDetailDialogs } from "@/components/sales/leads/detail/LeadDetailDialogs";
import { LeadConversionPanel } from "@/components/sales/leads/detail/LeadConversionPanel";

type LeadDetailPanelProps = {
  detail: ReturnType<typeof useLeadDetail>;
  compact?: boolean;
};

export function LeadDetailPanel({ detail, compact = false }: LeadDetailPanelProps) {
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
    showConvertDialog,
    setShowConvertDialog,
  } = detail;

  if (loadingLead) {
    return <LeadDetailSkeleton />;
  }

  if (!lead) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-muted-foreground">Lead not found</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push(`/sales/leads`)}>
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
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

      <LeadConversionPanel
        lead={lead}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onConverted={refreshLeadData}
      />

      <Tabs defaultValue="info" className="space-y-3">
        <TabsList className="h-8 w-auto">
          <TabsTrigger value="info" className="text-xs">
            Info
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs">
            Activities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-2">
          <LeadInfoTab detail={detail} lead={lead} compact={compact} />
        </TabsContent>

        <TabsContent value="activities" className="mt-2">
          <LeadActivityTab activities={activities} loading={loadingActivities} />
        </TabsContent>
      </Tabs>

      <LeadDetailDialogs detail={detail} lead={lead} />
    </div>
  );
}
