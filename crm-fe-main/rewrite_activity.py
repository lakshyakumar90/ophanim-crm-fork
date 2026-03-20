import os

file_path = r"c:\Lakshya\ophanim-crm-fork\ophanim-crm\crm-fe-main\src\app\(shared)\activity\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
"""import {
  Activity,
  Briefcase,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FolderKanban,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Target,
  Trash2,
  User,
  Users,
} from "lucide-react";""",
"""import {
  Activity,
  Briefcase,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FolderKanban,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Target,
  Trash2,
  User,
  Users,
  Search,
  Filter as FilterIcon,
  X,
  Settings2
} from "lucide-react";"""
)

# 2. Add renderTimelineActivityItem right before ActivityPage
import_str = """
const renderTimelineActivityItem = ({
  activity,
  entityName,
  expandedActivities,
  setExpandedActivities,
}: {
  activity: ActivityLog;
  entityName: string;
  expandedActivities: Dispatch<SetStateAction<Set<string>>> | any;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>> | any;
}) => {
  const ActionIcon = actionIcons[activity.activity_type] || Activity;
  const colorClass = actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type);
  const commentPreview =
    typeof activity.metadata?.comment_preview === "string" ? activity.metadata.comment_preview : null;
  const isExpanded = expandedActivities.has(activity.id);

  return (
    <div key={activity.id} className="relative flex items-start gap-4 group">
      {/* Timeline Time and Node */}
      <div className="flex flex-col items-center gap-1 w-[50px] sm:w-[60px] shrink-0 pt-0.5">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{formatIST(activity.created_at, "HH:mm")}</span>
        <div className={cn("relative z-10 rounded-full p-1.5 ring-4 ring-white bg-white", colorClass)}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6 border-b border-slate-100 group-last:border-transparent transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <p className="text-sm text-slate-700 leading-snug">
            <span className="font-bold text-slate-900">{activity.user?.full_name || "System"}</span>{" "}
            <span className="font-medium text-slate-600">{formatActivityDescription(activity)}</span>{" "}
            {entityName !== "Activity" && (
              <span className="font-semibold text-[10px] tracking-widest uppercase bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded ml-1">
                {entityName}
              </span>
            )}
          </p>
          <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap hidden sm:block">
            {formatDistanceToNowIST(activity.created_at, { addSuffix: true })}
          </span>
        </div>

        {changes.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setExpandedActivities((prev: any) => {
                const next = new Set(prev);
                if (next.has(activity.id)) next.delete(activity.id);
                else next.add(activity.id);
                return next;
              })
            }
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3" /> Hide changes</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> View changes ({changes.length})</>
            )}
          </button>
        )}

        {commentPreview && (
          <p className="mt-2 text-sm italic text-slate-600 border-l-2 border-slate-300 pl-3 py-1 bg-slate-50/50 rounded-r-md">
            &quot;{commentPreview}&quot;
          </p>
        )}

        {isExpanded && changes.length > 0 && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            {changes.map((change, index) => (
              <div key={`${activity.id}-${index}`} className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]">
                <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{change.field}</span>
                <span className="text-slate-400 line-through truncate">{change.oldVal || "-"}</span>
                <span className="text-slate-900 font-medium truncate">{change.newVal}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ActivityPage() {
"""
content = content.replace("export default function ActivityPage() {\n", import_str)

# 3. Add states
state_add = """  const [viewMode, setViewMode] = useState<"timeline" | "detailed">("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [filterDeptId, setFilterDeptId] = useState("");"""
content = content.replace('const [filterDeptId, setFilterDeptId] = useState("");', state_add)


# 4. Filter URL sync
sync_old = """  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (scope !== "self") params.set("scope", scope);"""
sync_new = """  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (viewMode !== "timeline") params.set("view", viewMode);
    if (searchQuery) params.set("q", searchQuery);
    if (scope !== "self") params.set("scope", scope);"""
content = content.replace(sync_old, sync_new)

# 5. Add search filter correctly
vis_old = """  const visibleActivities = useMemo(
    () =>
      baseVisibleActivities.filter((activity) =>
        showSystemEvents ? true : !SYSTEM_ACTIVITY_TYPES.has(activity.activity_type),
      ),
    [baseVisibleActivities, showSystemEvents],
  );"""
vis_new = """  const visibleActivities = useMemo(() => {
    let evs = baseVisibleActivities;
    if (!showSystemEvents) {
      evs = evs.filter((a) => !SYSTEM_ACTIVITY_TYPES.has(a.activity_type));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      evs = evs.filter((a) => 
        (a.user?.full_name || "").toLowerCase().includes(q) ||
        (formatActivityDescription(a)).toLowerCase().includes(q) ||
        (getEntityLabel(a)).toLowerCase().includes(q) ||
        (a.activity_type || "").toLowerCase().includes(q)
      );
    }
    return evs;
  }, [baseVisibleActivities, showSystemEvents, searchQuery]);"""
content = content.replace(vis_old, vis_new)

# 6. Active Filter labels
hidden_old = """  const hiddenSystemCount = useMemo(
    () =>
      baseVisibleActivities.filter((activity) =>
        SYSTEM_ACTIVITY_TYPES.has(activity.activity_type),
      ).length,
    [baseVisibleActivities],
  );"""
