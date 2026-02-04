"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Users, UserCheck, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newJoinersThisMonth: number;
  departmentBreakdown: { department: string; count: number }[];
  roleBreakdown: { role: string; count: number }[];
}

interface EmployeeOnLeave {
  userId: string;
  userName: string;
}

export default function HRDashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [onLeave, setOnLeave] = useState<EmployeeOnLeave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, onLeaveRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/hr/analytics`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
              },
            },
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/hr/on-leave-today`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
              },
            },
          ),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData.data);
        }

        if (onLeaveRes.ok) {
          const onLeaveData = await onLeaveRes.json();
          setOnLeave(onLeaveData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch HR data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName}. Here's your HR overview.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Employees"
          value={analytics?.totalEmployees || 0}
          icon={Users}
          description="All registered employees"
          accentColor="blue"
        />
        <StatsCard
          title="Active Employees"
          value={analytics?.activeEmployees || 0}
          icon={UserCheck}
          description="Currently active"
          accentColor="green"
        />
        <StatsCard
          title="New This Month"
          value={analytics?.newJoinersThisMonth || 0}
          icon={UserPlus}
          description="New joiners"
          accentColor="purple"
        />
        <StatsCard
          title="On Leave Today"
          value={onLeave.length}
          icon={Clock}
          description="Employees on leave"
          accentColor="orange"
        />
      </div>

      {/* Department & Role Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>Employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.departmentBreakdown.map((dept) => (
                <div
                  key={dept.department}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium">{dept.department}</span>
                  <span className="text-sm text-muted-foreground">
                    {dept.count} employees
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Employees by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.roleBreakdown.map((role) => (
                <div
                  key={role.role}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium capitalize">
                    {role.role}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {role.count} employees
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees on Leave Today */}
      {onLeave.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>On Leave Today</CardTitle>
            <CardDescription>Employees currently on leave</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {onLeave.map((emp) => (
                <div
                  key={emp.userId}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{emp.userName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
