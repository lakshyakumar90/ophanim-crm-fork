"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Loader2 } from "lucide-react";
import type { JobPosting } from "@/types/recruitment";
import { updateJobPostingAction } from "@/hooks/useRecruitment";

export function EditJobPostingModal({
  open,
  onOpenChange,
  posting,
  departments,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  posting: JobPosting | null;
  departments: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [positions_open, setPositionsOpen] = useState(1);
  const [description, setDescription] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [salary_min, setSalaryMin] = useState("");
  const [salary_max, setSalaryMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<JobPosting["status"]>("open");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (posting) {
      setTitle(posting.title || "");
      setDepartment(posting.department || "");
      setPositionsOpen(posting.positions_open || 1);
      setDescription(posting.description || "");
      setSkillsRaw((posting.required_skills || []).join(", "));
      setSalaryMin(
        posting.salary_range_min != null ? String(posting.salary_range_min) : "",
      );
      setSalaryMax(
        posting.salary_range_max != null ? String(posting.salary_range_max) : "",
      );
      setDeadline(
        posting.application_deadline
          ? posting.application_deadline.slice(0, 10)
          : "",
      );
      setStatus(posting.status);
    }
  }, [posting]);

  const submit = async () => {
    if (!posting || !title.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        department: department || undefined,
        positions_open,
        description: description.trim() || undefined,
        required_skills: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status,
      };
      if (salary_min.trim()) body.salary_range_min = parseFloat(salary_min);
      if (salary_max.trim()) body.salary_range_max = parseFloat(salary_max);
      if (deadline) body.application_deadline = new Date(deadline).toISOString();
      await updateJobPostingAction(posting.id, body);
      onSuccess();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto px-6">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit job posting</SheetTitle>
          <SheetDescription>Update role details and status.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={department || "_empty"} onValueChange={(v) => setDepartment(v === "_empty" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">—</SelectItem>
                {posting?.department &&
                  !departments.some((d) => d.name === posting.department) && (
                    <SelectItem value={posting.department!}>
                      {posting.department}
                    </SelectItem>
                  )}
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Positions open</Label>
            <Input
              type="number"
              min={1}
              value={positions_open}
              onChange={(e) => setPositionsOpen(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as JobPosting["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Application deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Salary min</Label>
              <Input value={salary_min} onChange={(e) => setSalaryMin(e.target.value)} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Salary max</Label>
              <Input value={salary_max} onChange={(e) => setSalaryMax(e.target.value)} type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input value={skillsRaw} onChange={(e) => setSkillsRaw(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
