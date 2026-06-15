"use client";

import { useSalesAnalytics } from "@/hooks/sales/useSalesAnalytics";
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
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
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

      <div className="space-y-6">
        <OverviewKpisSection overview={analytics.overview} />

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          <ActivityTrendsCard
            activityData={analytics.activityData}
            totalActivities={analytics.totalActivities}
            totalStatusChanges={analytics.totalStatusChanges}
            totalNotes={analytics.totalNotes}
          />
          <PipelineFunnelCard funnelData={analytics.funnelData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
