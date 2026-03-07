"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { emailRequestsApi, type EmailRequest } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Check, X, Send, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function EmailRequestDetailPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const params = useParams();
  const emailId = params.id as string;

  const {
    data: emailRequest,
    isLoading,
    mutate,
  } = useSWR<EmailRequest>(
    user && emailId ? ["email-request", emailId] : null,
    () => emailRequestsApi.get(emailId),
  );

  const refreshEmailRequest = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshEmailRequest,
    enabled: Boolean(user && emailId),
  });

  const handleApprove = async () => {
    try {
      await emailRequestsApi.approve(emailId);
      toast.success("Email approved");
      mutate();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await emailRequestsApi.reject(emailId, reason);
      toast.success("Email rejected");
      mutate();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const handleSend = async () => {
    try {
      await emailRequestsApi.send(emailId);
      toast.success("Email sent successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const handleSubmit = async () => {
    try {
      await emailRequestsApi.submit(emailId);
      toast.success("Submitted for approval");
      mutate();
    } catch (error) {
      toast.error("Failed to submit");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!emailRequest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Email request not found</p>
        <Link href="/finance/emails">
          <Button variant="link">Back to Emails</Button>
        </Link>
      </div>
    );
  }

  const canApprove =
    (isAdmin || isManager) && emailRequest.status === "pending_approval";
  const canSubmit = emailRequest.status === "draft";
  const canSend =
    emailRequest.status === "approved" && emailRequest.sender_id === user?.id;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/emails">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Email Request
            </h1>
            <p className="text-muted-foreground">{emailRequest.subject}</p>
          </div>
          <Badge
            className={`${STATUS_COLORS[emailRequest.status]} border-0 ml-2`}
          >
            {emailRequest.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <Button variant="outline" onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                variant="outline"
                onClick={handleReject}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          {canSend && (
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          )}
        </div>
      </div>

      {/* Email Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">
                {emailRequest.email_type.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(emailRequest.created_at), "dd MMM yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sender</p>
              <p className="font-medium">
                {(emailRequest.sender as any)?.full_name || "—"}
              </p>
            </div>
            {emailRequest.sent_at && (
              <div>
                <p className="text-muted-foreground">Sent At</p>
                <p className="font-medium">
                  {format(new Date(emailRequest.sent_at), "dd MMM yyyy HH:mm")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recipient */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span>{" "}
            {emailRequest.recipient_name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {emailRequest.recipient_email}
          </p>
        </CardContent>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{emailRequest.subject}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Body</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap text-sm">
            {emailRequest.body}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Info */}
      {emailRequest.status === "rejected" && emailRequest.rejection_reason && (
        <Card className="border-rose-200 dark:border-rose-800">
          <CardHeader>
            <CardTitle className="text-base text-rose-600">
              Rejection Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-rose-600">{emailRequest.rejection_reason}</p>
            {emailRequest.approver && (
              <p className="text-sm text-muted-foreground mt-2">
                Rejected by {(emailRequest.approver as any)?.full_name}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Info */}
      {emailRequest.status === "failed" && emailRequest.error_message && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-base text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{emailRequest.error_message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
