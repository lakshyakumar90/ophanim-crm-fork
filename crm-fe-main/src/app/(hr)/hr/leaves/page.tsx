"use client";

import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  Loader2,
  Wallet,
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
  hrNotes: string | null;
  createdAt: string;
}

interface LeaveStats {
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  onLeaveToday: number;
}

interface LeaveType {
  id: string;
  name: string;
  daysAllowed: number;
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
}

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
    "Content-Type": "application/json",
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  const cls: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    manager_approved: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <Badge className={cls[status] || "bg-gray-100 text-gray-600"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function HRLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes dialog state
  const [notesAction, setNotesAction] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Create leave dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [createForm, setCreateForm] = useState({
    targetUserId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Balances tab state
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [statsRes, pendingRes, allRes] = await Promise.all([
        fetch(`${API_URL}/hr/leave-stats`, { headers }),
        fetch(`${API_URL}/hr/leaves/pending`, { headers }),
        fetch(`${API_URL}/hr/leaves`, { headers }),
      ]);
      if (statsRes.ok) setStats((await statsRes.json()).data);
      if (pendingRes.ok) setPendingLeaves((await pendingRes.json()).data || []);
      if (allRes.ok) setLeaves((await allRes.json()).data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch employees + leave types for the create dialog
  const openCreateDialog = async () => {
    setCreateOpen(true);
    if (employees.length === 0) {
      try {
        const res = await fetch(`${API_URL}/hr/employees`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setEmployees(
            (data.data || []).map((e: any) => ({
              id: e.id,
              fullName: e.fullName || e.full_name || "",
              email: e.email || "",
            })),
          );
        }
      } catch { /* ignore */ }
    }
    if (leaveTypes.length === 0) {
      try {
        const res = await fetch(`${API_URL}/hr/leave-types`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLeaveTypes(
            (data.data || []).map((lt: any) => ({
              id: lt.id,
              name: lt.name,
              daysAllowed: lt.daysAllowed ?? lt.days_allowed ?? 0,
            })),
          );
        }
      } catch { /* ignore */ }
    }
  };

  const handleCreateLeave = async () => {
    const { targetUserId, leaveTypeId, startDate, endDate, reason } = createForm;
    if (!targetUserId || !leaveTypeId || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_URL}/hr/leaves`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetUserId, leaveTypeId, startDate, endDate, reason }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Leave request created");
        setCreateOpen(false);
        setCreateForm({ targetUserId: "", leaveTypeId: "", startDate: "", endDate: "", reason: "" });
        fetchData();
      } else {
        toast.error(json?.error?.message || "Failed to create leave request");
      }
    } catch {
      toast.error("Failed to create leave request");
    } finally {
      setCreateLoading(false);
    }
  };

  const openNotesDialog = (id: string, action: "approve" | "reject") => {
    setNotes("");
    setNotesAction({ id, action });
  };

  const handleNotesSubmit = async () => {
    if (!notesAction) return;
    setActionLoading(true);
    try {
      const endpoint = notesAction.action === "approve"
        ? `${API_URL}/hr/leaves/${notesAction.id}/approve`
        : `${API_URL}/hr/leaves/${notesAction.id}/reject`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(notesAction.action === "approve" ? "Leave approved" : "Leave rejected");
        setNotesAction(null);
        fetchData();
      } else {
        toast.error(json?.error?.message || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchBalances = async (userId: string) => {
    if (!userId) return;
    setBalancesLoading(true);
    try {
      const res = await fetch(`${API_URL}/hr/leaves/balances/${userId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBalances(
          (data.data || []).map((b: any) => ({
            leaveTypeId: b.leaveTypeId,
            leaveTypeName: b.leaveTypeName || b.leave_type_name || "",
            totalDays: b.totalDays ?? b.total_days ?? 0,
            usedDays: b.usedDays ?? b.used_days ?? 0,
            remainingDays: b.remainingDays ?? b.remaining_days ?? 0,
          })),
        );
      }
    } catch { /* ignore */ } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (balanceUserId) fetchBalances(balanceUserId);
  }, [balanceUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const rejectedLeaves = leaves.filter((l) => l.status === "rejected");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Review and manage employee leave requests.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Leave
        </Button>
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
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
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
            <div className="text-2xl font-bold">{stats?.approvedThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejectedThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingLeaves.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>Leave requests awaiting HR approval</CardDescription>
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
                          <div className="font-medium">{leave.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{leave.employeeEmail}</div>
                        </TableCell>
                        <TableCell>{leave.leaveTypeName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                        </TableCell>
                        <TableCell>{leave.totalDays}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{leave.reason || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => openNotesDialog(leave.id, "approve")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => openNotesDialog(leave.id, "reject")}>
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

        {/* Approved */}
        <TabsContent value="approved">
          <LeaveTable leaves={approvedLeaves} showStatus />
        </TabsContent>

        {/* Rejected */}
        <TabsContent value="rejected">
          <LeaveTable leaves={rejectedLeaves} showStatus />
        </TabsContent>

        {/* All */}
        <TabsContent value="all">
          <LeaveTable leaves={leaves} showStatus />
        </TabsContent>

        {/* Balances */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Leave Balances
              </CardTitle>
              <CardDescription>View remaining leave balance for an employee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Select Employee</Label>
                <Select value={balanceUserId} onValueChange={setBalanceUserId}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Choose an employee…" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="_loading" disabled>
                        Loading employees…
                      </SelectItem>
                    ) : (
                      employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName} ({e.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {balanceUserId && employees.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const res = await fetch(`${API_URL}/hr/employees`, { headers: getAuthHeaders() });
                      if (res.ok) {
                        const data = await res.json();
                        setEmployees(
                          (data.data || []).map((e: any) => ({
                            id: e.id,
                            fullName: e.fullName || e.full_name || "",
                            email: e.email || "",
                          })),
                        );
                      }
                    }}
                  >
                    Load employees
                  </Button>
                )}
              </div>

              {!balanceUserId ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Select an employee to view their leave balances.
                </p>
              ) : balancesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : balances.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No leave balances found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="text-center">Allowed</TableHead>
                      <TableHead className="text-center">Used</TableHead>
                      <TableHead className="text-center">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((b) => (
                      <TableRow key={b.leaveTypeId}>
                        <TableCell className="font-medium">{b.leaveTypeName}</TableCell>
                        <TableCell className="text-center">{b.totalDays}</TableCell>
                        <TableCell className="text-center">{b.usedDays}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              b.remainingDays <= 0
                                ? "bg-red-100 text-red-700"
                                : b.remainingDays <= 2
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                            }
                          >
                            {b.remainingDays}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve / Reject Notes Dialog */}
      <Dialog
        open={Boolean(notesAction)}
        onOpenChange={(open) => { if (!open) setNotesAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notesAction?.action === "approve" ? "Approve Leave" : "Reject Leave"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder={
                notesAction?.action === "approve"
                  ? "e.g. Approved. Enjoy your leave!"
                  : "e.g. Please reapply for a different period."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesAction(null)}>
              Cancel
            </Button>
            <Button
              variant={notesAction?.action === "reject" ? "destructive" : "default"}
              onClick={handleNotesSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {notesAction?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Leave Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select
                value={createForm.targetUserId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, targetUserId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} ({e.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select
                value={createForm.leaveTypeId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, leaveTypeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type…" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name} ({lt.daysAllowed} days/yr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="Optional reason…"
                value={createForm.reason}
                onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLeave} disabled={createLoading}>
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveTable({
  leaves,
  showStatus = false,
}: {
  leaves: LeaveRequest[];
  showStatus?: boolean;
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
                {showStatus && <TableHead>Status</TableHead>}
                <TableHead>Notes</TableHead>
                <TableHead>Actioned By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <div className="font-medium">{leave.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{leave.employeeEmail}</div>
                  </TableCell>
                  <TableCell>{leave.leaveTypeName}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{leave.totalDays}</TableCell>
                  {showStatus && <TableCell>{getStatusBadge(leave.status)}</TableCell>}
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                    {leave.hrNotes || "—"}
                  </TableCell>
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
