"use client";

import { Button } from "@/components/ui/button";
import { useLeadDetail } from "@/hooks/sales/useLeadDetail";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LeadDetailPanel } from "@/components/sales/leads/detail/LeadDetailPanel";

export default function LeadDetailPage() {
  const detail = useLeadDetail();
  const leadName = detail.lead?.leadName ?? "Lead";

  if (!detail.loadingLead && !detail.lead) {
    return (
      <DetailPageLayout
        title="Lead not found"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Leads", href: "/sales/leads" },
          { label: "Not found" },
        ]}
      >
        <div className="py-8 text-center">
          <p className="text-xs text-muted-foreground">This lead could not be loaded.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => detail.router.push(`/sales/leads`)}
          >
            Back to Leads
          </Button>
        </div>
      </DetailPageLayout>
    );
  }

  return (
    <DetailPageLayout
      title={leadName}
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Leads", href: "/sales/leads" },
        { label: leadName },
      ]}
    >
      <LeadDetailPanel detail={detail} />
    </DetailPageLayout>
  );
}
