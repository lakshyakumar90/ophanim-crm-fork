"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSalesDashboard } from "@/hooks/sales/useSalesDashboard";
import { SalesDashboardSkeleton } from "@/components/sales/dashboard/SalesDashboardSkeleton";
import { SalesDashboardFilters } from "@/components/sales/dashboard/SalesDashboardFilters";
import { SalesKpiCards } from "@/components/sales/dashboard/SalesKpiCards";
import { PipelineChart } from "@/components/sales/dashboard/PipelineChart";
import { TasksRemindersCards } from "@/components/sales/dashboard/TasksRemindersCards";
import { RecentActivityList } from "@/components/sales/dashboard/RecentActivityList";
import { Leaderboard } from "@/components/sales/dashboard/Leaderboard";
import { TopDealsTable } from "@/components/sales/dashboard/TopDealsTable";
import { RefreshCw } from "lucide-react";

export default function SalesDashboardPage() {
  const {
    date,
    setDate,
    draftDate,
    setDraftDate,
    isDatePopoverOpen,
    setIsDatePopoverOpen,
    activePreset,
    setActivePreset,
    teamId,
    setTeamId,
    userId,
    setUserId,
    teams,
    users,
    topDeals,
    leaderboard,
    activities,
    reminders,
    isLoading,
    isRefreshing,
    isAdmin,
    isManager,
    refresh,
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    totalRevenue,
    activeDeals,
    convRate,
    avgDeal,
    tasks,
    pipelineChartData,
    pipelineMaxCount,
    isDraftRangeTooLong,
    canApplyDraftRange,
  } = useSalesDashboard();

  if (isLoading) return <SalesDashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time operational overview of your sales pipeline.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <SalesDashboardFilters
        date={date}
        draftDate={draftDate}
        activePreset={activePreset}
        teamId={teamId}
        userId={userId}
        teams={teams}
        users={users}
        isAdmin={isAdmin}
        isManager={isManager}
        isDatePopoverOpen={isDatePopoverOpen}
        canApplyDraftRange={canApplyDraftRange}
        isDraftRangeTooLong={isDraftRangeTooLong}
        onDateChange={setDate}
        onDraftDateChange={setDraftDate}
        onActivePresetChange={setActivePreset}
        onTeamIdChange={setTeamId}
        onUserIdChange={setUserId}
        onDatePopoverOpenChange={setIsDatePopoverOpen}
      />

      <SalesKpiCards
        totalLeads={totalLeads}
        newLeads={newLeads}
        activeDeals={activeDeals}
        wonLeads={wonLeads}
        lostLeads={lostLeads}
        totalRevenue={totalRevenue}
        convRate={convRate}
        avgDeal={avgDeal}
      />

      <PipelineChart
        pipelineChartData={pipelineChartData}
        pipelineMaxCount={pipelineMaxCount}
      />

      <TasksRemindersCards tasks={tasks} reminders={reminders} />

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 ">
        <RecentActivityList activities={activities} />
        <Leaderboard leaderboard={leaderboard} />
      </div>

      <TopDealsTable topDeals={topDeals} users={users} />
    </div>
  );
}
