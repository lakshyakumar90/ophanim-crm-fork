"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Copy } from "lucide-react";
import type { Lead, LeadStatus } from "@/types";
import {
  getAllStatuses,
  getStatusColor,
  getStatusLabel,
} from "@/lib/lead-status-config";
import { KANBAN_STATUSES } from "@/components/sales/leads/leads-list-constants";

interface LeadsKanbanBoardProps {
  onDragEnd: (result: DropResult) => void;
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  getTotalCountByStatus: (status: LeadStatus) => number;
  loadMoreForStatus: (status: LeadStatus) => void;
  isInitialKanbanLoading: boolean;
  kanbanValidating: boolean;
  updatingLeadId: string | null;
  leadsWithReminders: Set<string>;
  leadsWithOverdueReminders: Set<string>;
  duplicateLeadIds: Set<string>;
}

export function LeadsKanbanBoard({
  onDragEnd,
  getLeadsByStatus,
  getTotalCountByStatus,
  loadMoreForStatus,
  isInitialKanbanLoading,
  kanbanValidating,
  updatingLeadId,
  leadsWithReminders,
  leadsWithOverdueReminders,
  duplicateLeadIds,
}: LeadsKanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: "1600px" }}>
          {KANBAN_STATUSES.map((statusValue) => {
            const statusLeads = getLeadsByStatus(statusValue);
            const statusConfig = getAllStatuses().find(
              (s) => s.value === statusValue,
            );
            return (
              <div
                key={statusValue}
                className="flex-1 min-w-[200px] flex flex-col"
              >
                <div
                  className={`rounded-lg p-3 mb-3 ${getStatusColor(statusValue)}`}
                >
                  <div className="font-semibold text-center">
                    {statusConfig?.label || getStatusLabel(statusValue)}
                  </div>
                  <div className="text-center text-sm opacity-80">
                    ({statusLeads.length}
                    {getTotalCountByStatus(statusValue) > statusLeads.length && (
                      <span> / {getTotalCountByStatus(statusValue)}</span>
                    )}
                    )
                  </div>
                </div>

                <Droppable droppableId={statusValue}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 flex-1 min-h-[200px] rounded-lg border border-border p-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "border-2 border-dashed border-primary/30 bg-primary/10"
                          : "bg-card"
                      }`}
                    >
                      {isInitialKanbanLoading ? (
                        <>
                          <Skeleton className="h-24" />
                          <Skeleton className="h-24" />
                        </>
                      ) : (
                        statusLeads.map((lead: Lead, index: number) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                          >
                            {(provided, snapshot) => {
                              const { style, ...draggableProps } =
                                provided.draggableProps;
                              return (
                              <div
                                ref={provided.innerRef}
                                {...draggableProps}
                                style={style as CSSProperties}
                                className={`${
                                  snapshot.isDragging ? "opacity-90" : ""
                                } ${
                                  updatingLeadId === lead.id
                                    ? "opacity-50 pointer-events-none"
                                    : ""
                                }`}
                              >
                                <Card
                                  {...provided.dragHandleProps}
                                  className={`cursor-grab hover:shadow-md transition-all ${
                                    snapshot.isDragging
                                      ? "shadow-lg rotate-2 scale-105"
                                      : ""
                                  } ${
                                    leadsWithOverdueReminders.has(lead.id)
                                      ? "border-l-4 border-l-red-500 bg-red-200 dark:bg-red-950/10 hover:border-red-400"
                                      : leadsWithReminders.has(lead.id)
                                        ? "border-l-4 border-l-green-500 bg-green-200 dark:bg-green-950/10 hover:border-green-400"
                                        : "hover:border-primary/50"
                                  }`}
                                >
                                  <CardContent className="p-3 space-y-1">
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <Link
                                          href={`/sales/leads/${lead.id}`}
                                          className="block"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="font-semibold text-sm truncate hover:text-primary flex items-center gap-1">
                                            {lead.leadName}
                                            {leadsWithReminders.has(lead.id) && (
                                              <Bell
                                                className={`h-3 w-3 shrink-0 ${
                                                  leadsWithOverdueReminders.has(
                                                    lead.id,
                                                  )
                                                    ? "text-red-500"
                                                    : "text-green-500"
                                                }`}
                                              />
                                            )}
                                          </div>
                                        </Link>
                                        {duplicateLeadIds.has(lead.id) && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium w-fit">
                                            <Copy className="h-2.5 w-2.5" />
                                            Duplicate
                                          </span>
                                        )}
                                        {lead.businessName && (
                                          <div className="text-xs text-muted-foreground truncate">
                                            🏢 {lead.businessName}
                                          </div>
                                        )}
                                        {lead.email && (
                                          <div className="text-xs text-muted-foreground truncate">
                                            ✉️ {lead.email}
                                          </div>
                                        )}
                                        {lead.phone && (
                                          <div className="text-xs text-muted-foreground truncate">
                                            📞 {lead.phone}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col items-end gap-1 shrink-0">
                                        {lead.assignee && (
                                          <Avatar
                                            className="h-6 w-6 border-2 border-background"
                                            title={lead.assignee.fullName}
                                          >
                                            <AvatarImage
                                              src={
                                                lead.assignee.avatarUrl ||
                                                undefined
                                              }
                                            />
                                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                              {lead.assignee.fullName
                                                ?.substring(0, 2)
                                                .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                            }}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                      {!isInitialKanbanLoading && statusLeads.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Drop leads here
                        </div>
                      )}
                      {!isInitialKanbanLoading &&
                        getTotalCountByStatus(statusValue) >
                          statusLeads.length && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => loadMoreForStatus(statusValue)}
                            disabled={kanbanValidating}
                          >
                            Load More (
                            {getTotalCountByStatus(statusValue) -
                              statusLeads.length}{" "}
                            remaining)
                          </Button>
                        )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
