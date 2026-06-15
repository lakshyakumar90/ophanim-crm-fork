export interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newJoinersThisMonth: number;
  departmentBreakdown: { department: string; count: number }[];
  roleBreakdown: { role: string; count: number }[];
  jobTitleBreakdown: { jobTitle: string; count: number }[];
  leaveUsageByType: {
    leaveType: string;
    totalDays: number;
    requestCount: number;
  }[];
  monthlyHeadcount: { month: string; count: number }[];
  attendanceStats: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
  };
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

export const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  manager: "#f59e0b",
  employee: "#10b981",
};

export interface AttendanceDatum {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export interface RoleDatum {
  role: string;
  count: number;
  color: string;
  [key: string]: string | number;
}
