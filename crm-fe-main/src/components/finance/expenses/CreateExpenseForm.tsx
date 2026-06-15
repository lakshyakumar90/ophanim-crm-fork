"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { useCreateExpenseForm } from "@/hooks/finance/useCreateExpenseForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateExpenseForm() {
  const { register, setValue, categoryId, categories, isSubmitting, onSubmit } =
    useCreateExpenseForm();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
              <Label>
                Amount (₹) <span className="text-destructive">*</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Expense Date</Label>
              <Input type="date" {...register("expense_date")} />
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input
                placeholder="e.g., Amazon, Flipkart"
                {...register("vendor_name")}
              />
            </div>
          </div>

          <div>
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="What is this expense for?"
              rows={2}
              {...register("description")}
            />
          </div>

          <div>
            <Label>Receipt URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              {...register("receipt_url")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload your receipt to a file storage and paste the link here
            </p>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information..."
              rows={2}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/finance/expenses">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Submit Expense
        </Button>
      </div>
    </>
  );
}
