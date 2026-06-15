"use client";

import { useMemo, useState } from "react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subYears,
} from "date-fns";
import { nowIST } from "@/lib/date-utils";
import type { DateRangeType } from "@/lib/attendance-types";

export function useAttendanceDateRange() {
  const [dateRange, setDateRange] = useState<DateRangeType>("today");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: nowIST(),
    to: nowIST(),
  });
  const [customDateMode, setCustomDateMode] = useState<"single" | "range">("single");
  const [activeRangeField, setActiveRangeField] = useState<"from" | "to">("from");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const oneYearAgo = useMemo(() => subYears(new Date(), 1), []);

  const { startDate, endDate } = useMemo(() => {
    const now = nowIST();
    let start = now;
    let end = now;

    switch (dateRange) {
      case "today":
        start = now;
        end = now;
        break;
      case "yesterday":
        start = subDays(now, 1);
        end = subDays(now, 1);
        break;
      case "thisWeek":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastWeek": {
        const lastWeek = subDays(now, 7);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      }
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth": {
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      case "thisQuarter":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case "halfYear":
        start = subMonths(now, 6);
        end = now;
        break;
      case "custom":
        start = customDateRange.from;
        end = customDateRange.to;
        break;
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [dateRange, customDateRange]);

  return {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    customDateMode,
    setCustomDateMode,
    activeRangeField,
    setActiveRangeField,
    isCalendarOpen,
    setIsCalendarOpen,
    startDate,
    endDate,
    oneYearAgo,
  };
}
