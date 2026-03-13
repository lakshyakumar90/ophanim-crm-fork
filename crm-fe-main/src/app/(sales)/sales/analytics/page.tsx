"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserSelector } from "@/components/shared/user-selector";
import { activitiesApi, teamsApi, usersApi } from "@/lib/api";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

import { nowIST } from "@/lib/date-utils";

export default function AnalyticsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(nowIST(), 30),
    to: nowIST(),
  });
  const [teamId, setTeamId] = useState<string>("all");
  const [userId, setUserId] = useState<string>("");
  const [interval, setInterval] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("daily");

  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch teams and users on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teamsResult, usersResult] = await Promise.all([
          teamsApi.list(),
          usersApi.list({ limit: 1000 }), // Get all users for selector
        ]);
        setTeams(Array.isArray(teamsResult) ? teamsResult : []);
        setUsers(usersResult?.data || usersResult || []);
      } catch (error) {
        toast.error("Failed to load filter data");
      }
    };
    fetchInitialData();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const data = await activitiesApi.getAnalytics({
          startDate: date?.from?.toISOString(),
          endDate: date?.to?.toISOString(),
          teamId: teamId === "all" ? undefined : teamId,
          userId: userId || undefined,
          interval,
        });
        setAnalyticsData(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    if (date?.from) {
      fetchAnalytics();
    }
  }, [date, teamId, userId, interval]);

  // Aggregate stats for summary cards
  const totalActivities = analyticsData.reduce(
    (acc, curr) => acc + (curr.total || 0),
    0,
  );
  const totalStatusChanges = analyticsData.reduce(
    (acc, curr) => acc + (curr.status_change || 0),
    0,
  );
  const totalCalls = analyticsData.reduce(
    (acc, curr) => acc + (curr.call || 0),
    0,
  );
  const totalEmails = analyticsData.reduce(
    (acc, curr) => acc + (curr.email || 0),
    0,
  );

  const pieData = [
    { name: "Status Changes", value: totalStatusChanges },
    { name: "Calls", value: totalCalls },
    { name: "Emails", value: totalEmails },
    {
      name: "Meetings",
      value: analyticsData.reduce((acc, curr) => acc + (curr.meeting || 0), 0),
    },
    {
      name: "Other",
      value: analyticsData.reduce((acc, curr) => acc + (curr.other || 0), 0),
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Activity Analytics
        </h1>
        <p className="text-muted-foreground">
          Track team and user activity performance over time.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 flex-wrap bg-card p-4 rounded-lg border">
        {/* Date Range Picker */}
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Interval Select */}
        <Select value={interval} onValueChange={(val: any) => setInterval(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>

        {/* Team Select */}
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User Select */}
        <div className="w-[300px]">
          <UserSelector
            users={users.map((u) => ({
              id: u.id,
              fullName: u.fullName,
              email: u.email,
              role: u.role,
              isActive: u.isActive,
            }))}
            value={userId}
            onValueChange={setUserId}
            placeholder="Select User (Optional)"
          />
          {userId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserId("")}
              className="mt-1 h-6 text-xs text-muted-foreground"
            >
              Clear User Selection
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStatusChanges}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>
              Activity volume over time ({interval})
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#333" }}
                  />
                  <Legend />
                  <Bar
                    dataKey="status_change"
                    stackId="a"
                    fill="#0088FE"
                    name="Status Changes"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar dataKey="call" stackId="a" fill="#00C49F" name="Calls" />
                  <Bar
                    dataKey="email"
                    stackId="a"
                    fill="#FFBB28"
                    name="Emails"
                  />
                  <Bar
                    dataKey="meeting"
                    stackId="a"
                    fill="#FF8042"
                    name="Meetings"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
            <CardDescription>Distribution of activity types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
