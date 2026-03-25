"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { Candidate } from "@/types/recruitment";
import { PIPELINE_STAGES } from "@/types/recruitment";
import { CandidateCard, stageTitle } from "./CandidateCard";
import { cn } from "@/lib/utils";
import { moveCandidateStageAction } from "@/hooks/useCandidates";

export function CandidateKanbanBoard({
  candidates,
  canManage,
  onViewCandidate,
  onMoveStage,
  onScheduleInterview,
  onRefresh,
}: {
  candidates: Candidate[];
  canManage: boolean;
  onViewCandidate: (c: Candidate) => void;
  onMoveStage: (c: Candidate) => void;
  onScheduleInterview: (c: Candidate) => void;
  onRefresh: () => void;
}) {
  const byStage = useMemo(() => {
    const m = new Map<string, Candidate[]>();
    for (const col of PIPELINE_STAGES) m.set(col.id, []);
    for (const c of candidates) {
      const list = m.get(c.stage) || [];
      list.push(c);
      m.set(c.stage, list);
    }
    return m;
  }, [candidates]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStage = destination.droppableId;
    try {
      await moveCandidateStageAction(draggableId, newStage, `Moved via board`);
      onRefresh();
    } catch {
      onRefresh();
    }
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block flex-1 overflow-x-auto overflow-y-auto pb-4 min-h-0 pr-4">
        {canManage ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 items-start">
              {PIPELINE_STAGES.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  items={byStage.get(col.id) || []}
                  canManage={canManage}
                  onViewCandidate={onViewCandidate}
                  onMoveStage={onMoveStage}
                  onScheduleInterview={onScheduleInterview}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="flex gap-4 items-start">
            {PIPELINE_STAGES.map((col) => (
              <KanbanColumnReadOnly
                key={col.id}
                column={col}
                items={byStage.get(col.id) || []}
                canManage={false}
                onViewCandidate={onViewCandidate}
                onMoveStage={onMoveStage}
                onScheduleInterview={onScheduleInterview}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile accordion */}
      <div className="lg:hidden space-y-2">
        {PIPELINE_STAGES.map((col) => (
          <MobileStageSection
            key={col.id}
            column={col}
            items={byStage.get(col.id) || []}
            canManage={canManage}
            onViewCandidate={onViewCandidate}
            onMoveStage={onMoveStage}
            onScheduleInterview={onScheduleInterview}
          />
        ))}
      </div>
    </>
  );
}

function KanbanColumnReadOnly({
  column,
  items,
  canManage,
  onViewCandidate,
  onMoveStage,
  onScheduleInterview,
}: {
  column: (typeof PIPELINE_STAGES)[0];
  items: Candidate[];
  canManage: boolean;
  onViewCandidate: (c: Candidate) => void;
  onMoveStage: (c: Candidate) => void;
  onScheduleInterview: (c: Candidate) => void;
}) {
  return (
    <div className="w-[300px] shrink-0 flex flex-col rounded-lg border bg-muted/20">
      <div className="p-3 border-b bg-card rounded-t-lg flex items-center justify-between shrink-0">
        <h3 className="font-medium text-sm">{column.label}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {items.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            canManage={canManage}
            onView={() => onViewCandidate(c)}
            onMoveStage={() => onMoveStage(c)}
            onScheduleInterview={() => onScheduleInterview(c)}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  items,
  canManage,
  onViewCandidate,
  onMoveStage,
  onScheduleInterview,
}: {
  column: (typeof PIPELINE_STAGES)[0];
  items: Candidate[];
  canManage: boolean;
  onViewCandidate: (c: Candidate) => void;
  onMoveStage: (c: Candidate) => void;
  onScheduleInterview: (c: Candidate) => void;
}) {
  return (
    <div className="w-[300px] shrink-0 flex flex-col rounded-lg border bg-muted/20">
      <div className="p-3 border-b bg-card rounded-t-lg flex items-center justify-between shrink-0">
        <h3 className="font-medium text-sm">{column.label}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {items.map((c, index) => (
              <Draggable
                key={c.id}
                draggableId={c.id}
                index={index}
                isDragDisabled={!canManage || c.stage === "hired"}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <CandidateCard
                      candidate={c}
                      canManage={canManage}
                      onView={() => onViewCandidate(c)}
                      onMoveStage={() => onMoveStage(c)}
                      onScheduleInterview={() => onScheduleInterview(c)}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function MobileStageSection({
  column,
  items,
  canManage,
  onViewCandidate,
  onMoveStage,
  onScheduleInterview,
}: {
  column: (typeof PIPELINE_STAGES)[0];
  items: Candidate[];
  canManage: boolean;
  onViewCandidate: (c: Candidate) => void;
  onMoveStage: (c: Candidate) => void;
  onScheduleInterview: (c: Candidate) => void;
}) {
  const [open, setOpen] = useState(items.length > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between px-4 py-3 h-auto rounded-b-none"
        >
          <span className="font-medium">{column.label}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length}</Badge>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-0 space-y-2 border-t">
          {items.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              canManage={canManage}
              onView={() => onViewCandidate(c)}
              onMoveStage={() => onMoveStage(c)}
              onScheduleInterview={() => onScheduleInterview(c)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No candidates</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
