"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Eye,
  GitBranch,
  Video,
  PartyPopper,
} from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { Candidate } from "@/types/recruitment";
import { formatRelativeTime } from "@/lib/recruitment-format";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/types/recruitment";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function sourceLabel(s: string | null | undefined) {
  if (!s) return null;
  return s.replace(/_/g, " ");
}

export function CandidateCard({
  candidate,
  canManage,
  onView,
  onMoveStage,
  onScheduleInterview,
  dragHandleProps,
  isDragging,
}: {
  candidate: Candidate;
  canManage: boolean;
  onView: () => void;
  onMoveStage: () => void;
  onScheduleInterview: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
}) {
  const hired = candidate.stage === "hired";
  const rejected = candidate.stage === "rejected";
  const onHold = candidate.stage === "on_hold";

  return (
    <div
      {...(canManage && dragHandleProps ? dragHandleProps : {})}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow",
        isDragging && "ring-2 ring-primary/30 shadow-md",
        hired &&
          "border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-800",
        rejected && "opacity-60 border-muted bg-muted/30",
        onHold && "border-amber-200 bg-amber-50/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              className={cn(
                "text-[10px]",
                hired ? "bg-emerald-200 text-emerald-900" : "bg-primary/10",
              )}
            >
              {initials(candidate.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">
              {candidate.full_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {candidate.email || "—"}
            </p>
          </div>
        </div>
        {hired && (
          <Badge className="shrink-0 bg-emerald-600 gap-0.5">
            <PartyPopper className="h-3 w-3" />
            Hired
          </Badge>
        )}
        {onHold && (
          <Badge variant="outline" className="text-amber-800 border-amber-300 shrink-0">
            On hold
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>Applied {formatRelativeTime(candidate.applied_at)}</span>
        {candidate.source && (
          <Badge variant="secondary" className="text-[10px] font-normal capitalize">
            {sourceLabel(candidate.source)}
          </Badge>
        )}
      </div>

      {hired && (
        <p className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-200">
          User account created. Onboarding checklist initialized.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          aria-label="View candidate"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManage && !hired && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage();
              }}
              aria-label="Move stage"
            >
              <GitBranch className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onScheduleInterview();
              }}
              aria-label="Schedule interview"
            >
              <Video className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function stageTitle(id: string) {
  return PIPELINE_STAGES.find((s) => s.id === id)?.label || id;
}
