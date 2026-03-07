"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { leadsApi, usersApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { toast } from "sonner";
import { UserSelector } from "@/components/shared/user-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Globe,
  User,
  Loader2,
  UserPlus,
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Bell,
} from "lucide-react";
import type { Lead, LeadActivity, LeadStatus } from "@/types";
import {
  Phone as PhoneIcon,
  Mail as MailIcon,
  Users,
  FileText,
  ArrowRightLeft,
  CheckCircle,
  Clock,
} from "lucide-react";

import {
  getAllStatuses,
  getStatusColor,
  getStatusLabel,
} from "@/lib/lead-status-config";
import { toLocaleDateStringIST, toLocaleStringIST } from "@/lib/date-utils";
import {
  LeadReminderWidget,
  SetReminderButton,
} from "@/components/leads/lead-reminder-widget";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { cn } from "@/lib/utils";

const activityTypeIcons: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  call: { icon: PhoneIcon, color: "bg-green-500" },
  email: { icon: MailIcon, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  note: { icon: FileText, color: "bg-gray-500" },
  status_change: { icon: ArrowRightLeft, color: "bg-primary" },
  assignment: { icon: ArrowRightLeft, color: "bg-cyan-500" },
  assign: { icon: ArrowRightLeft, color: "bg-cyan-500" },
  task_created: { icon: CheckCircle, color: "bg-emerald-500" },
  create: { icon: CheckCircle, color: "bg-emerald-500" },
  update: { icon: Pencil, color: "bg-primary" },
};

// Helper to format status/field values
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "string") {
    // Convert snake_case to Title Case
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  return String(value);
}

// Helper to format activity description
function formatActivityDescription(activity: LeadActivity): string | null {
  // Use metadata if available (from lead_activities table)
  if (activity.metadata) {
    const meta = activity.metadata as Record<string, unknown>;
    if (meta.from_status && meta.to_status) {
      return `${formatValue(meta.from_status)} → ${formatValue(meta.to_status)}`;
    }
  }
  return activity.description;
}

