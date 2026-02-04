"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  managerName: string | null;
  hrApproverName: string | null;
  createdAt: string;
}

interface LeaveStats {
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  onLeaveToday: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export default function HRLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, pendingRes, allRes] = await Promise.all([
        fetch(`${API_URL}/hr/leave-stats`, { headers }),
        fetch(`${API_URL}/hr/leaves/pending`, { headers }),
        fetch(`${API_URL}/hr/leaves`, { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingLeaves(data.data || []);
      }

      if (allRes.ok) {
        const data = await allRes.json();
        setLeaves(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/hr/leaves/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: "Approved by HR" }),
      });

      if (res.ok) {
        toast.success("Leave request approved");
        fetchData();
      } else {
        toast.error("Failed to approve request");
      }
    } catch (error) {
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/hr/leaves/${id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: "Rejected by HR" }),
      });

      if (res.ok) {
        toast.success("Leave request rejected");
        fetchData();
      } else {
        toast.error("Failed to reject request");
      }
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "outline",
      manager_approved: "secondary",
      approved: "default",
      rejected: "destructive",
      cancelled: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const rejectedLeaves = leaves.filter((l) => l.status === "rejected");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">
          Review and manage employee leave requests.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On Leave Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.onLeaveToday || 0}</div>
            <p className="text-xs text-muted-foreground">Employees away</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.approvedThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.rejectedThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingLeaves.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>
                Leave requests awaiting HR approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2" />
                    <p>No pending requests</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {leave.employeeName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {leave.employeeEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{leave.leaveTypeName}</TableCell>
                        <TableCell>
                          {formatDate(leave.startDate)} -{" "}
                          {formatDate(leave.endDate)}
                        </TableCell>
                        <TableCell>{leave.totalDays}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {leave.reason || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(leave.id)}
                              disabled={actionLoading === leave.id}
                            >
                              {actionLoading === leave.id ? "..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(leave.id)}
                              disabled={actionLoading === leave.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <LeaveTable
            leaves={approvedLeaves}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <LeaveTable
            leaves={rejectedLeaves}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="all">
          <LeaveTable
            leaves={leaves}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaveTable({
  leaves,
  formatDate,
  getStatusBadge,
}: {
  leaves: LeaveRequest[];
  formatDate: (d: string) => string;
  getStatusBadge: (s: string) => import("react").ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {leaves.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>No requests found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{leave.employeeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {leave.employeeEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{leave.leaveTypeName}</TableCell>
                  <TableCell>
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{leave.totalDays}</TableCell>
                  <TableCell>{getStatusBadge(leave.status)}</TableCell>
                  <TableCell>{leave.hrApproverName || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
