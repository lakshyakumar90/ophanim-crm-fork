"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { leadsApi, csvApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { toast } from "sonner";
import type { Lead, LeadActivity } from "@/types";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

interface LeadReminderRecord {
  id: string;
  reminderAt: string;
  note: string | null;
  isSent: boolean;
  isDone: boolean;
}

interface LeadDetailPageData {
  lead: Lead;
  activities: LeadActivity[];
  comments: Array<Record<string, unknown>>;
  reminders: LeadReminderRecord[];
  assignableUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    avatarUrl: string | null;
  }>;
}

const LEAD_DETAIL_INITIAL_CALL_BUDGET = 3;
const INLINE_FIELD_UPDATE_DEBOUNCE_MS = 300;

export function useLeadDetail(overrideId?: string) {
  const params = useParams();
  const id = overrideId ?? (params.id as string | undefined);
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
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [nlaReason, setNlaReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  // Mobile comments panel state
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);

  // Inline field editing state
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [timezoneValue, setTimezoneValue] = useState("");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [editingClientResponse, setEditingClientResponse] = useState(false);
  const [clientResponseValue, setClientResponseValue] = useState("");
  const [isSavingClientResponse, setIsSavingClientResponse] = useState(false);
  const [editingCountry, setEditingCountry] = useState(false);
  const [countryValue, setCountryValue] = useState("");
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [editingNalReason, setEditingNalReason] = useState(false);
  const [nalReasonValue, setNalReasonValue] = useState("");
  const [isSavingNalReason, setIsSavingNalReason] = useState(false);

  const initialCallCountRef = useRef(0);
  const initialPhaseRef = useRef(true);
  const inlineUpdateTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});

  const registerApiCall = useCallback((callName: string, isInitial = false) => {
    if (process.env.NODE_ENV === "production") return;

    if (initialPhaseRef.current || isInitial) {
      initialCallCountRef.current += 1;
      if (initialCallCountRef.current > LEAD_DETAIL_INITIAL_CALL_BUDGET) {
        console.warn(
          `[LeadDetailPage] Initial API call budget exceeded (${initialCallCountRef.current}/${LEAD_DETAIL_INITIAL_CALL_BUDGET}): ${callName}`,
        );
      }
    }
  }, []);

  const {
    data: pageData,
    isLoading: loadingPageData,
    mutate: mutatePageData,
  } = useSWR<LeadDetailPageData>(id ? `lead-detail-page-data-${id}` : null, () => {
    registerApiCall("leads.getDetailPageData", true);
    return leadsApi.getDetailPageData(id as string);
  });

  // Check if this lead is a duplicate (shared SWR cache with leads list)
  const { data: duplicatesData } = useSWR(
    user ? "duplicate-leads" : null,
    async () => {
      registerApiCall("csv.getDuplicateLeads", true);
      const res = await csvApi.getDuplicateLeads();
      return (res.data?.data ?? res.data) as {
        groups: { leads: { id: string }[] }[];
      };
    },
    { revalidateOnFocus: false },
  );

  const applyOptimisticLeadPatch = useCallback(
    (patch: Partial<Lead>) => {
      mutatePageData(
        (current: LeadDetailPageData | undefined) => {
          if (!current) return current;
          return {
            ...current,
            lead: {
              ...current.lead,
              ...patch,
            },
          };
        },
        { revalidate: false },
      );
    },
    [mutatePageData],
  );

  const debouncedInlineLeadUpdate = useCallback(
    (
      fieldKey: string,
      patch: Record<string, unknown>,
      optimisticPatch: Partial<Lead>,
    ) =>
      new Promise<void>((resolve, reject) => {
        const existingTimer = inlineUpdateTimersRef.current[fieldKey];
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        applyOptimisticLeadPatch(optimisticPatch);

        inlineUpdateTimersRef.current[fieldKey] = setTimeout(async () => {
          try {
            if (!id) {
              resolve();
              return;
            }
            registerApiCall(`leads.update:${fieldKey}`);
            await leadsApi.update(id as string, patch);
            await mutatePageData();
            resolve();
          } catch (error) {
            await mutatePageData();
            reject(error);
          }
        }, INLINE_FIELD_UPDATE_DEBOUNCE_MS);
      }),
    [applyOptimisticLeadPatch, id, mutatePageData, registerApiCall],
  );

  useEffect(() => {
    if (pageData) {
      initialPhaseRef.current = false;
    }
  }, [pageData]);

  useEffect(() => {
    return () => {
      Object.values(inlineUpdateTimersRef.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);
  const isDuplicateLead = useMemo(() => {
    const groups = duplicatesData?.groups ?? [];
    return groups.some((g) => g.leads.some((l) => l.id === id));
  }, [duplicatesData, id]);

  const refreshLeadData = useCallback(async () => {
    await mutatePageData();
  }, [mutatePageData]);

  useHeaderRefresh({
    onRefresh: refreshLeadData,
    enabled: Boolean(id),
  });

  // Handle the nested data structure properly - include all active users for reassignment
  const allUsers = pageData?.assignableUsers || [];
  const users = allUsers.filter((u) => u.isActive);
  const lead = pageData?.lead;
  const activities = pageData?.activities || [];
  const comments = pageData?.comments || [];
  const reminders = pageData?.reminders || [];
  const loadingLead = loadingPageData;
  const loadingActivities = loadingPageData;

  // Process reminders - show all reminders not marked as done
  // This includes overdue reminders (where time has passed but user hasn't marked done)
  const pendingReminders = reminders.filter((r) => !r.isDone);

  // Check if a reminder is overdue (time has passed)
  const isReminderOverdue = (reminderAt: string) => {
    return new Date(reminderAt).getTime() < Date.now();
  };

  const createReminder = useCallback(
    async (input: { reminderAt: string; note?: string }) => {
      if (!id) return;
      await leadsApi.createReminder(
        id as string,
        input.reminderAt,
        input.note,
      );
      await mutatePageData();
    },
    [id, mutatePageData],
  );

  const deleteReminder = useCallback(
    async (reminderId: string) => {
      if (!id) return;
      await leadsApi.deleteReminder(id as string, reminderId);
      await mutatePageData();
    },
    [id, mutatePageData],
  );

  const markReminderDone = useCallback(
    async (reminderId: string) => {
      await leadsApi.markReminderDone(reminderId);
      await mutatePageData();
    },
    [mutatePageData],
  );

  // Handle marking reminder as done
  const handleMarkReminderDone = async (reminderId: string) => {
    try {
      await markReminderDone(reminderId);
      toast.success("Reminder marked as done");
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
      mutatePageData();
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

    // If changing to won, prompt conversion after update
    if (newStatus === "won") {
      setPendingStatus(newStatus);
      await performStatusChange(newStatus);
      setShowConvertDialog(true);
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
      mutatePageData();
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

  // Handle inline field saves
  const handleSaveTimezone = async () => {
    if (!id) return;
    setIsSavingTimezone(true);
    try {
      await debouncedInlineLeadUpdate(
        "timezone",
        { timezone: timezoneValue },
        { timezone: timezoneValue },
      );
      toast.success("Timezone updated");
      setEditingTimezone(false);
    } catch {
      toast.error("Failed to update timezone");
    } finally {
      setIsSavingTimezone(false);
    }
  };

  const handleSaveClientResponse = async () => {
    if (!id) return;
    setIsSavingClientResponse(true);
    try {
      await debouncedInlineLeadUpdate(
        "clientResponse",
        { clientResponse: clientResponseValue },
        { clientResponse: clientResponseValue },
      );
      toast.success("Client response updated");
      setEditingClientResponse(false);
    } catch {
      toast.error("Failed to update client response");
    } finally {
      setIsSavingClientResponse(false);
    }
  };

  const handleSaveCountry = async () => {
    if (!id) return;
    setIsSavingCountry(true);
    try {
      await debouncedInlineLeadUpdate(
        "country",
        { country: countryValue },
        { country: countryValue },
      );
      toast.success("Country updated");
      setEditingCountry(false);
    } catch {
      toast.error("Failed to update country");
    } finally {
      setIsSavingCountry(false);
    }
  };

  const handleSaveNalReason = async () => {
    if (!id) return;
    setIsSavingNalReason(true);
    try {
      await debouncedInlineLeadUpdate(
        "nalReason",
        { nalReason: nalReasonValue },
        { nalReason: nalReasonValue },
      );
      toast.success("NAL reason updated");
      setEditingNalReason(false);
    } catch {
      toast.error("Failed to update NAL reason");
    } finally {
      setIsSavingNalReason(false);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !id) return;

    setIsAddingComment(true);
    try {
      await leadsApi.addComment(id as string, newComment.trim());
      toast.success("Comment added");
      setNewComment("");
      mutatePageData();
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
      mutatePageData();
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
      mutatePageData();
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Failed to delete comment";
      toast.error(message);
    }
  };

  const canEditLead = isAdmin;

  return {
    id,
    router,
    user,
    isAdmin,
    selectedUserId,
    setSelectedUserId,
    isAssigning,
    isReassignDialogOpen,
    setIsReassignDialogOpen,
    isChangingStatus,
    showNlaDialog,
    setShowNlaDialog,
    nlaReason,
    setNlaReason,
    pendingStatus,
    setPendingStatus,
    newComment,
    setNewComment,
    isAddingComment,
    editingCommentId,
    editingCommentContent,
    setEditingCommentId,
    setEditingCommentContent,
    isCommentsPanelOpen,
    setIsCommentsPanelOpen,
    editingTimezone,
    setEditingTimezone,
    timezoneValue,
    setTimezoneValue,
    isSavingTimezone,
    editingClientResponse,
    setEditingClientResponse,
    clientResponseValue,
    setClientResponseValue,
    isSavingClientResponse,
    editingCountry,
    setEditingCountry,
    countryValue,
    setCountryValue,
    isSavingCountry,
    editingNalReason,
    setEditingNalReason,
    nalReasonValue,
    setNalReasonValue,
    isSavingNalReason,
    pageData,
    loadingLead,
    mutatePageData,
    isDuplicateLead,
    refreshLeadData,
    users,
    lead,
    activities,
    comments,
    reminders,
    loadingActivities,
    pendingReminders,
    isReminderOverdue,
    createReminder,
    deleteReminder,
    markReminderDone,
    handleMarkReminderDone,
    handleAssign,
    handleStatusChange,
    handleNlaSubmit,
    handleNlaCancel,
    handleSaveTimezone,
    handleSaveClientResponse,
    handleSaveCountry,
    handleSaveNalReason,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    canEditLead,
    showConvertDialog,
    setShowConvertDialog,
  };
}

export type LeadDetailState = ReturnType<typeof useLeadDetail>;
