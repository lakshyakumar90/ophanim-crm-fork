"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { expensesApi, expenseCategoriesApi } from "@/lib/finance-api";
import { useAuth } from "@/providers/auth-provider";
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
import { Receipt, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewExpensePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch expense categories
  const { data: categoriesData } = useSWR(
    user ? "expense-categories" : null,
    () => expenseCategoriesApi.list(),
  );

  const categories = categoriesData || [];

  const handleSubmit = async () => {
    if (!categoryId || !amount || !description) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await expensesApi.submit({
        category_id: categoryId,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        vendor_name: vendorName || undefined,
        description,
        receipt_url: receiptUrl || undefined,
        notes: notes || undefined,
      });

      toast.success("Expense submitted for approval");
      router.push("/finance/expenses");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/finance/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Submit Expense
          </h1>
          <p className="text-muted-foreground">
            Submit an expense for approval
          </p>
        </div>
      </div>

      {/* Expense Form */}
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
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Expense Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g., Amazon, Flipkart"
              />
            </div>
          </div>

          <div>
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this expense for?"
              rows={2}
            />
          </div>

          <div>
            <Label>Receipt URL</Label>
            <Input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload your receipt to a file storage and paste the link here
            </p>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/finance/expenses">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Submit Expense
        </Button>
      </div>
    </div>
  );
}
