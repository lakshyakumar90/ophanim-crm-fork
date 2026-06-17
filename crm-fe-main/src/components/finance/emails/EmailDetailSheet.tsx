"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Check, Send, X } from "lucide-react";
import { emailRequestsApi, type EmailRequest } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function EmailDetailSheet({
  emailId,
  open,
  onOpenChange,
  onUpdated,
}: {
  emailId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const { data: emailRequest, isLoading, mutate } = useSWR<EmailRequest>(
    user && emailId && open ? ["email-request", emailId] : null,
    () => emailRequestsApi.get(emailId!),
  );

  const refresh = async () => {
    await mutate();
    onUpdated?.();
  };

  const handleApprove = async () => {
    if (!emailId) return;
    try {
      await emailRequestsApi.approve(emailId);
      toast.success("Email approved");
      refresh();
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!emailId) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await emailRequestsApi.reject(emailId, reason);
      toast.success("Email rejected");
      refresh();
    } catch {
      toast.error("Failed to reject");
    }
  };

  const handleSend = async () => {
    if (!emailId) return;
    try {
      await emailRequestsApi.send(emailId);
      toast.success("Email sent");
      refresh();
    } catch {
      toast.error("Failed to send");
    }
  };

  const handleSubmit = async () => {
    if (!emailId) return;
    try {
      await emailRequestsApi.submit(emailId);
      toast.success("Submitted for approval");
      refresh();
    } catch {
      toast.error("Failed to submit");
    }
  };

  const canApprove =
    emailRequest &&
    (isAdmin || isManager) &&
    emailRequest.status === "pending_approval";
  const canSubmit = emailRequest?.status === "draft";
  const canSend =
    emailRequest?.status === "approved" && emailRequest.sender_id === user?.id;

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={emailRequest?.subject || "Email request"}
      description={
        emailRequest
          ? `Created ${format(new Date(emailRequest.created_at), "dd MMM yyyy")}`
          : undefined
      }
      size="lg"
      footer={
        emailRequest ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canSubmit && (
              <Button variant="outline" onClick={handleSubmit}>
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            )}
            {canApprove && (
              <>
                <Button variant="outline" className="text-destructive" onClick={handleReject}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {canSend && (
              <Button onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" />
                Send now
              </Button>
            )}
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !emailRequest ? (
        <p className="text-muted-foreground text-sm">Email request not found.</p>
      ) : (
        <div className="space-y-5 text-sm">
          <Badge className={`${STATUS_COLORS[emailRequest.status]} border-0 capitalize`}>
            {emailRequest.status.replace("_", " ")}
          </Badge>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">
                {emailRequest.email_type.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sender</p>
              <p className="font-medium">
                {(emailRequest.sender as { full_name?: string })?.full_name || "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Recipient</p>
            <p className="font-medium">{emailRequest.recipient_name || "—"}</p>
            <p className="text-muted-foreground">{emailRequest.recipient_email}</p>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Body</p>
            <div className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
              {emailRequest.body}
            </div>
          </div>

          {emailRequest.status === "rejected" && emailRequest.rejection_reason && (
            <div className="rounded-lg border border-rose-200 p-3 text-rose-600 dark:border-rose-800">
              <p className="font-medium">Rejection reason</p>
              <p>{emailRequest.rejection_reason}</p>
            </div>
          )}
        </div>
      )}
    </FormSideSheet>
  );
}
