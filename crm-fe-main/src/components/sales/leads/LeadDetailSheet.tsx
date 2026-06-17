"use client";

import { useLeadDetail } from "@/hooks/sales/useLeadDetail";
import { RecordDetailSheet } from "@/components/shared/record-detail-sheet";
import { LeadDetailPanel } from "@/components/sales/leads/detail/LeadDetailPanel";

type LeadDetailSheetProps = {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeadDetailSheet({ leadId, open, onOpenChange }: LeadDetailSheetProps) {
  const detail = useLeadDetail(leadId ?? undefined);
  const leadName = detail.lead?.leadName ?? "Lead";

  return (
    <RecordDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={leadName}
      size="wide"
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Leads", href: "/sales/leads" },
        { label: leadName },
      ]}
    >
      {leadId ? <LeadDetailPanel detail={detail} compact /> : null}
    </RecordDetailSheet>
  );
}
