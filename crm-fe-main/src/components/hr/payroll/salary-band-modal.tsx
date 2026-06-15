"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalaryBand } from "@/types/payroll";
import {
  createSalaryBand as postSalaryBand,
  getPayrollErrorMessage,
  updateSalaryBand as putSalaryBand,
} from "@/lib/payroll-client";
import { toast } from "sonner";

interface DeptOption {
  id: string;
  name: string;
}

function isPctTemplate(
  t: SalaryBand["components_template"],
): t is { basic_pct?: number; hra_pct?: number; allowance_pct?: number } {
  return t !== null && !Array.isArray(t) && typeof t === "object" && !("name" in (t as object));
}

export function SalaryBandModal({
  open,
  onOpenChange,
  band,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  band: SalaryBand | null;
  departments: DeptOption[];
  onSaved: () => void;
}) {
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [minCtc, setMinCtc] = useState("");
  const [maxCtc, setMaxCtc] = useState("");
  const [basicPct, setBasicPct] = useState("50");
  const [hraPct, setHraPct] = useState("20");
  const [allowancePct, setAllowancePct] = useState("30");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (band) {
      setDesignation(band.designation);
      setDepartment(band.department || "");
      setMinCtc(String(band.min_ctc));
      setMaxCtc(String(band.max_ctc));
      const t = band.components_template;
      if (isPctTemplate(t)) {
        setBasicPct(String(t.basic_pct ?? 50));
        setHraPct(String(t.hra_pct ?? 20));
        setAllowancePct(String(t.allowance_pct ?? 30));
      } else {
        setBasicPct("50");
        setHraPct("20");
        setAllowancePct("30");
      }
    } else {
      setDesignation("");
      setDepartment("");
      setMinCtc("");
      setMaxCtc("");
      setBasicPct("50");
      setHraPct("20");
      setAllowancePct("30");
    }
  }, [open, band]);

  const sumPct = useMemo(() => {
    return (
      (parseFloat(basicPct) || 0) + (parseFloat(hraPct) || 0) + (parseFloat(allowancePct) || 0)
    );
  }, [basicPct, hraPct, allowancePct]);

  const minN = parseFloat(minCtc) || 0;
  const maxN = parseFloat(maxCtc) || 0;
  const validRange = maxN > minN && minN > 0;
  const validPct = Math.abs(sumPct - 100) < 0.01;

  const submit = async () => {
    if (!designation.trim() || !validRange) {
      toast.error("Check designation and ensure max CTC is greater than min CTC.");
      return;
    }
    if (!validPct) {
      toast.error("Component percentages must sum to 100%.");
      return;
    }
    setLoading(true);
    try {
      const components_template = {
        basic_pct: parseFloat(basicPct) || 0,
        hra_pct: parseFloat(hraPct) || 0,
        allowance_pct: parseFloat(allowancePct) || 0,
      };
      const body = {
        designation: designation.trim(),
        department: department || undefined,
        min_ctc: minN,
        max_ctc: maxN,
        components_template,
      };
      if (band) {
        await putSalaryBand(band.id, body);
        toast.success("Salary band updated");
      } else {
        await postSalaryBand(body);
        toast.success("Salary band created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{band ? "Edit salary band" : "Create salary band"}</DialogTitle>
          <DialogDescription>
            Define CTC range and default component split (must total 100%).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Designation</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={department || "__none__"} onValueChange={(v) => setDepartment(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min CTC (annual ₹)</Label>
              <Input type="number" min={0} value={minCtc} onChange={(e) => setMinCtc(e.target.value)} />
            </div>
            <div>
              <Label>Max CTC (annual ₹)</Label>
              <Input type="number" min={0} value={maxCtc} onChange={(e) => setMaxCtc(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Components template (% of split)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Basic %</Label>
                <Input type="number" value={basicPct} onChange={(e) => setBasicPct(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">HRA %</Label>
                <Input type="number" value={hraPct} onChange={(e) => setHraPct(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Allowance %</Label>
                <Input type="number" value={allowancePct} onChange={(e) => setAllowancePct(e.target.value)} />
              </div>
            </div>
            <p className={cn("text-xs font-medium", validPct ? "text-emerald-600" : "text-red-600")}>
              Total: {sumPct.toFixed(1)}% / 100%
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={loading || !validPct || !validRange} onClick={() => void submit()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