export default function LeadDetailPage() {
  const { id, slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  // Assignment state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);

  // Status change state
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showNlaDialog, setShowNlaDialog] = useState(false);
  const [nlaReason, setNlaReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  // Mobile comments panel state
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);

  const {
    data: leadData,
    isLoading: loadingLead,
    mutate: mutateLead,
  } = useSWR(id ? `lead-${id}` : null, () =>
    leadsApi.get(id as string),
  );

  const {
    data: activitiesData,
    isLoading: loadingActivities,
    mutate: mutateActivities,
  } = useSWR(id ? `lead-activities-${id}` : null, () =>
    leadsApi.getActivities(id as string),
  );

  // Fetch comments
  const { data: commentsData, mutate: mutateComments } = useSWR(
    id ? `lead-comments-${id}` : null,
    () => leadsApi.getComments(id as string),
  );

  // Fetch reminders for this lead
  const { data: remindersData, mutate: mutateReminders } = useSWR(
    id ? `lead-reminders-${id}` : null,
    () => leadsApi.getReminders(id as string),
  );

  // Fetch users list for admin assignment - filter to sales department only
  const { data: usersData, isLoading: loadingUsers } = useSWR(
    isAdmin ? "users-list-sales" : null,
    () =>
      usersApi
        .list({ limit: 100, departmentSlug: "sales" }),
  );

  const refreshLeadData = useCallback(async () => {
    await Promise.all([
      mutateLead(),
      mutateActivities(),
      mutateComments(),
      mutateReminders(),
    ]);
  }, [mutateActivities, mutateComments, mutateLead, mutateReminders]);

  useHeaderRefresh({
    onRefresh: refreshLeadData,
    enabled: Boolean(id),
  });

  // Handle the nested data structure properly - filter to active sales employees
  const allUsers = usersData?.data || [];
  const users = Array.isArray(allUsers)
    ? allUsers.filter(
        (u: any) =>
          u.isActive && (u.departmentSlug === "sales" || u.role === "admin"),
      )
    : [];
  const lead = leadData as Lead | undefined;
  const activities = (activitiesData || []) as LeadActivity[];
  const comments = (commentsData || []) as any[];

  // Process reminders - show all reminders not marked as done
  // This includes overdue reminders (where time has passed but user hasn't marked done)
  const reminders = (remindersData || []) as any[];
  const pendingReminders = reminders.filter((r: any) => !r.isDone);

  // Check if a reminder is overdue (time has passed)
  const isReminderOverdue = (reminderAt: string) => {
    return new Date(reminderAt).getTime() < Date.now();
  };

  // Handle marking reminder as done
  const handleMarkReminderDone = async (reminderId: string) => {
    try {
      await leadsApi.markReminderDone(reminderId);
      toast.success("Reminder marked as done");
      mutateReminders();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          "Failed to mark reminder as done",
      );
    }
  };

  // Handle lead assignment/reassignment
  const handleAssign = async () => {
    if (!selectedUserId || !id) return;

    setIsAssigning(true);
    try {
      await leadsApi.assign(id as string, selectedUserId);
      toast.success("Lead assigned successfully");
      setSelectedUserId("");
      setIsReassignDialogOpen(false);
      mutateLead();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to assign lead";
      toast.error(message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!id || !lead || lead.status === newStatus) return;

    // If changing to NLA, show dialog to get reason
    if (newStatus === "not_a_lead") {
      setPendingStatus(newStatus);
      setShowNlaDialog(true);
      return;
    }

    // For other statuses, proceed directly
    await performStatusChange(newStatus);
  };

  // Perform the actual status change
  const performStatusChange = async (newStatus: string, reason?: string) => {
    setIsChangingStatus(true);
    try {
      await leadsApi.updateStatus(id as string, newStatus, reason);
      toast.success("Status updated successfully");
      mutateLead();
      mutateActivities();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to update status";
      toast.error(message);
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Handle NLA dialog submit
  const handleNlaSubmit = async () => {
    if (!nlaReason.trim()) {
      toast.error("Please provide a reason for marking as Not A Lead");
      return;
    }

    if (pendingStatus) {
      await performStatusChange(pendingStatus, nlaReason.trim());
    }

    // Reset dialog state
    setShowNlaDialog(false);
    setNlaReason("");
    setPendingStatus(null);
  };

  // Handle NLA dialog cancel
  const handleNlaCancel = () => {
    setShowNlaDialog(false);
    setNlaReason("");
    setPendingStatus(null);
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !id) return;

    setIsAddingComment(true);
    try {
      await leadsApi.addComment(id as string, newComment.trim());
      toast.success("Comment added");
      setNewComment("");
      mutateComments();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to add comment";
      toast.error(message);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handle update comment (admin only)
  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim() || !id) return;

    try {
      await leadsApi.updateComment(
        id as string,
        commentId,
        editingCommentContent.trim(),
      );
      toast.success("Comment updated");
      setEditingCommentId(null);
      setEditingCommentContent("");
      mutateComments();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to update comment";
      toast.error(message);
    }
  };

  // Handle delete comment (admin only)
  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;

    try {
      await leadsApi.deleteComment(id as string, commentId);
      toast.success("Comment deleted");
      mutateComments();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to delete comment";
      toast.error(message);
    }
  };

  if (loadingLead) {
    return <LeadDetailSkeleton />;
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Lead not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${slug}/leads`)}
        >
          Back to Leads
        </Button>
      </div>
    );
  }

  const canEditLead = isAdmin || lead.assignedTo === user?.id;

  return (
    <div className="min-h-screen">
      {/* Main content - full width */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${slug}/leads`)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                  {lead.leadName}
                </h1>
                <Badge
                  className={getStatusColor(lead.status)}
                  variant="secondary"
                >
                  {getStatusLabel(lead.status)}
                </Badge>
              </div>
              {lead.businessName && (
                <p className="text-slate-600 flex items-center gap-1 mt-1 text-sm">
                  <Building className="h-4 w-4 shrink-0" />
                  <span className="truncate">{lead.businessName}</span>
                </p>
              )}
              {/* Assignment Status */}
              <div className="flex items-center gap-2 mt-1">
                {lead.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={lead.assignee.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {lead.assignee.fullName?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-600">
                      {lead.assignee.fullName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 text-xs"
                    >
                      Assigned
                    </Badge>
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 text-xs"
                  >
                    Unassigned
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SetReminderButton leadId={id as string} />
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUserId(lead.assignedTo || "");
                  setIsReassignDialogOpen(true);
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                {lead.assignedTo ? "Reassign" : "Assign"}
              </Button>
            )}
            {canEditLead && (
              <Button onClick={() => router.push(`/${slug}/leads/${id}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            )}
          </div>
        </div>

        {/* Reminder Banner - Show if lead has pending reminders */}
        {pendingReminders.length > 0 && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-800">
                {pendingReminders.length} Active Reminder
                {pendingReminders.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {pendingReminders.map((reminder: any) => {
                const isOverdue = isReminderOverdue(reminder.reminderAt);
                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md",
                      isOverdue
                        ? "bg-red-100 border border-red-300"
                        : "bg-amber-100 border border-amber-300",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Clock
                        className={cn(
                          "h-4 w-4",
                          isOverdue ? "text-red-600" : "text-amber-600",
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "font-medium text-sm",
                            isOverdue ? "text-red-800" : "text-amber-800",
                          )}
                        >
                          {isOverdue ? "OVERDUE: " : ""}
                          {toLocaleStringIST(reminder.reminderAt)}
                        </p>
                        {reminder.note && (
                          <p className="text-sm text-slate-600 mt-0.5">
                            {reminder.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "shrink-0",
                        isOverdue
                          ? "border-red-400 text-red-700 hover:bg-red-200"
                          : "border-amber-400 text-amber-700 hover:bg-amber-200",
                      )}
                      onClick={() => handleMarkReminderDone(reminder.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs: Info and Activities */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="w-auto">
            <TabsTrigger value="info" className="flex-1 sm:flex-none">
              Info
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex-1 sm:flex-none">
              Activities
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-4">
            {/* 30% Info & Context / 70% Comments layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-4">
              {/* Left Column: Info + Context & Feedback (30%) */}
              <div className="space-y-4">
                {/* Info Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Section */}
                    <div className="space-y-2">
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-blue-600 hover:underline text-sm truncate"
                          >
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      {lead.country && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-sm">{lead.country}</span>
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                          <a
                            href={
                              lead.website.startsWith("http")
                                ? lead.website
                                : `https://${lead.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm truncate"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm flex-1">
                          Timezone: {lead.timezone || "NA"}
                        </span>
                        {canEditLead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => router.push(`/${slug}/leads/${id}/edit`)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Details Section */}
                    <div className="space-y-2">
                      {lead.source && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="capitalize text-sm">
                            Source: {lead.source.replace("_", " ")}
                          </span>
                        </div>
                      )}
                      {lead.leadType && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="capitalize text-sm">
                            Type: {lead.leadType.replace("_", " ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm">
                          Created {toLocaleDateStringIST(lead.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Status Section */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        Status:
                      </span>
                      <Select
                        value={lead.status}
                        onValueChange={handleStatusChange}
                        disabled={isChangingStatus}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllStatuses().map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isChangingStatus && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Assigned To Section */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        Assigned To:
                      </span>
                      {lead.assignee ? (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={lead.assignee.avatarUrl || undefined}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {lead.assignee.fullName
                                ?.substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {lead.assignee.fullName}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="ml-auto bg-green-100 text-green-700"
                          >
                            Assigned
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <User className="h-5 w-5 text-slate-400" />
                          <span className="text-sm text-slate-500 italic">
                            Not assigned
                          </span>
                          <Badge
                            variant="secondary"
                            className="ml-auto bg-amber-100 text-amber-700"
                          >
                            Unassigned
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Context & Feedback Card */}
                <Card className="min-h-[300px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Context & Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lead.nalReason && (
                      <div className="text-sm">
                        <span className="text-slate-500 font-medium">
                          NAL Reason:
                        </span>
                        <p className="mt-1 text-slate-700">{lead.nalReason}</p>
                      </div>
                    )}
                    {lead.clientResponse && (
                      <div className="text-sm">
                        <span className="text-slate-500 font-medium">
                          Client Response:
                        </span>
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                          {lead.clientResponse}
                        </p>
                      </div>
                    )}
                    {!lead.nalReason && !lead.clientResponse && (
                      <p className="text-sm text-slate-400 italic">
                        No additional context available.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Reminders Card */}
                <LeadReminderWidget leadId={id as string} />
              </div>

              {/* Right Column: Comments (70%) */}
              <Card>
                <CardContent className="pt-6">
                  <CommentsPanel
                    comments={comments}
                    isAdmin={isAdmin}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    isAddingComment={isAddingComment}
                    handleAddComment={handleAddComment}
                    editingCommentId={editingCommentId}
                    editingCommentContent={editingCommentContent}
                    setEditingCommentId={setEditingCommentId}
                    setEditingCommentContent={setEditingCommentContent}
                    handleUpdateComment={handleUpdateComment}
                    handleDeleteComment={handleDeleteComment}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">
                    No activities yet
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-4">
                      {activities.map((activity) => {
                        const activityConfig = activityTypeIcons[
                          activity.activityType
                        ] || {
                          icon: Clock,
                          color: "bg-slate-500",
                        };
                        const ActivityIcon = activityConfig.icon;

                        return (
                          <div
                            key={activity.id}
                            className="flex gap-3 relative"
                          >
                            <div
                              className={`w-6 h-6 rounded-full ${activityConfig.color} flex items-center justify-center shrink-0 z-10`}
                            >
                              <ActivityIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-lg p-3 border min-w-0">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {activity.user && (
                                      <span className="text-xs font-medium text-slate-600">
                                        {activity.user.fullName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-medium text-slate-900 text-sm">
                                    {activity.title}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-xs mt-1"
                                  >
                                    {activity.activityType.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {toLocaleStringIST(activity.createdAt)}
                                </span>
                              </div>
                              {(activity.metadata || activity.description) && (
                                <p className="text-slate-600 mt-2 text-sm">
                                  {formatActivityDescription(activity)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* NLA Reason Dialog */}
      <Dialog open={showNlaDialog} onOpenChange={setShowNlaDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark as Not A Lead</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking this lead as "Not A Lead".
              This helps track why leads were disqualified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nla-reason">Reason</Label>
              <Textarea
                id="nla-reason"
                placeholder="e.g., Wrong contact info, Not the decision maker, No budget, etc."
                value={nlaReason}
                onChange={(e) => setNlaReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleNlaCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleNlaSubmit}
              disabled={isChangingStatus || !nlaReason.trim()}
            >
              {isChangingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog
        open={isReassignDialogOpen}
        onOpenChange={setIsReassignDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Lead</DialogTitle>
            <DialogDescription>
              Assign <strong>{lead?.leadName}</strong> to another team member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={Array.isArray(users) ? users : []}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReassignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Confirm Reassignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Comments Panel Component
function CommentsPanel({
  comments,
  isAdmin,
  newComment,
  setNewComment,
  isAddingComment,
  handleAddComment,
  editingCommentId,
  editingCommentContent,
  setEditingCommentId,
  setEditingCommentContent,
  handleUpdateComment,
  handleDeleteComment,
  isMobile = false,
}: {
  comments: any[];
  isAdmin: boolean;
  newComment: string;
  setNewComment: (value: string) => void;
  isAddingComment: boolean;
  handleAddComment: () => void;
  editingCommentId: string | null;
  editingCommentContent: string;
  setEditingCommentId: (id: string | null) => void;
  setEditingCommentContent: (content: string) => void;
  handleUpdateComment: (id: string) => void;
  handleDeleteComment: (id: string) => void;
  isMobile?: boolean;
}) {
  return (
    <div className={`space-y-4 ${isMobile ? "" : "h-full flex flex-col"}`}>
      {/* Add Comment */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </h3>
        <Textarea
          placeholder="Write your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || isAddingComment}
          size="sm"
          className="w-full"
        >
          {isAddingComment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Add Comment
            </>
          )}
        </Button>
      </div>

      {/* Comments List */}
      <div className={`${isMobile ? "" : "flex-1 overflow-hidden"}`}>
        {isMobile ? (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                No comments yet
              </p>
            ) : (
              comments.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isAdmin={isAdmin}
                  editingCommentId={editingCommentId}
                  editingCommentContent={editingCommentContent}
                  setEditingCommentId={setEditingCommentId}
                  setEditingCommentContent={setEditingCommentContent}
                  handleUpdateComment={handleUpdateComment}
                  handleDeleteComment={handleDeleteComment}
                />
              ))
            )}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3 pr-4">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">
                  No comments yet. Be the first to add one!
                </p>
              ) : (
                comments.map((comment: any) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isAdmin={isAdmin}
                    editingCommentId={editingCommentId}
                    editingCommentContent={editingCommentContent}
                    setEditingCommentId={setEditingCommentId}
                    setEditingCommentContent={setEditingCommentContent}
                    handleUpdateComment={handleUpdateComment}
                    handleDeleteComment={handleDeleteComment}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// Comment Item Component
function CommentItem({
  comment,
  isAdmin,
  editingCommentId,
  editingCommentContent,
  setEditingCommentId,
  setEditingCommentContent,
  handleUpdateComment,
  handleDeleteComment,
}: {
  comment: any;
  isAdmin: boolean;
  editingCommentId: string | null;
  editingCommentContent: string;
  setEditingCommentId: (id: string | null) => void;
  setEditingCommentContent: (content: string) => void;
  handleUpdateComment: (id: string) => void;
  handleDeleteComment: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
          {comment.user?.fullName?.charAt(0) || "U"}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-medium text-slate-900 text-sm truncate">
              {comment.user?.fullName || "Unknown User"}
            </span>
            <span className="text-xs text-slate-500">
              {toLocaleStringIST(comment.createdAt)}
            </span>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex items-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setEditingCommentId(comment.id);
                  setEditingCommentContent(comment.content);
                }}
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDeleteComment(comment.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {/* Comment content or edit form */}
        {editingCommentId === comment.id ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingCommentContent}
              onChange={(e) => setEditingCommentContent(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-sm"
                onClick={() => handleUpdateComment(comment.id)}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-sm"
                onClick={() => {
                  setEditingCommentId(null);
                  setEditingCommentContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-slate-700 whitespace-pre-wrap text-sm">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
      <div className="hidden lg:block">
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
