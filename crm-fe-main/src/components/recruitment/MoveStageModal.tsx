"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import type { Candidate, PipelineStage } from "@/types/recruitment";
import { STAGE_ORDER, PIPELINE_STAGES } from "@/types/recruitment";
import { moveCandidateStageAction } from "@/hooks/useCandidates";
import { cn } from "@/lib/utils";

export function MoveStageModal({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate | null;
  onSuccess: () => void;
}) {
  const [stage, setStage] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const current = candidate?.stage as PipelineStage | undefined;
  const currentIdx = current ? STAGE_ORDER.indexOf(current) : -1;

  useEffect(() => {
    if (!open) {
      setStage("");
      setNotes("");
    }
  }, [open]);

  const allowedStages = useMemo(() => {
    if (!current) return STAGE_ORDER;
    if (current === "hired") return [] as PipelineStage[];
    return STAGE_ORDER.filter((s) => {
      if (s === current) return false;
      if (s === "hired") return true;
      const si = STAGE_ORDER.indexOf(s);
      if (currentIdx <= 0) return true;
      if (s === "applied" && currentIdx > STAGE_ORDER.indexOf("applied"))
        return false;
      return true;
    });
  }, [current, currentIdx]);

  const submit = async () => {
    if (!candidate || !stage) return;
    setLoading(true);
    try {
      await moveCandidateStageAction(candidate.id, stage, notes.trim() || undefined);
      onSuccess();
      onOpenChange(false);
      setNotes("");
      setStage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move stage</DialogTitle>
          <DialogDescription>
            {candidate?.full_name} — current:{" "}
            <strong>
              {PIPELINE_STAGES.find((s) => s.id === candidate?.stage)?.label}
            </strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {stage === "hired" && (
            <div
              className={cn(
                "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950",
              )}
            >
              Moving to <strong>Hired</strong> will create a user account and
              initialize the onboarding checklist.
            </div>
          )}
          <div className="space-y-2">
            <Label>New stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {allowedStages.map((id) => (
                  <SelectItem key={id} value={id}>
                    {PIPELINE_STAGES.find((s) => s.id === id)?.label || id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context for this move…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !stage}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Update stage"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
