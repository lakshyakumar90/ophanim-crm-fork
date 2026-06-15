"use client";

import Link from "next/link";
import { Receipt, ArrowLeft } from "lucide-react";
import { CreateExpenseForm } from "@/components/finance/expenses/CreateExpenseForm";
import { Button } from "@/components/ui/button";

export default function NewExpensePage() {
  return (
    <div className="space-y-6 max-w-2xl">
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

      <CreateExpenseForm />
    </div>
  );
}
