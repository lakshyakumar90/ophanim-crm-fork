"use client";

import { useState } from "react";
import useSWR from "swr";
import { emailRequestsApi, type EmailRequest } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Plus,
  MoreVertical,
  Eye,
  Check,
  X,
  Send,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function EmailRequestsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["email-requests", statusFilter] : null,
    () =>
      emailRequestsApi
        .list({
          status: statusFilter !== "all" ? statusFilter : undefined,
          limit: 50,
        })
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleApprove = async (id: string) => {
    try {
      await emailRequestsApi.approve(id);
      toast.success("Email request approved");
      mutate();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await emailRequestsApi.reject(id, reason);
      toast.success("Email request rejected");
      mutate();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const handleSend = async (id: string) => {
    try {
      await emailRequestsApi.send(id);
      toast.success("Email sent successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const requests = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Requests
          </h1>
          <p className="text-muted-foreground">
            Manage finance email approvals and sending
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/finance/emails/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Email
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No email requests found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request: EmailRequest) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {request.subject}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{request.recipient_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.recipient_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {request.email_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[request.status]} border-0`}
                    >
                      {request.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/finance/emails/${request.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {request.status === "pending_approval" &&
                          (isAdmin || isManager) && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReject(request.id)}
                                className="text-destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        {request.status === "approved" &&
                          request.sender_id === user?.id && (
                            <DropdownMenuItem
                              onClick={() => handleSend(request.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
