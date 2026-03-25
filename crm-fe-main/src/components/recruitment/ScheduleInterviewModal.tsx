"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types/recruitment";
import { scheduleInterviewAction } from "@/hooks/useInterviews";
import { isFutureDateTime } from "@/lib/recruitment-format";
import { toast } from "sonner";

export type EmployeeOption = { id: string; fullName: string; email: string };

export function ScheduleInterviewModal({
  open,
  onOpenChange,
  candidate,
  employees,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate | null;
  employees: EmployeeOption[];
  onSuccess: () => void;
}) {
  const [round, setRound] = useState("1");
  const [interviewerId, setInterviewerId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewType, setInterviewType] = useState<string>("video");
  const [comboOpen, setComboOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedEmp = employees.find((e) => e.id === interviewerId);

  const submit = async () => {
    if (!candidate) return;
    const r = parseInt(round, 10);
    if (!Number.isFinite(r) || r < 1) {
      toast.error("Round must be a positive number");
      return;
    }
    if (!interviewerId) {
      toast.error("Select an interviewer");
      return;
    }
    if (!scheduledAt) {
      toast.error("Pick date and time");
      return;
    }
    const iso = new Date(scheduledAt).toISOString();
    if (!isFutureDateTime(iso)) {
      toast.error("Scheduled time must be in the future");
      return;
    }
    setLoading(true);
    try {
      await scheduleInterviewAction(candidate.id, {
        round: r,
        interviewer_id: interviewerId,
        scheduled_at: iso,
        interview_type: interviewType,
      });
      onSuccess();
      onOpenChange(false);
      setRound("1");
      setInterviewerId("");
      setScheduledAt("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>{candidate?.full_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Round (number)</Label>
            <Input
              type="number"
              min={1}
              value={round}
              onChange={(e) => setRound(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              e.g. 1 for first technical round (stored as round number).
            </p>
          </div>
          <div className="space-y-1">
            <Label>Interviewer *</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedEmp
                    ? `${selectedEmp.fullName}`
                    : "Search employees…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search…" />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.fullName} ${e.email}`}
                          onSelect={() => {
                            setInterviewerId(e.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              interviewerId === e.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {e.fullName}
                          <span className="ml-2 text-muted-foreground text-xs truncate">
                            {e.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>Scheduled at *</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