hidden_new = hidden_old + """

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    if (timePreset !== "today") labels.push(timePreset === "custom" ? "Custom Range" : timePreset.replace("-", " "));
    if (activityType !== "all") labels.push(formatFieldName(activityType));
    if (resourceType !== "all") labels.push(resourceLabels[resourceType as ResourceGroupKey] || resourceType);
    if (filterDeptId) labels.push("Department");
    if (filterTeamId) labels.push("Team");
    if (filterDesignation !== "all") labels.push(filterDesignation);
    if (filterUserId && userOptions.length) {
      const u = userOptions.find(u => u.id === filterUserId);
      if (u) labels.push(u.fullName);
    }
    return labels;
  }, [timePreset, activityType, resourceType, filterDeptId, filterTeamId, filterDesignation, filterUserId, userOptions]);
"""
content = content.replace(hidden_old, hidden_new)

# 7. Card Content replacement (Lines 983 - 1242)
start_marker = """      <Card className="border-slate-200">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">"""

end_marker = """      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">"""

new_filters = """      <Card className="border-slate-200 overflow-visible shadow-sm">
        <CardContent className="space-y-4 p-5">
          {/* Summary String */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Showing {visibleActivities.length} activities
              </span>
              {activeFilterLabels.length > 0 && (
                <span className="text-sm text-slate-600">
                  • Filtered by: <span className="font-medium capitalize text-slate-800">{activeFilterLabels.join(" • ")}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Show system events</span>
              <Switch checked={showSystemEvents} onCheckedChange={setShowSystemEvents} />
            </div>
          </div>

          {/* Primary Filters Row */}
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search activities..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Date Range</label>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Activity Type</label>
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
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">User Scope</label>
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
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Resource Type</label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Resources" /></SelectTrigger>
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
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Org Filter (Dept)</label>
                  <Select value={filterDeptId || "all"} onValueChange={(v) => setFilterDeptId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isAdmin && scope === "team" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Org Filter (Team)</label>
                  <Select value={filterTeamId || ""} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Select Team" /></SelectTrigger>
                    <SelectContent>
                      {teamsForScope.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Role Filter</label>
                <Select value={filterDesignation} onValueChange={setFilterDesignation}>
                  <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Roles" /></SelectTrigger>
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
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">User</label>
                  <Select value={filterUserId || "all"} onValueChange={(v) => setFilterUserId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="All Users" /></SelectTrigger>
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
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 mt-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Active Filters:</span>
              {activeFilterLabels.map((lbl, i) => (
                <Badge key={i} variant="secondary" className="px-2.5 py-1 rounded border-slate-200 text-xs font-semibold capitalize bg-white text-slate-700">
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
                className="text-xs font-medium text-blue-600 ml-2 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-slate-200 border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-2 pb-4">"""

split_content = content.split(start_marker, 1)
if len(split_content) > 1:
    split_content2 = split_content[1].split(end_marker, 1)
    if len(split_content2) > 1:
        content = split_content[0] + new_filters + split_content2[1]
    else:
        print("End marker not found")
else:
    print("Start marker not found")

# 8. Activity Grouping rendering -> View Mode Switch
header_title_old = """          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <Activity className="h-5 w-5" />
              Structured Activity Feed
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">"""

header_title_new = """          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900 font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Activity Feed
            </CardTitle>
            
            <div className="flex items-center gap-2">
               <div className="flex p-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                 <button 
                    onClick={() => setViewMode("timeline")} 
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === "timeline" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                 >
                   Timeline
                 </button>
                 <button 
                    onClick={() => setViewMode("detailed")} 
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === "detailed" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                 >
                   Detailed View
                 </button>
               </div>
            </div>
          </div>
          {/* We hide the old badge array or keep it minimal */}
          <div className="hidden">"""
content = content.replace(header_title_old, header_title_new)

# Fix the end of the hidden div
hide_end_old = """              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">"""
hide_end_new = """              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {viewMode === "timeline" && canQueryActivities && !isLoading && !error && visibleActivities.length > 0 && (
             <div className="space-y-8 max-w-4xl pt-4 pb-12 w-full">
               {buildTimeSections(visibleActivities, timePreset).map(section => (
                  <div key={section.key} className="relative">
                    <div className="sticky top-[120px] z-20 bg-background/95 backdrop-blur-sm py-2 px-1 mb-4 my-2 flex items-center gap-3">
                       <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{section.label}</h3>
                       <Badge variant="secondary" className="text-xs px-2 bg-slate-100 text-slate-600">{section.activities.length}</Badge>
                       <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    <div className="relative pl-1 sm:pl-2">
                       {/* Vertical Spine */}
                       <div className="absolute top-4 bottom-0 left-[26px] sm:left-[31px] w-px bg-slate-200" />
                       <div className="space-y-4">
                         {section.activities.map(act => renderTimelineActivityItem({
                             activity: act,
                             entityName: getEntityLabel(act),
                             expandedActivities,
                             setExpandedActivities
                         }))}
                       </div>
                    </div>
                  </div>
               ))}
             </div>
          )}

          <div className={viewMode === "timeline" ? "hidden" : "block"}>"""
content = content.replace(hide_end_old, hide_end_new)

# Ensure the last div matches the div opened
# Wait, let's close the `<div className={viewMode === "timeline" ? "hidden" : "block"}>` around line 1589
button_old = """              </div>

              {!isLoading && meta.total > allActivities.length && ("""
button_new = """              </div>
          </div>

              {!isLoading && meta.total > allActivities.length && ("""
content = content.replace(button_old, button_new)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")
