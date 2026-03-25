"use client";

import { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OnboardingTemplateTaskInput, TemplateTaskOwner } from "@/types/onboarding";

const OWNERS: TemplateTaskOwner[] = ["IT", "HR", "Manager", "NewHire"];

export interface TaskBuilderRow extends OnboardingTemplateTaskInput {
  localId: string;
}

function newRow(): TaskBuilderRow {
  return {
    localId: crypto.randomUUID(),
    task_name: "",
    description: "",
    owner: "HR",
    due_days_from_joining: 0,
  };
}

interface TaskBuilderProps {
  tasks: TaskBuilderRow[];
  onChange: (tasks: TaskBuilderRow[]) => void;
}

export function TaskBuilder({ tasks, onChange }: TaskBuilderProps) {
  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const items = Array.from(tasks);
      const [removed] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, removed);
      onChange(items);
    },
    [tasks, onChange],
  );

  const updateRow = (index: number, patch: Partial<TaskBuilderRow>) => {
    const next = tasks.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Tasks</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...tasks, newRow()])}>
          Add task
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Day 0 = joining date. Day 7 = one week after joining. Tasks can be reordered by dragging.
      </p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="onboarding-tasks">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {tasks.map((row, index) => (
                <Draggable key={row.localId} draggableId={row.localId} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`rounded-lg border bg-card p-3 space-y-2 ${
                        snapshot.isDragging ? "shadow-md ring-2 ring-primary/20" : ""
                      }`}
                    >
                      <div className="flex gap-2 items-start">
                        <button
                          type="button"
                          className="mt-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                          {...dragProvided.dragHandleProps}
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <div className="flex-1 grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Task name *</Label>
                            <Input
                              value={row.task_name}
                              onChange={(e) => updateRow(index, { task_name: e.target.value })}
                              placeholder="e.g. Laptop assigned"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Assigned role</Label>
                            <Select
                              value={row.owner}
                              onValueChange={(v) => updateRow(index, { owner: v as TemplateTaskOwner })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OWNERS.map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Description</Label>
                            <textarea
                              className="w-full min-h-[52px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                              value={row.description ?? ""}
                              onChange={(e) => updateRow(index, { description: e.target.value })}
                              placeholder="Optional details"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Due days from joining *</Label>
                            <Input
                              type="number"
                              min={0}
                              value={row.due_days_from_joining}
                              onChange={(e) =>
                                updateRow(index, {
                                  due_days_from_joining: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(index)}
                          aria-label="Remove task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export { newRow };
