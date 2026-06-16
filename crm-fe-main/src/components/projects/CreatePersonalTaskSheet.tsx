"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export function CreatePersonalTaskSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
    }
  }, [open]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || undefined,
          priority: newTask.priority,
          dueDate: newTask.dueDate || undefined,
          status: "todo",
        }),
      });

      if (res.ok) {
        toast.success("Task created successfully");
        onOpenChange(false);
        onCreated?.();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Personal Task"
      description="Add a new task for yourself."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-personal-task-form" disabled={submitting}>
            Create Task
          </Button>
        </>
      }
    >
      <form id="create-personal-task-form" onSubmit={handleCreateTask} className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Details about the task..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={newTask.priority}
              onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            />
          </div>
        </div>
      </form>
    </FormSideSheet>
  );
}
