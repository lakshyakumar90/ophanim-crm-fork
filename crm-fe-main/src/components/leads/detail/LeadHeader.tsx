"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Building,
  AlertTriangle,
  Users,
} from "lucide-react";
import type { Lead } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/lead-status-config";
import { SetReminderButton } from "@/components/leads/lead-reminder-widget";

interface LeadHeaderProps {
  lead: Lead;
  leadId: string;
  isAdmin: boolean;
  canEditLead: boolean;
  isDuplicateLead: boolean;
  onOpenReassign: () => void;
  createReminder: (input: { reminderAt: string; note?: string }) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function LeadHeader({
  lead,
  leadId,
  isAdmin,
  canEditLead,
  isDuplicateLead,
  onOpenReassign,
  createReminder,
  onRefresh,
}: LeadHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/sales/leads`)}
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
            {isDuplicateLead && (
              <Link href="/sales/duplicate-leads">
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Duplicate Lead
                </Badge>
              </Link>
            )}
          </div>
          {lead.businessName && (
            <p className="text-slate-600 flex items-center gap-1 mt-1 text-sm">
              <Building className="h-4 w-4 shrink-0" />
              <span className="truncate">{lead.businessName}</span>
            </p>
          )}
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
        <SetReminderButton
          leadId={leadId}
          onCreateReminder={createReminder}
          onRefresh={onRefresh}
        />
        {isAdmin && (
          <Button variant="outline" onClick={onOpenReassign}>
            <Users className="w-4 h-4 mr-2" />
            {lead.assignedTo ? "Reassign" : "Assign"}
          </Button>
        )}
        {canEditLead && (
          <Button onClick={() => router.push(`/sales/leads/${leadId}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Lead
          </Button>
        )}
      </div>
    </div>
  );
}
