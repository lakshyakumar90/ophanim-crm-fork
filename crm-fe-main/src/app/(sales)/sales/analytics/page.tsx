"use client";

import { useSalesAnalytics } from "@/hooks/sales/useSalesAnalytics";
import { PageShell } from "@/components/shared/page-shell";
import {
  ActivityTrendsCard,
  AnalyticsFiltersBar,
  AnalyticsHeader,
  AnalyticsSkeleton,
  LeadSourceDistributionCard,
  LeadStatusDistributionCard,
  OverviewKpisSection,
  PipelineFunnelCard,
  UserInsightsSection,
} from "@/components/sales/analytics";

export default function SalesAnalyticsPage() {
  const analytics = useSalesAnalytics();

  if (analytics.isLoading) {
    return (
      <PageShell variant="canvas">
        <AnalyticsSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell variant="canvas">
      <AnalyticsHeader
        isRefreshing={analytics.isRefreshing}
        onRefresh={() => void analytics.fetchAnalytics(true)}
      />

      <AnalyticsFiltersBar
        activePreset={analytics.activePreset}
        date={analytics.date}
        dateLabel={analytics.dateLabel}
        interval={analytics.interval}
        teamId={analytics.teamId}
        userId={analytics.userId}
        teams={analytics.teams}
        users={analytics.users}
        isManagerOrAbove={analytics.isManagerOrAbove}
        isEmployee={analytics.isEmployee}
        isDatePopoverOpen={analytics.isDatePopoverOpen}
        draftDate={analytics.draftDate}
        canApplyDraftRange={analytics.canApplyDraftRange}
        isDraftRangeTooLong={analytics.isDraftRangeTooLong}
        draftRange={analytics.draftRange}
        onApplyPreset={analytics.applyPreset}
        onSetActivePreset={analytics.setActivePreset}
        onSetDate={analytics.setDate}
        onSetInterval={analytics.setInterval}
        onSetTeamId={analytics.setTeamId}
        onSetUserId={analytics.setUserId}
        onSetIsDatePopoverOpen={analytics.setIsDatePopoverOpen}
        onSetDraftDate={analytics.setDraftDate}
      />

      <OverviewKpisSection overview={analytics.overview} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        <ActivityTrendsCard
          activityData={analytics.activityData}
          totalActivities={analytics.totalActivities}
          totalStatusChanges={analytics.totalStatusChanges}
          totalNotes={analytics.totalNotes}
        />
        <PipelineFunnelCard funnelData={analytics.funnelData} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LeadStatusDistributionCard
          statusData={analytics.statusData.map((s) => ({ name: s.name, value: s.value }))}
        />
        <LeadSourceDistributionCard sourceData={analytics.sourceData} />
      </div>

      <UserInsightsSection
        leaderboard={analytics.leaderboard}
        userWiseRows={analytics.userWiseRows}
        date={analytics.date}
        teamId={analytics.teamId}
        isManagerOrAbove={analytics.isManagerOrAbove}
        isAdmin={analytics.isAdmin}
        userTeamId={analytics.user?.teamId}
      />
    </PageShell>
  );
}
