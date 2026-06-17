"use client";

import { format } from "date-fns";
import { CalendarIcon, Filter as FilterIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { parseDateOnly, toDateOnlyString, type ActivityScope, type TimePreset } from "@/lib/activity-grouping";
import type { useActivityFeed } from "@/hooks/activity/useActivityFeed";

type Feed = ReturnType<typeof useActivityFeed>;

export function ActivityFiltersBar(feed: Feed) {
  const {
    visibleActivities, activeFilterLabels, showSystemEvents, setShowSystemEvents,
    searchQuery, setSearchQuery, timePreset, setTimePreset, customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate, activityType, setActivityType, isAdmin, isManager,
    scope, setScope, showAdvancedFilters, setShowAdvancedFilters, resourceType, setResourceType,
    filterDeptId, setFilterDeptId, departments, filterTeamId, setFilterTeamId, teamsForScope,
    filterDesignation, setFilterDesignation, showUserFilterPanel, filterUserId, setFilterUserId,
    userOptions, scopeOptions,
  } = feed;

  return (
    <Card className="border-border overflow-visible shadow-sm">
      <CardContent className="space-y-4 p-5">
        {/* Summary String */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Showing {visibleActivities.length} activities
            </span>
            {activeFilterLabels.length > 0 && (
              <span className="text-sm text-muted-foreground">
                • Filtered by: <span className="font-medium capitalize text-foreground">{activeFilterLabels.join(" • ")}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Show system events</span>
            <Switch checked={showSystemEvents} onCheckedChange={setShowSystemEvents} />
          </div>
        </div>

        {/* Primary Filters Row */}
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search activities..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date Range</label>
            <Select value={timePreset} onValueChange={(value) => setTimePreset(value as TimePreset)}>
              <SelectTrigger className="w-40 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timePreset === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-[180px] justify-start text-left font-normal bg-background",
                        !customStartDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate
                        ? format(parseDateOnly(customStartDate) ?? new Date(), "LLL dd, y")
                        : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseDateOnly(customStartDate)}
                      onSelect={(date) => {
                        if (!date) return;
                        const nextStart = toDateOnlyString(date);
                        setCustomStartDate(nextStart);
                        if (customEndDate && nextStart > customEndDate) {
                          setCustomEndDate(nextStart);
                        }
                      }}
                      disabled={(date) =>
                        Boolean(customEndDate && toDateOnlyString(date) > customEndDate)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-[180px] justify-start text-left font-normal bg-background",
                        !customEndDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate
                        ? format(parseDateOnly(customEndDate) ?? new Date(), "LLL dd, y")
                        : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseDateOnly(customEndDate)}
                      onSelect={(date) => {
                        if (!date) return;
                        const nextEnd = toDateOnlyString(date);
                        setCustomEndDate(nextEnd);
                        if (customStartDate && nextEnd < customStartDate) {
                          setCustomStartDate(nextEnd);
                        }
                      }}
                      disabled={(date) =>
                        Boolean(customStartDate && toDateOnlyString(date) < customStartDate)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Activity Type</label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="w-40 h-10"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="complete">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(isAdmin || isManager) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">User Scope</label>
              <Select value={scope} onValueChange={(value) => setScope(value as ActivityScope)}>
                <SelectTrigger className="w-48 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            variant={showAdvancedFilters ? "secondary" : "outline"} 
            className="h-10 gap-2" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FilterIcon className="h-4 w-4" />
            Advanced
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted px-4 py-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resource Type</label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="All Resources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && scope !== "team" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Org Filter (Dept)</label>
                <Select value={filterDeptId || "all"} onValueChange={(v) => setFilterDeptId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-48 bg-background"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdmin && scope === "team" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Org Filter (Team)</label>
                <Select value={filterTeamId || ""} onValueChange={setFilterTeamId}>
                  <SelectTrigger className="w-48 bg-background"><SelectValue placeholder="Select Team" /></SelectTrigger>
                  <SelectContent>
                    {teamsForScope.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role Filter</label>
              <Select value={filterDesignation} onValueChange={setFilterDesignation}>
                <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showUserFilterPanel && scope !== "team" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">User</label>
                <Select value={filterUserId || "all"} onValueChange={(v) => setFilterUserId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-56 bg-background"><SelectValue placeholder="All Users" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {userOptions.map((o) => (<SelectItem key={o.id} value={o.id}>{o.fullName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Smart Filter Chips */}
        {activeFilterLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border mt-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active Filters:</span>
            {activeFilterLabels.map((lbl, i) => (
              <Badge key={i} variant="secondary" className="px-2.5 py-1 rounded border-border text-xs font-semibold capitalize text-foreground">
                {lbl} <X className="h-3 w-3 ml-1.5 -mr-0.5 opacity-50 block" /> {/* Pseudo delete icon, full delete handled by clear all for now */}
              </Badge>
            ))}
            <button 
              onClick={() => {
                setTimePreset("today");
                setActivityType("all");
                setResourceType("all");
                setFilterDeptId("");
                setFilterTeamId("");
                setFilterDesignation("all");
                setFilterUserId("");
              }}
              className="text-xs font-medium text-primary ml-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
