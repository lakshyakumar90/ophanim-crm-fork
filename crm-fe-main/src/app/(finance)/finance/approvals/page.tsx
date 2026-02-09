"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  approvalsApi,
  invoicesApi,
  expensesApi,
  emailRequestsApi,
} from "@/lib/finance-api";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck,
  FileText,
  Receipt,
  Mail,
  Check,
  X,
  RefreshCw,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading, mutate } = useSWR(
    user ? ["approvals", activeTab] : null,
    () =>
      approvalsApi
        .list({
          type: activeTab !== "all" ? activeTab : undefined,
          limit: 50,
        })
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleApprove = async (approval: any) => {
    try {
      switch (approval.approval_type) {
        case "invoice":
          await invoicesApi.approve(approval.entity_id);
          break;
        case "expense":
          await expensesApi.approve(approval.entity_id);
          break;
        case "email":
          await emailRequestsApi.approve(approval.entity_id);
          break;
      }
      toast.success("Approved successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (approval: any) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      switch (approval.approval_type) {
        case "invoice":
          await invoicesApi.reject(approval.entity_id, reason);
          break;
        case "expense":
          await expensesApi.reject(approval.entity_id, reason);
          break;
        case "email":
          await emailRequestsApi.reject(approval.entity_id, reason);
          break;
      }
      toast.success("Rejected successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const approvals = data?.data || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return <FileText className="h-4 w-4" />;
      case "expense":
        return <Receipt className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      default:
        return <ClipboardCheck className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "invoice":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "expense":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
      case "email":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Approvals
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending items
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="email">Emails</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-emerald-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground">
                  No pending approvals at this time
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval: any) => (
                <Card key={approval.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${getTypeColor(
                          approval.approval_type,
                        )}`}
                      >
                        {getTypeIcon(approval.approval_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {approval.approval_type}
                          </Badge>
                          {approval.entity && (
                            <span className="font-medium">
                              {approval.entity.invoice_number ||
                                approval.entity.expense_number ||
                                approval.entity.subject ||
                                "—"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>
                            Requested by{" "}
                            {approval.requester?.full_name || "Unknown"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(
                              new Date(approval.requested_at),
                              "dd MMM yyyy HH:mm",
                            )}
                          </span>
                        </div>
                        {approval.entity?.total_amount && (
                          <p className="text-sm font-medium mt-1">
                            Amount: ₹
                            {Number(
                              approval.entity.total_amount ||
                                approval.entity.amount,
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(approval)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
