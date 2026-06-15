"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function useMyAttendanceHistory() {
  const [myHistoryYear, setMyHistoryYear] = useState<number>(new Date().getFullYear());
  const [myHistoryMonth, setMyHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [myHistoryMode, setMyHistoryMode] = useState<"month" | "custom">("month");
  const [myHistoryCustomRange, setMyHistoryCustomRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [myHistoryCalOpen, setMyHistoryCalOpen] = useState(false);

  const myHistoryStartDate = useMemo(
    () =>
      myHistoryMode === "custom"
        ? format(myHistoryCustomRange.from, "yyyy-MM-dd")
        : format(startOfMonth(new Date(myHistoryYear, myHistoryMonth - 1)), "yyyy-MM-dd"),
    [myHistoryMode, myHistoryYear, myHistoryMonth, myHistoryCustomRange.from],
  );

  const myHistoryEndDate = useMemo(
    () =>
      myHistoryMode === "custom"
        ? format(myHistoryCustomRange.to, "yyyy-MM-dd")
        : format(endOfMonth(new Date(myHistoryYear, myHistoryMonth - 1)), "yyyy-MM-dd"),
    [myHistoryMode, myHistoryYear, myHistoryMonth, myHistoryCustomRange.to],
  );

  const navigateMyHistoryMonth = (delta: number) => {
    let m = myHistoryMonth + delta;
    let y = myHistoryYear;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (m < 1) {
      m = 12;
      y--;
    }
    setMyHistoryMonth(m);
    setMyHistoryYear(y);
  };

  const isMHCurrent =
    myHistoryYear === new Date().getFullYear() &&
    myHistoryMonth === new Date().getMonth() + 1;

  return {
    myHistoryYear,
    myHistoryMonth,
    myHistoryMode,
    setMyHistoryMode,
    myHistoryCustomRange,
    setMyHistoryCustomRange,
    myHistoryCalOpen,
    setMyHistoryCalOpen,
    myHistoryStartDate,
    myHistoryEndDate,
    navigateMyHistoryMonth,
    isMHCurrent,
  };
}
