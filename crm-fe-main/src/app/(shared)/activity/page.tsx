"use client";

import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActivityFeed } from "@/hooks/activity/useActivityFeed";
import { ActivityFiltersBar } from "@/components/activity/ActivityFiltersBar";
import { ActivityTimeSection } from "@/components/activity/ActivityTimeSection";
import { ActivityResourceGroup } from "@/components/activity/ActivityResourceGroup";
import { ScrollAnchor } from "@/components/activity/ScrollAnchor";

export default function ActivityPage() {
  const feed = useActivityFeed();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity Timeline</h1>
          <p className="mt-1 text-muted-foreground">
            Follow the CRM story by resource, entity, and time block instead of a flat event log.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            {feed.meta.total} total records
          </Badge>
          {feed.quickFilter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => feed.setQuickFilter("all")}>
              Clear summary filter
            </Button>
          )}
        </div>
      </div>

      <ActivityFiltersBar {...feed} />

      <Card className="border-slate-200 border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-2 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-foreground font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Activity Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex p-1 rounded-lg border border-border bg-card shadow-sm">
                <button
                  onClick={() => feed.setViewMode("timeline")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                    feed.viewMode === "timeline"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  Timeline
                </button>
                <button
                  onClick={() => feed.setViewMode("detailed")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                    feed.viewMode === "detailed"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  Detailed View
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {feed.viewMode === "timeline" &&
            feed.canQueryActivities &&
            !feed.isLoading &&
            !feed.error &&
            feed.visibleActivities.length > 0 && (
              <ActivityTimeSection
                activities={feed.visibleActivities}
                shiftType={feed.user?.shiftType}
                expandedActivities={feed.expandedActivities}
                setExpandedActivities={feed.setExpandedActivities}
                userMap={feed.userMap}
              />
            )}

          <div className={feed.viewMode === "timeline" ? "hidden" : "block"}>
            {!feed.canQueryActivities ? (
              <div className="py-12 text-center text-muted-foreground">
                {feed.scopeNeedsDept
                  ? "Select a department to load activity."
                  : feed.scopeNeedsUser
                    ? "Select a user to load activity."
                    : "Select the required filters to load activity."}
              </div>
            ) : feed.isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, index) => (
                  <Skeleton key={index} className="h-28" />
                ))}
              </div>
            ) : feed.error ? (
              <div className="py-12 text-center text-destructive">Failed to load activities</div>
            ) : feed.detailedSections.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p>No activities found for the current filters.</p>
              </div>
            ) : (
              <div
                className="space-y-6 max-w-4xl w-full mx-auto"
                style={{ paddingTop: "16px", paddingBottom: "32px" }}
              >
                {feed.detailedSections.map((dateSection) => (
                  <div key={dateSection.dateKey} className="relative">
                    <div className="bg-background/95 backdrop-blur-sm py-2 px-1 mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold tracking-tight text-foreground">
                        {dateSection.dateLabel}
                      </h3>
                      <div className="flex items-center gap-3 flex-1 ml-3">
                        <div className="h-px bg-border flex-1" />
                        <Badge variant="secondary" className="text-xs px-2">
                          {dateSection.resources.reduce((acc, r) => acc + r.activities.length, 0)}{" "}
                          events
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {dateSection.resources.map((resourceGroup) => {
                        const rKey = `${dateSection.dateKey}-${resourceGroup.key}`;
                        const isOpen = feed.openResources.has(rKey);
                        return (
                          <ActivityResourceGroup
                            key={rKey}
                            resourceGroup={resourceGroup}
                            isOpen={isOpen}
                            onOpenChange={(nextOpen) =>
                              feed.setOpenResources((prev) => {
                                const next = new Set(prev);
                                if (nextOpen) next.add(rKey);
                                else next.delete(rKey);
                                return next;
                              })
                            }
                            expandedActivities={feed.expandedActivities}
                            setExpandedActivities={feed.setExpandedActivities}
                            userMap={feed.userMap}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!feed.isLoading && feed.meta.total > feed.allActivities.length && (
            <div className="pt-6 pb-2 text-center text-slate-500 text-sm flex justify-center w-full">
              {feed.isLoadingMore ? "Loading more activity..." : null}
              <ScrollAnchor onIntersect={feed.handleLoadMore} disabled={feed.isLoadingMore} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
