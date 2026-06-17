"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { runCalibration } from "@/lib/performance-api";
import type { CalibratedRating, PerformanceReviewRow } from "@/types/performance";
import { CALIBRATED_RATING_ORDER } from "@/lib/performanceHelpers";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const RATINGS = [...CALIBRATED_RATING_ORDER] as CalibratedRating[];

function defaultRating(review: PerformanceReviewRow): CalibratedRating {
  const mr = review.manager_review as { overall_rating?: string } | undefined;
  const o = (mr?.overall_rating || "").toLowerCase();
  if (RATINGS.includes(o as CalibratedRating)) return o as CalibratedRating;
  return "meets";
}

export function CalibrationModal({
  open,
  onOpenChange,
  cycleId,
  reviews,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycleId: string;
  reviews: PerformanceReviewRow[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<
    Record<
      string,
      { calibrated_rating: CalibratedRating; pip_triggered: boolean; notes: string }
    >
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: typeof rows = {};
    for (const r of reviews) {
      next[r.id] = {
        calibrated_rating: defaultRating(r),
        pip_triggered: Boolean(r.pip_triggered),
        notes: "",
      };
    }
    setRows(next);
  }, [open, reviews]);

  const submit = async () => {
    setSaving(true);
    try {
      const adjustments = reviews.map((r) => {
        const row = rows[r.id];
        return {
          review_id: r.id,
          calibrated_rating: row?.calibrated_rating ?? "meets",
          pip_triggered: row?.pip_triggered ?? false,
          notes: row?.notes?.trim() || undefined,
        };
      });
      await runCalibration(cycleId, adjustments);
      toast.success("Calibration saved");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Calibration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Calibrate reviews"
      description="Adjust final ratings and PIP flags. Only reviews in “Awaiting calibration” are listed."
      size="3xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving || reviews.length === 0} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save calibration"}
          </Button>
        </>
      }
    >
      <div className="overflow-y-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-2 font-medium">Employee</th>
              <th className="text-left p-2 font-medium">Manager score</th>
              <th className="text-left p-2 font-medium">Calibrated</th>
              <th className="text-left p-2 font-medium">PIP</th>
              <th className="text-left p-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const mr = r.manager_review as { weighted_score?: number } | undefined;
              const row = rows[r.id];
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2 align-top">
                    {r.employee?.full_name || "Employee"}
                  </td>
                  <td className="p-2 align-top text-muted-foreground">
                    {mr?.weighted_score != null ? mr.weighted_score.toFixed(2) : "—"}
                  </td>
                  <td className="p-2 align-top">
                    <Select
                      value={row?.calibrated_rating ?? "meets"}
                      onValueChange={(v) =>
                        setRows((prev) => ({
                          ...prev,
                          [r.id]: {
                            ...prev[r.id]!,
                            calibrated_rating: v as CalibratedRating,
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATINGS.map((x) => (
                          <SelectItem key={x} value={x}>
                            {x}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 align-top">
                    <Switch
                      checked={row?.pip_triggered ?? false}
                      onCheckedChange={(c) =>
                        setRows((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id]!, pip_triggered: c },
                        }))
                      }
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Input
                      className="h-8"
                      placeholder="Optional"
                      value={row?.notes ?? ""}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id]!, notes: e.target.value },
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FormSideSheet>
  );
}
