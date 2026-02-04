"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { activitiesApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Activity,
  User,
  Target,
  CheckSquare,
  Settings,
  Clock,
  Plus,
  Edit,
  Trash,
  LogIn,
  LogOut,
  ArrowRightLeft,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  UserCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";

interface ActivityLog {
  id: string;
  user_id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  lead?: {
    id: string;
    lead_name: string;
  };
}

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash,
  login: LogIn,
  logout: LogOut,
  assign: ArrowRightLeft,
  reassign: ArrowRightLeft,
  status_change: RefreshCw,
  clock_in: LogIn,
  clock_out: LogOut,
  complete: CheckCircle,
  bulk_update: Edit,
};

const resourceIcons: Record<string, React.ElementType> = {
  lead: Target,
  task: CheckSquare,
  user: User,
  team: User,
  attendance: Clock,
  settings: Settings,
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-green-100 text-green-700",
  logout: "bg-slate-100 text-slate-700",
  assign: "bg-violet-100 text-violet-700",
  reassign: "bg-violet-100 text-violet-700",
  status_change: "bg-orange-100 text-orange-700",
  clock_in: "bg-green-100 text-green-700",
  clock_out: "bg-amber-100 text-amber-700",
  complete: "bg-emerald-100 text-emerald-700",
  bulk_update: "bg-indigo-100 text-indigo-700",
};

// Format camelCase or snake_case to readable labels
const formatFieldName = (field: string): string => {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Format values for display
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ") || "—";
    return JSON.stringify(value);
  }
  return String(value);
};

// Get changes from metadata
const getChangesFromMetadata = (
  metadata: Record<string, unknown> | null,
  activityType: string,
): Array<{ field: string; oldVal: string; newVal: string }> => {
  const changes: Array<{ field: string; oldVal: string; newVal: string }> = [];

  if (!metadata) return changes;

  if (activityType === "status_change") {
    const fromStatus = metadata.from_status as string;
    const toStatus = metadata.to_status as string;
    if (fromStatus || toStatus) {
      changes.push({
        field: "Status",
        oldVal: formatValue(fromStatus),
        newVal: formatValue(toStatus),
      });
    }
  } else {
    Object.entries(metadata).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        changes.push({
          field: formatFieldName(key),
          oldVal: "",
          newVal: formatValue(val),
        });
      }
    });
  }

  return changes;
};

export default function ActivityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  const isAdmin = user?.role === "admin";
  const { currentDepartment } = useDepartment();

  // Call all hooks unconditionally
  const { data, isLoading, error } = useSWR(
    isAdmin ? ["activities", resourceType, currentDepartment?.id] : null,
    () =>
      activitiesApi
        .list({
          limit: 100,
          resourceType: resourceType !== "all" ? resourceType : undefined,
          departmentId: currentDepartment?.id,
        })
        .then((res) => res.data),
  );

  const { data: statsData } = useSWR(
    isAdmin ? ["activityStats", currentDepartment?.id] : null,
    () => activitiesApi.getStats({ departmentId: currentDepartment?.id }),
  );

  const statCards = [
    {
      title: "Total Activities",
      value: statsData?.totalActivities || 0,
      icon: Activity,
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Leads Created",
      value: statsData?.leadsCreated || 0,
      icon: UserPlus,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Leads Assigned",
      value: statsData?.leadsAssigned || 0,
      icon: UserCheck,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "Status Changes",
      value: statsData?.statusChanges || 0,
      icon: RefreshCw,
      color: "bg-pink-50 text-pink-600",
    },
    {
      title: "Tasks Done",
      value: statsData?.tasksDone || 0,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
  ];

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-500">
            You need admin privileges to view this page.
          </p>
        </div>
      </div>
    );
  }

  const activities: ActivityLog[] = data?.data || [];
  const meta = data?.meta || { total: 0 };

  const filteredActivities = activities.filter((activity) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      activity.user?.full_name?.toLowerCase().includes(searchLower) ||
      activity.user?.email?.toLowerCase().includes(searchLower) ||
      activity.activity_type?.toLowerCase().includes(searchLower) ||
      activity.title?.toLowerCase().includes(searchLower) ||
      activity.lead?.lead_name?.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (activityType: string) => {
    return actionIcons[activityType] || Activity;
  };

  const formatActivityDescription = (activity: ActivityLog) => {
    if (activity.title) return activity.title;
    const action = (activity.activity_type || "activity").replace(/_/g, " ");
    return action;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-600">
            Track all system activities and changes
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {meta.total} Activities
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {stat.title}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by user or action..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="team">Teams</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load activities
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const ActionIcon = getActionIcon(activity.activity_type);
                const colorClass =
                  actionColors[activity.activity_type] ||
                  "bg-slate-100 text-slate-700";
                const isExpanded = expandedActivities.has(activity.id);
                const changes = getChangesFromMetadata(
                  activity.metadata,
                  activity.activity_type,
                );
                const hasChanges = changes.length > 0;

                const toggleExpanded = () => {
                  setExpandedActivities((prev) => {
                    const next = new Set(prev);
                    if (next.has(activity.id)) {
                      next.delete(activity.id);
                    } else {
                      next.add(activity.id);
                    }
                    return next;
                  });
                };

                return (
                  <div
                    key={activity.id}
                    className="bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start gap-4 p-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          colorClass.split(" ")[0]
                        }`}
                      >
                        <ActionIcon
                          className={`h-5 w-5 ${colorClass.split(" ")[1]}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={activity.user?.avatar_url || ""}
                            />
                            <AvatarFallback className="text-xs">
                              {activity.user?.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-900">
                            {activity.user?.full_name || "Unknown User"}
                          </span>
                          <span className="text-slate-500">
                            {formatActivityDescription(activity)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Target className="h-3 w-3" />
                            {activity.lead?.lead_name || "Lead"}
                          </Badge>
                          {activity.lead_id && (
                            <span className="text-slate-400 text-xs font-mono">
                              ID: {activity.lead_id.slice(0, 8)}...
                            </span>
                          )}
                          {hasChanges && (
                            <button
                              onClick={toggleExpanded}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Hide Changes
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  View Changes ({changes.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-500 shrink-0">
                        <div>
                          {formatDistanceToNowIST(activity.created_at, {
                            addSuffix: true,
                          })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatIST(activity.created_at, "MMM d, HH:mm")}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Changes Section */}
                    {isExpanded && hasChanges && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-14 bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {activity.activity_type === "create"
                              ? "Created With"
                              : "Details"}
                          </div>
                          <div className="divide-y divide-slate-100">
                            {changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 flex items-center gap-2 text-sm"
                              >
                                <span className="font-medium text-slate-700 min-w-[120px]">
                                  {change.field}
                                </span>
                                {activity.activity_type === "status_change" ? (
                                  <>
                                    <span className="text-red-500 line-through">
                                      {change.oldVal}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="text-emerald-600">
                                      {change.newVal}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-emerald-600">
                                    {change.newVal}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
