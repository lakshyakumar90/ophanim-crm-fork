"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPerformanceGoals } from "@/lib/performance-api";
import { goalsWeightTotal } from "@/lib/performanceHelpers";
import type { ReviewGoal } from "@/types/performance";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATES: Record<string, ReviewGoal[]> = {
  engineering: [
    { title: "Feature delivery quality", target: "Ship with tests", weight: 25 },
    { title: "Code review participation", target: "Timely reviews", weight: 25 },
    { title: "Technical design", target: "Clear RFCs when needed", weight: 25 },
    { title: "Collaboration", target: "Cross-team support", weight: 25 },
  ],
  sales: [
    { title: "Pipeline coverage", target: "Qualified opportunities", weight: 34 },
    { title: "Revenue target", target: "Quota attainment", weight: 33 },
    { title: "Customer relationships", target: "NPS / retention", weight: 33 },
  ],
  leadership: [
    { title: "Team outcomes", target: "OKRs met", weight: 40 },
    { title: "People development", target: "Growth conversations", weight: 30 },
    { title: "Stakeholder alignment", target: "Clear communication", weight: 30 },
  ],
};

export function GoalBuilderModal({
  open,
  onOpenChange,
  reviewId,
  initialGoals,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewId: string;
  initialGoals: ReviewGoal[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<ReviewGoal[]>([{ title: "", weight: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(initialGoals.length ? initialGoals.map((g) => ({ ...g })) : [{ title: "", weight: 0 }]);
    }
  }, [open, initialGoals]);

  const total = goalsWeightTotal(rows);
  const valid = rows.every((r) => r.title.trim()) && total === 100 && rows.length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Each goal needs a title and weights must total 100%");
      return;
    }
    setSaving(true);
    try {
      await setPerformanceGoals(
        reviewId,
        rows.map((r) => ({
          title: r.title.trim(),
          kpi: r.kpi,
          target: r.target,
          weight: r.weight,
        })),
      );
      toast.success("Goals saved");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set goals</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="shrink-0">Templates</Label>
            <Select
              onValueChange={(k) => {
                if (k && TEMPLATES[k]) setRows(TEMPLATES[k]!.map((g) => ({ ...g })));
              }}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Load preset…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineering">Engineering standard</SelectItem>
                <SelectItem value="sales">Sales standard</SelectItem>
                <SelectItem value="leadership">Leadership standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between">
                <Label>Goal {i + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Title *"
                value={row.title}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, title: e.target.value };
                  setRows(next);
                }}
              />
              <textarea
                className="w-full min-h-[48px] rounded-md border px-2 py-1.5 text-sm"
                placeholder="Description / KPI"
                value={row.kpi || row.description || ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, kpi: e.target.value };
                  setRows(next);
                }}
              />
              <Input
                placeholder="Target / success criteria"
                value={row.target || ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, target: e.target.value };
                  setRows(next);
                }}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Weight %"
                value={row.weight || ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, weight: Number(e.target.value) || 0 };
                  setRows(next);
                }}
              />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setRows([...rows, { title: "", weight: 0 }])}>
            <Plus className="h-4 w-4" />
            Add goal
          </Button>
          <p
            className={`text-sm font-medium ${total === 100 ? "text-emerald-600" : "text-destructive"}`}
          >
            Total weight: {total}% / 100%
          </p>
          <Button className="w-full" disabled={!valid || saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Submit goals"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
