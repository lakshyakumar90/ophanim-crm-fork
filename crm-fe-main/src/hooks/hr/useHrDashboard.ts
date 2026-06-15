"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/providers/auth-provider";
import { api, attendanceApi, hrAnalyticsApi, usersApi } from "@/lib/api";
import { getHRScopeProfile, isAdminOrDirector } from "@/lib/hr-scope";

export function useHrDashboard() {
  const { user } = useAuth();
  const scopeProfile = getHRScopeProfile(user);
  const isFullView = isAdminOrDirector(user);
  const isManagerView = scopeProfile === "manager";
  const isEmployeeView = scopeProfile === "employee";

  const { data: snapshot } = useSWR("/hr/on-leave-today", async () => {
    const res = await api.get("/hr/on-leave-today");
    return res.data?.data || [];
  });

  const { data: payrollData } = useSWR("/hr/analytics/payroll-summary", () =>
    hrAnalyticsApi.payroll(),
  );

  const { data: teamUsersRaw } = useSWR(
    isManagerView && user?.teamId
      ? ["/users/team-members", user.teamId]
      : null,
    () => usersApi.list({ teamId: user?.teamId, limit: 200 }),
  );

  const { data: selfToday } = useSWR(
    isEmployeeView ? ["/attendance/today/self"] : null,
    () => attendanceApi.getToday(),
  );

  const { data: selfWeekly } = useSWR(
    isEmployeeView && user?.id ? ["/attendance/weekly-hours/self", user.id] : null,
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

  const teamOnLeaveCount = useMemo(() => {
    if (!Array.isArray(snapshot) || teamUsers.length === 0) return 0;
    const ids = new Set(teamUsers.map((member: any) => member.id));
    return snapshot.filter((employee: any) => ids.has(employee.id)).length;
  }, [snapshot, teamUsers]);

  const weeklyTotalHours = useMemo(() => {
    if (!Array.isArray(selfWeekly)) return 0;
    return selfWeekly.reduce(
      (sum: number, day: any) => sum + Number(day?.hours || 0),
      0,
    );
  }, [selfWeekly]);

  return {
    user,
    isFullView,
    isManagerView,
    isEmployeeView,
    snapshot,
    payrollData,
    teamUsers,
    teamOnLeaveCount,
    selfToday,
    weeklyTotalHours,
  };
}
