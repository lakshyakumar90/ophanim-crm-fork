"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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
import { timeEntriesApi } from "@/lib/api";
import { toast } from "sonner";

type ProjectOption = { id: string; name: string };

export function LogTimeSheet({
  open,
  onOpenChange,
  projects,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  onLogged?: () => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("Timesheet entry");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setEntryDate(format(new Date(), "yyyy-MM-dd"));
      setHours("");
      setDescription("Timesheet entry");
      return;
    }
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [open, projects, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(hours);
    if (!hoursNum || hoursNum <= 0) {
      toast.error("Enter valid hours worked");
      return;
    }
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    setSubmitting(true);
    try {
      await timeEntriesApi.create({
        projectId,
        entryDate,
        hours: hoursNum,
        description: description.trim() || "Timesheet entry",
      });
      toast.success("Time entry added");
      onOpenChange(false);
      onLogged?.();
    } catch {
      toast.error("Failed to add time entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log Time"
      description="Record hours worked on a project."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="log-time-form" disabled={submitting || projects.length === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Time"}
          </Button>
        </>
      }
    >
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects available to log time against.</p>
      ) : (
        <form id="log-time-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hours worked</Label>
            <Input
              type="number"
              min="0.25"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </form>
      )}
    </FormSideSheet>
  );
}
