"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { leadsApi, teamsApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { toast } from "sonner";
import type { Lead, LeadStatus } from "@/types";
import { getStatusLabel } from "@/lib/lead-status-config";
import {
  SALES_KANBAN_DEFAULT_LIMIT,
  SALES_KANBAN_LOAD_MORE_STEP,
} from "@/lib/kanban-contract";
import type { DropResult } from "@hello-pangea/dnd";
import { KANBAN_STATUSES } from "@/components/sales/leads/leads-list-constants";

export interface UseLeadsKanbanOptions {
  enabled: boolean;
  assignedToUserId: string;
  kanbanTeamId: string;
  onKanbanTeamIdChange: (value: string) => void;
  reminderLeadDetails: Lead[];
  reminderLeadPriorityIndex: Map<string, number>;
  leadsWithReminders: Set<string>;
  leadsWithOverdueReminders: Set<string>;
  onMutate?: () => void;
}

export function useLeadsKanban({
  enabled,
  assignedToUserId,
  kanbanTeamId,
  onKanbanTeamIdChange,
  reminderLeadDetails,
  reminderLeadPriorityIndex,
  leadsWithReminders,
  leadsWithOverdueReminders,
  onMutate,
}: UseLeadsKanbanOptions) {
  const isAdmin = useIsAdmin();

  const [statusLimits, setStatusLimits] = useState<Record<string, number>>(
    Object.fromEntries(
      KANBAN_STATUSES.map((s) => [s, SALES_KANBAN_DEFAULT_LIMIT]),
    ),
  );
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [isNalDialogOpen, setIsNalDialogOpen] = useState(false);
  const [nalReason, setNalReason] = useState("");
  const [pendingNalMove, setPendingNalMove] = useState<{
    leadId: string;
    newStatus: LeadStatus;
  } | null>(null);

  const { data: teamsData } = useSWR(isAdmin ? "teams-list" : null, () =>
    teamsApi.list(),
  );
  const teams = teamsData || [];

  const kanbanFilterParams = useMemo(
    () => ({
      assignedTo:
        assignedToUserId !== "all" && assignedToUserId !== "_unassigned"
          ? assignedToUserId
          : undefined,
      assigned:
        assignedToUserId === "_unassigned"
          ? ("unassigned" as const)
          : undefined,
      teamId: kanbanTeamId !== "all" ? kanbanTeamId : undefined,
    }),
    [assignedToUserId, kanbanTeamId],
  );

  const {
    data: kanbanData,
    isLoading: kanbanLoading,
    isValidating: kanbanValidating,
    mutate: kanbanMutate,
  } = useSWR(
    enabled
      ? [
          "kanban-leads",
          assignedToUserId,
          kanbanTeamId,
          JSON.stringify(statusLimits),
        ]
      : null,
    async () => {
      const results = await Promise.all(
        KANBAN_STATUSES.map(async (statusValue) => {
          const limit = statusLimits[statusValue] || SALES_KANBAN_DEFAULT_LIMIT;
          const res = await leadsApi.list({
            limit,
            page: 1,
            status: statusValue,
            ...kanbanFilterParams,
          });
          return {
            status: statusValue,
            leads: (res.data || []) as Lead[],
            total: res.meta?.total || 0,
          };
        }),
      );
      return results;
    },
    {
      keepPreviousData: true,
    },
  );

  const leads = kanbanData?.flatMap((s) => s.leads) || [];
  const kanbanTotalLeads =
    kanbanData?.reduce((sum, s) => sum + s.total, 0) || 0;
  const isInitialKanbanLoading = kanbanLoading && !kanbanData;

  const getLeadsByStatus = useCallback(
    (statusValue: LeadStatus) => {
      let statusLeads: Lead[];
      if (kanbanData) {
        const entry = kanbanData.find((s) => s.status === statusValue);
        const baseStatusLeads = [...(entry?.leads || [])];
        if (kanbanTeamId !== "all") {
          statusLeads = baseStatusLeads;
        } else {
          const reminderStatusLeads = reminderLeadDetails
            .filter((lead: Lead) => {
              if (lead.status !== statusValue) return false;
              if (
                assignedToUserId !== "all" &&
                assignedToUserId !== "_unassigned" &&
                lead.assignedTo !== assignedToUserId
              ) {
                return false;
              }
              if (assignedToUserId === "_unassigned" && lead.assignedTo)
                return false;
              return true;
            })
            .sort(
              (a: Lead, b: Lead) =>
                (reminderLeadPriorityIndex.get(a.id) ??
                  Number.MAX_SAFE_INTEGER) -
                (reminderLeadPriorityIndex.get(b.id) ??
                  Number.MAX_SAFE_INTEGER),
            );
          const merged = new Map<string, Lead>();
          for (const lead of [...reminderStatusLeads, ...baseStatusLeads]) {
            if (!merged.has(lead.id)) merged.set(lead.id, lead);
          }
          statusLeads = [...merged.values()];
        }
      } else {
        statusLeads = leads.filter((lead: Lead) => lead.status === statusValue);
      }
      statusLeads.sort((a: Lead, b: Lead) => {
        const aOverdue = leadsWithOverdueReminders.has(a.id) ? 0 : 1;
        const bOverdue = leadsWithOverdueReminders.has(b.id) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        const aReminder = leadsWithReminders.has(a.id) ? 0 : 1;
        const bReminder = leadsWithReminders.has(b.id) ? 0 : 1;
        return aReminder - bReminder;
      });
      return statusLeads;
    },
    [
      kanbanData,
      kanbanTeamId,
      reminderLeadDetails,
      assignedToUserId,
      reminderLeadPriorityIndex,
      leads,
      leadsWithOverdueReminders,
      leadsWithReminders,
    ],
  );

  const getTotalCountByStatus = useCallback(
    (statusValue: LeadStatus) => {
      if (kanbanData) {
        const entry = kanbanData.find((s) => s.status === statusValue);
        return entry?.total || 0;
      }
      return leads.filter((lead: Lead) => lead.status === statusValue).length;
    },
    [kanbanData, leads],
  );

  const loadMoreForStatus = (statusValue: LeadStatus) => {
    setStatusLimits((prev) => ({
      ...prev,
      [statusValue]:
        (prev[statusValue] || SALES_KANBAN_DEFAULT_LIMIT) +
        SALES_KANBAN_LOAD_MORE_STEP,
    }));
  };

  const performStatusUpdate = async (
    leadId: string,
    newStatus: LeadStatus,
    reason?: string,
  ) => {
    setUpdatingLeadId(leadId);

    if (kanbanData) {
      let leadToMove: Lead | null = null;
      const optimistic = kanbanData.map((entry) => {
        const found = entry.leads.find((l: Lead) => l.id === leadId);
        if (found) leadToMove = found;
        return {
          ...entry,
          leads: entry.leads.filter((l: Lead) => l.id !== leadId),
          total: found ? entry.total - 1 : entry.total,
        };
      });
      if (leadToMove) {
        const destIdx = optimistic.findIndex((e) => e.status === newStatus);
        if (destIdx >= 0) {
          optimistic[destIdx] = {
            ...optimistic[destIdx],
            leads: [
              { ...(leadToMove as Lead), status: newStatus },
              ...optimistic[destIdx].leads,
            ],
            total: optimistic[destIdx].total + 1,
          };
        }
      }
      kanbanMutate(optimistic, false);
    }

    try {
      await leadsApi.updateStatus(leadId, newStatus, reason);
      toast.success(`Lead moved to ${getStatusLabel(newStatus)}`);
      await kanbanMutate();
      onMutate?.();
    } catch {
      toast.error("Failed to update lead status");
      await kanbanMutate();
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as LeadStatus;
    const leadId = draggableId;

    const leadToUpdate = leads.find((l: Lead) => l.id === leadId);
    if (!leadToUpdate) return;

    if (destination.droppableId === source.droppableId) {
      return;
    }

    if (newStatus === "not_a_lead") {
      setPendingNalMove({ leadId, newStatus });
      setNalReason("");
      setIsNalDialogOpen(true);
      return;
    }

    await performStatusUpdate(leadId, newStatus);
  };

  const handleNalConfirm = async () => {
    if (!pendingNalMove || nalReason.trim().length < 3) {
      toast.error("Reason must be at least 3 characters");
      return;
    }
    setIsNalDialogOpen(false);
    await performStatusUpdate(
      pendingNalMove.leadId,
      pendingNalMove.newStatus,
      nalReason.trim(),
    );
    setPendingNalMove(null);
    setNalReason("");
  };

  const handleNalCancel = () => {
    setIsNalDialogOpen(false);
    setPendingNalMove(null);
    setNalReason("");
  };

  return {
    teams,
    kanbanTeamId,
    setKanbanTeamId: onKanbanTeamIdChange,
    kanbanData,
    kanbanLoading,
    kanbanValidating,
    kanbanMutate,
    kanbanTotalLeads,
    isInitialKanbanLoading,
    updatingLeadId,
    isNalDialogOpen,
    setIsNalDialogOpen,
    nalReason,
    setNalReason,
    handleDragEnd,
    handleNalConfirm,
    handleNalCancel,
    getLeadsByStatus,
    getTotalCountByStatus,
    loadMoreForStatus,
    leadsWithReminders,
    leadsWithOverdueReminders,
  };
}
