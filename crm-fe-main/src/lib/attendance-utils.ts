import { formatIST, nowIST } from "@/lib/date-utils";
import type { ShiftWindow } from "@/lib/attendance-types";

export function computeShiftWindow(
  shiftType: string,
  shiftRule?: { workStartTime?: string; workEndTime?: string } | null,
): ShiftWindow | null {
  const startRaw =
    shiftRule?.workStartTime || (shiftType === "night_shift" ? "19:00" : "09:00");
  const endRaw =
    shiftRule?.workEndTime || (shiftType === "night_shift" ? "04:15" : "18:15");
  const [startHour = "00", startMinute = "00"] = String(startRaw).split(":");
  const [endHour = "00", endMinute = "00"] = String(endRaw).split(":");

  const now = nowIST();
  const currentHour = parseInt(formatIST(now, "HH"), 10);
  const currentMinute = parseInt(formatIST(now, "mm"), 10);
  const isNightEarlyMorning =
    shiftType === "night_shift" &&
    (currentHour < 4 || (currentHour === 4 && currentMinute <= 15));

  const shiftDate = new Date(now);
  if (isNightEarlyMorning) {
    shiftDate.setDate(shiftDate.getDate() - 1);
  }
  const shiftDateStr = formatIST(shiftDate, "yyyy-MM-dd");
  const shiftStart = new Date(
    `${shiftDateStr}T${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}:00+05:30`,
  );

  const startMinutes = parseInt(startHour, 10) * 60 + parseInt(startMinute, 10);
  const endMinutes = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10);
  const crossesMidnight = endMinutes <= startMinutes;
  const shiftEnd = new Date(
    `${shiftDateStr}T${endHour.padStart(2, "0")}:${endMinute.padStart(2, "0")}:00+05:30`,
  );
  if (crossesMidnight) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }
  return { shiftType, shiftStart, shiftEnd };
}
