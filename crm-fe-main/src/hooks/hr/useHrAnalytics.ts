"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { useAuth } from "@/providers/auth-provider";
import { attendanceApi, usersApi } from "@/lib/api";
import { getHRScopeProfile, isAdminOrDirector } from "@/lib/hr-scope";
import {
  API_URL,
  ROLE_COLORS,
  type HRAnalytics,
} from "@/components/hr/analytics/constants";

export function useHrAnalytics() {
  const { user } = useAuth();
  const scopeProfile = getHRScopeProfile(user);
  const isFullView = isAdminOrDirector(user);
  const isManagerView = scopeProfile === "manager";
  const isEmployeeView = scopeProfile === "employee";

  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("all");

  const fetchAnalytics = useCallback(async () => {
    if (!isFullView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const qs = new URLSearchParams();
      qs.set("year", year);
      if (month !== "all") qs.set("month", month);
      const res = await fetch(`${API_URL}/hr/analytics?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.data);
      } else {
        throw new Error("Failed to fetch HR analytics");
      }
    } catch (error: unknown) {
      console.error("Failed to fetch HR analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, isFullView]);

  useEffect(() => {
    if (!isFullView) return;
    fetchAnalytics();
  }, [year, month, isFullView, fetchAnalytics]);

  const { data: teamUsersRaw } = useSWR(
    isManagerView && user?.teamId ? ["/users/team-members", user.teamId] : null,
    () => usersApi.list({ teamId: user?.teamId, limit: 200 }),
  );

  const { data: teamTodayRaw } = useSWR(
    isManagerView
      ? ["/attendance/users-today/team", user?.departmentId || ""]
      : null,
    () =>
      attendanceApi.getUsersToday(undefined, user?.departmentId || undefined),
  );

  const { data: teamWeeklyRaw } = useSWR(
    isManagerView
      ? ["/attendance/analytics/team", user?.departmentId || ""]
      : null,
    () =>
      attendanceApi.getAnalytics(
        undefined,
        undefined,
        user?.departmentId || undefined,
      ),
  );

  const { data: selfTodayRaw } = useSWR(
    isEmployeeView ? ["/attendance/today/self"] : null,
    () => attendanceApi.getToday(),
  );

  const { data: selfWeeklyRaw } = useSWR(
    isEmployeeView && user?.id
      ? ["/attendance/weekly-hours/self", user.id]
      : null,
    () => attendanceApi.getWeeklyHours(user?.id),
  );

  const teamUsers = useMemo(() => {
    const payload = teamUsersRaw as any;
    if (!payload) return [] as any[];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [] as any[];
  }, [teamUsersRaw]);

  const teamToday = useMemo(() => {
    const payload = teamTodayRaw as any;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [] as any[];
  }, [teamTodayRaw]);

  const teamMemberIds = useMemo(
    () => new Set(teamUsers.map((member: any) => member.id)),
    [teamUsers],
  );

  const teamTodayCount = useMemo(() => {
    if (!teamToday.length || !teamMemberIds.size) return 0;
    return teamToday.filter((row: any) =>
      teamMemberIds.has(row.userId || row.user_id),
    ).length;
  }, [teamToday, teamMemberIds]);

  const selfWeeklyHours = useMemo(() => {
    if (!Array.isArray(selfWeeklyRaw)) return 0;
    return selfWeeklyRaw.reduce(
      (sum: number, day: any) => sum + Number(day?.hours || 0),
      0,
    );
  }, [selfWeeklyRaw]);

  const inactiveEmployees = analytics
    ? analytics.totalEmployees - analytics.activeEmployees
    : 0;

  const attendanceTotal = analytics
    ? analytics.attendanceStats.presentToday +
      analytics.attendanceStats.absentToday +
      analytics.attendanceStats.lateToday +
      analytics.attendanceStats.onLeaveToday
    : 0;

  const attendanceData = analytics
    ? [
        {
          name: "Present",
          value: analytics.attendanceStats.presentToday,
          color: "#10b981",
        },
        {
          name: "Late",
          value: analytics.attendanceStats.lateToday,
          color: "#f59e0b",
        },
        {
          name: "Absent",
          value: analytics.attendanceStats.absentToday,
          color: "#ef4444",
        },
        {
          name: "On Leave",
          value: analytics.attendanceStats.onLeaveToday,
          color: "#6366f1",
        },
      ].filter((d) => d.value > 0)
    : [];

  const roleData = analytics
    ? analytics.roleBreakdown.map((r) => ({
        ...r,
        color: ROLE_COLORS[r.role] || "#8b5cf6",
      }))
    : [];

  return {
    user,
    isFullView,
    isManagerView,
    isEmployeeView,
    analytics,
    loading,
    year,
    setYear,
    month,
    setMonth,
    fetchAnalytics,
    teamUsers,
    teamTodayCount,
    teamWeeklyRaw,
    selfTodayRaw,
    selfWeeklyHours,
    inactiveEmployees,
    attendanceTotal,
    attendanceData,
    roleData,
  };
}
