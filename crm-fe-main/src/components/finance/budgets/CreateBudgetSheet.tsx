"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type LineRow = { description: string; allocated_amount: string };

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "CAD"] as const;

const defaultForm = () => ({
  name: "",
  fiscal_year: String(new Date().getFullYear()),
  period: "yearly" as "monthly" | "quarterly" | "yearly",
  period_start: `${new Date().getFullYear()}-01-01`,
  period_end: `${new Date().getFullYear()}-12-31`,
  currency: "INR" as (typeof CURRENCIES)[number],
  notes: "",
});

export function CreateBudgetSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [lines, setLines] = useState<LineRow[]>([
    { description: "General", allocated_amount: "0" },
  ]);

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm());
    setLines([{ description: "General", allocated_amount: "0" }]);
  }, [open]);

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Budget name is required");
      return;
    }
    const parsedLines = lines
      .filter((l) => l.description.trim())
      .map((l, i) => ({
        description: l.description.trim(),
        allocated_amount: parseFloat(l.allocated_amount) || 0,
        sort_order: i,
      }));
    if (parsedLines.length === 0) {
      toast.error("Add at least one budget line");
      return;
    }

    setIsSubmitting(true);
    try {
      await budgetsApi.create({
        name: form.name.trim(),
        fiscal_year: parseInt(form.fiscal_year, 10),
        period: form.period,
        period_start: form.period_start,
        period_end: form.period_end,
        currency: form.currency,
        notes: form.notes || undefined,
        status: "draft",
        lines: parsedLines,
      });
      toast.success("Budget created");
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Failed to create budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New budget"
      description="Create a department budget with one or more line items."
      size="xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-budget-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create budget"}
          </Button>
        </>
      }
    >
      <form id="create-budget-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="FY 2026 Operations"
            />
          </div>
          <div className="space-y-2">
            <Label>Fiscal year</Label>
            <Input
              type="number"
              value={form.fiscal_year}
              onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={form.period}
              onValueChange={(v) =>
                setForm({ ...form, period: v as typeof form.period })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period start</Label>
            <Input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm({ ...form, period_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Period end</Label>
            <Input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm({ ...form, period_end: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(v) =>
                setForm({ ...form, currency: v as typeof form.currency })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Budget lines</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLines([...lines, { description: "", allocated_amount: "0" }])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add line
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Description"
                value={line.description}
                onChange={(e) =>
                  updateLine(index, { description: e.target.value })
                }
              />
              <Input
                className="w-28"
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={line.allocated_amount}
                onChange={(e) =>
                  updateLine(index, { allocated_amount: e.target.value })
                }
              />
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </form>
    </FormSideSheet>
  );
}
