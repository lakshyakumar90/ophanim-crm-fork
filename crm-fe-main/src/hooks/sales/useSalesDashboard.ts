"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { differenceInCalendarDays, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  dashboardApi,
  leadsApi,
  activitiesApi,
  teamsApi,
  usersApi,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { toast } from "sonner";
import {
  nowIST,
  getShiftAwareDateKeyIST,
  getShiftAwareDayBoundsISO,
} from "@/lib/date-utils";
import {
  PIPELINE_STAGES,
  PIPELINE_LABELS,
  PIPELINE_COLORS,
  TOP_DEALS_PRIORITY_STATUSES,
  MAX_ACTIVITY_DISPLAY_COUNT,
  MAX_CUSTOM_RANGE_DAYS,
} from "@/lib/sales/sales-dashboard-constants";

export function useSalesDashboard() {
  const now = nowIST();
  const { user } = useAuth();
  const { currentDepartment, isLoading: isDepartmentLoading } = useDepartment();
  const salesDepartmentId = currentDepartment?.id;

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(now, 30),
    to: now,
  });
  const [draftDate, setDraftDate] = useState<DateRange | undefined>({
    from: subDays(now, 30),
    to: now,
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [activePreset, setActivePreset] = useState("30d");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any>({
    overdue: 0,
    dueToday: 0,
    pending: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterContextReady, setIsFilterContextReady] = useState(false);
  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const lastFetchKeyRef = useRef<string>("");

  const activityScope =
    user?.role === "admin"
      ? "all-crm"
      : user?.role === "manager"
        ? "team"
        : "self";

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    setDraftDate(date);
  }, [date]);

  useEffect(() => {
    if (!user || isDepartmentLoading || !salesDepartmentId) return;

    const loadScopeContext = async () => {
      const userParams: any = {
        limit: 1000,
        departmentId: salesDepartmentId,
      };

      if (isManager && user.teamId) {
        userParams.teamId = user.teamId;
      }

      const [teamsResult, usersResult] = await Promise.allSettled([
        teamsApi.list(),
        usersApi.list(userParams),
      ]);

      let fetchedTeams =
        teamsResult.status === "fulfilled" && Array.isArray(teamsResult.value)
          ? teamsResult.value.filter(
              (team: any) => team.departmentId === salesDepartmentId,
            )
          : [];

      let fetchedUsers =
        usersResult.status === "fulfilled"
          ? usersResult.value?.data ||
            (Array.isArray(usersResult.value) ? usersResult.value : [])
          : [];

      if (isManager && user.teamId) {
        fetchedTeams = fetchedTeams.filter((team: any) => team.id === user.teamId);
        fetchedUsers = fetchedUsers.filter(
          (member: any) =>
            member.id === user.id ||
            member.teamId === user.teamId ||
            member.team_id === user.teamId,
        );
      }

      if (isEmployee) {
        fetchedUsers = fetchedUsers.filter((member: any) => member.id === user.id);
      }

      setTeams(fetchedTeams);
      setUsers(fetchedUsers);
      setIsFilterContextReady(true);
    };

    setIsFilterContextReady(false);
    void loadScopeContext();
  }, [
    isDepartmentLoading,
    isEmployee,
    isManager,
    salesDepartmentId,
    user,
  ]);

  useEffect(() => {
    if (teamId !== "all" && !teams.some((t: any) => t.id === teamId)) {
      setTeamId("all");
    }
  }, [teamId, teams]);

  useEffect(() => {
    if (isEmployee) return;
    if (userId && !users.some((u: any) => u.id === userId)) {
      setUserId("");
    }
  }, [isEmployee, userId, users]);

  const fetchData = useCallback(async () => {
    if (!user || !date?.from || !salesDepartmentId || !isFilterContextReady) return;
    const shiftType = user.shiftType;
    const fromKey = getShiftAwareDateKeyIST(date.from, shiftType);
    const toKey = getShiftAwareDateKeyIST(date.to || date.from, shiftType);
    const startDate = getShiftAwareDayBoundsISO(fromKey, shiftType).startDate;
    const endDate = getShiftAwareDayBoundsISO(toKey, shiftType).endDate;
    const scopedTeamId =
      isEmployee ? undefined : teamId === "all" ? undefined : teamId;
    const scopedUserId = isEmployee ? user.id : userId || undefined;
    const allowedUserIds = new Set(
      users
        .map((u: any) => u.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
    );

    const fetchKey = JSON.stringify({
      userId: user.id,
      role: user.role,
      startDate,
      endDate,
      scopedTeamId: scopedTeamId || "all",
      scopedUserId: scopedUserId || "all",
      activityScope,
      salesDepartmentId,
    });

    if (inFlightFetchRef.current && lastFetchKeyRef.current === fetchKey) {
      return inFlightFetchRef.current;
    }

    lastFetchKeyRef.current = fetchKey;

    const run = async () => {
      setIsLoading(true);
      try {
        const [dashResult, analyticsResult, dealsResult, userWiseResult, actsResult, remindersResult] =
          await Promise.allSettled([
          dashboardApi.get(salesDepartmentId),
          dashboardApi.getLeadAnalytics(
            startDate,
            endDate,
            scopedTeamId,
            scopedUserId,
            salesDepartmentId,
          ),
          leadsApi.list({
            limit: 1000,
            sortBy: "lead_value",
            sortOrder: "desc",
            startDate,
            endDate,
            ...(scopedUserId && { assignedTo: scopedUserId }),
            ...(scopedTeamId && { teamId: scopedTeamId }),
          }),
          dashboardApi.getUserWiseAnalytics({
            startDate,
            endDate,
            teamId: scopedTeamId,
            userId: scopedUserId,
            departmentId: salesDepartmentId,
          }),
          activitiesApi.list({
            limit: 10,
            scope: activityScope,
            startDate,
            endDate,
            departmentId: salesDepartmentId,
            ...(scopedTeamId && { teamId: scopedTeamId }),
            ...(scopedUserId && { userId: scopedUserId }),
          }),
          leadsApi.getAllReminders({ status: "pending", limit: 100 }),
          ]);

        const baseDash =
          dashResult.status === "fulfilled" ? dashResult.value : null;
        const analytics =
          analyticsResult.status === "fulfilled" ? analyticsResult.value : null;

        setDashData({
          ...(baseDash || {}),
          leads: {
            ...(baseDash?.leads || {}),
            total: baseDash?.leads?.total || analytics?.total || 0,
            newThisMonth: analytics?.total || 0,
            wonThisMonth: analytics?.wonCount || 0,
            pipeline: analytics?.byStatus || {},
          },
          revenue: {
            ...(baseDash?.revenue || {}),
            total: analytics?.totalValue || 0,
          },
        });

        const allDeals = dealsResult.status === "fulfilled"
          ? dealsResult.value?.data || []
          : [];

        const scopedDeals =
          allowedUserIds.size > 0
            ? allDeals.filter((deal: any) => {
                const assigneeId =
                  deal.assignedTo || deal.assigned_to || deal.userId || deal.user_id || null;
                if (!assigneeId) return false;
                return allowedUserIds.has(assigneeId);
              })
            : [];

        const priorityDeals = scopedDeals
          .filter((deal: any) => TOP_DEALS_PRIORITY_STATUSES.includes(deal.status))
          .sort((a: any, b: any) => {
            const aIndex = TOP_DEALS_PRIORITY_STATUSES.indexOf(a.status);
            const bIndex = TOP_DEALS_PRIORITY_STATUSES.indexOf(b.status);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return (b.leadValue || b.lead_value || 0) - (a.leadValue || a.lead_value || 0);
          })
          .slice(0, 10);

        setTopDeals(priorityDeals);

        const userWiseData =
          userWiseResult.status === "fulfilled" ? userWiseResult.value : null;
        let leaderboardData = (userWiseData?.users || []).map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.full_name || "Unknown",
          teamName: u.teamName || u.team_name || null,
          role: u.role || "",
          activityCount: u.activitiesLogged || 0,
          activityCountCapped: Boolean(u.activityCountCapped),
          leadCount: u.totalLeads || 0,
        }));

        leaderboardData = leaderboardData
          .map((rep: any) => ({
            ...rep,
            activityCount: rep.activityCount || 0,
            activityCountCapped:
              Boolean(rep.activityCountCapped) ||
              Number(rep.activityCount || 0) >= MAX_ACTIVITY_DISPLAY_COUNT,
            leadCount: rep.leadCount || 0,
          }))
          .sort((a: any, b: any) => {
            if (b.activityCount !== a.activityCount) {
              return b.activityCount - a.activityCount;
            }
            return b.leadCount - a.leadCount;
          })
          .slice(0, 8);

        setLeaderboard(leaderboardData);

        setActivities(
          actsResult.status === "fulfilled"
            ? actsResult.value?.data || []
            : [],
        );

        const remindersData = remindersResult.status === "fulfilled"
          ? remindersResult.value?.data || []
          : [];

        const filteredReminders = remindersData.filter((r: any) => {
          const reminderUserId = r.userId || r.user_id || r.user?.id || null;
          if (allowedUserIds.size === 0) {
            return false;
          }
          if (reminderUserId && !allowedUserIds.has(reminderUserId)) {
            return false;
          }
          const reminderTime = new Date(
            r.reminderAt || r.reminder_at || r.createdAt || r.created_at,
          ).getTime();
          return (
            reminderTime >= new Date(startDate).getTime() &&
            reminderTime <= new Date(endDate).getTime()
          );
        });

        const nowTime = new Date().getTime();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const overdue = filteredReminders.filter((r: any) => {
          const reminderTime = new Date(r.reminderAt || r.reminder_at).getTime();
          return reminderTime < nowTime;
        }).length;

        const dueToday = filteredReminders.filter((r: any) => {
          const reminderTime = new Date(r.reminderAt || r.reminder_at).getTime();
          return reminderTime >= todayStart.getTime() && reminderTime <= todayEnd.getTime();
        }).length;

        setReminders({
          overdue,
          dueToday,
          pending: filteredReminders.length,
          total: filteredReminders.length,
        });

        if (dashResult.status === "rejected") {
          toast.error("Failed to load dashboard data");
        }
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        inFlightFetchRef.current = null;
      }
    };

    inFlightFetchRef.current = run();
    return inFlightFetchRef.current;
  }, [
    user,
    date,
    teamId,
    userId,
    activityScope,
    isAdmin,
    isManager,
    isEmployee,
    isFilterContextReady,
    salesDepartmentId,
    users,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pipeline = dashData?.leads?.pipeline || {};
  const totalLeads = dashData?.leads?.total || 0;
  const newLeads = dashData?.leads?.newThisMonth || 0;
  const wonLeads = pipeline.won || 0;
  const lostLeads = pipeline.lost || 0;
  const totalRevenue = dashData?.revenue?.total || 0;
  const activeDeals = ["contacted", "qualified", "hot_lead", "meeting_scheduled", "proposal_sent", "negotiation"].reduce(
    (sum, s) => sum + (pipeline[s] || 0),
    0,
  );
  const convRate =
    totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const avgDeal = wonLeads > 0 ? Math.round(totalRevenue / wonLeads) : 0;
  const tasks = dashData?.tasks || {};

  const pipelineChartData = PIPELINE_STAGES.map((s) => ({
    name: PIPELINE_LABELS[s] || s,
    count: pipeline[s] || 0,
    fill: PIPELINE_COLORS[s] || "#94a3b8",
  }));

  const pipelineMaxCount = Math.max(...pipelineChartData.map((item) => item.count), 0);
  const draftRange = draftDate?.from
    ? { from: draftDate.from, to: draftDate.to || draftDate.from }
    : undefined;
  const isDraftRangeTooLong =
    !!draftRange?.from &&
    !!draftRange?.to &&
    differenceInCalendarDays(draftRange.to, draftRange.from) > MAX_CUSTOM_RANGE_DAYS;
  const canApplyDraftRange = Boolean(
    draftRange?.from && draftRange?.to && !isDraftRangeTooLong,
  );

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchData();
  }, [fetchData]);

  return {
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
    isEmployee,
    fetchData,
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
    draftRange,
    isDraftRangeTooLong,
    canApplyDraftRange,
  };
}
