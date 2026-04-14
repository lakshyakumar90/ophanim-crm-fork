"use client";

import useSWR from "swr";
import { departmentsApi, teamsApi, usersApi } from "@/lib/api";
import { getHolidays } from "@/lib/supabase-queries";

export const SHARED_QUERY_KEYS = {
  teams: "teams-list",
  departments: "departments-list",
  usersLite: "users-lite-list",
  holidays: (year: number) => ["holidays", year] as const,
} as const;

export function useTeamsQuery() {
  return useSWR(SHARED_QUERY_KEYS.teams, () => teamsApi.list());
}

export function useDepartmentsQuery() {
  return useSWR(SHARED_QUERY_KEYS.departments, () => departmentsApi.list());
}

export function useUsersLiteQuery(limit = 100) {
  return useSWR([SHARED_QUERY_KEYS.usersLite, limit], () => usersApi.list({ limit }));
}

export function useHolidaysQuery(year: number) {
  return useSWR(SHARED_QUERY_KEYS.holidays(year), () => getHolidays(year));
}
