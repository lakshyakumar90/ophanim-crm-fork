import { useCallback, useState } from "react";
import { fetchLeaveStats, fetchOnLeaveToday } from "@/lib/hr-leave-api";
import type { LeaveStatsDto, OnLeaveTodayEntryDto } from "@/types/hr-leaves";

export function useLeaveStats() {
  const [stats, setStats] = useState<LeaveStatsDto | null>(null);
  const [onLeaveToday, setOnLeaveToday] = useState<OnLeaveTodayEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, o] = await Promise.all([fetchLeaveStats(), fetchOnLeaveToday()]);
      setStats(s);
      setOnLeaveToday(o);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
      setStats(null);
      setOnLeaveToday([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, onLeaveToday, loading, error, load };
}
