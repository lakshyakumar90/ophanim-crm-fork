"use client";

import { Save } from "lucide-react";
import { useCreateExpenseForm } from "@/hooks/finance/useCreateExpenseForm";
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

function ExpenseFormBody({ onSuccess }: { onSuccess?: () => void }) {
  const { register, setValue, categoryId, categories, isSubmitting, onSubmit } =
    useCreateExpenseForm({ onSuccess });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={categoryId}
            onValueChange={(value) => setValue("category_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat: { id: string; name: string }) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Expense date</Label>
          <Input type="date" {...register("expense_date")} />
        </div>
        <div className="space-y-2">
          <Label>Vendor</Label>
          <Input placeholder="e.g. Amazon" {...register("vendor_name")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea rows={2} placeholder="What is this expense for?" {...register("description")} />
      </div>
      <div className="space-y-2">
        <Label>Receipt URL</Label>
        <Input type="url" placeholder="https://..." {...register("receipt_url")} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={2} {...register("notes")} />
      </div>
      <div className="flex justify-end border-t pt-4">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          Submit expense
        </Button>
      </div>
    </div>
  );
}

export function CreateExpenseSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Submit expense"
      description="Submit an expense for approval."
      size="lg"
    >
      <ExpenseFormBody
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}

export function CreateExpenseForm() {
  return <ExpenseFormBody />;
}
