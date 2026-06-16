"use client";

import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { CreateInvoiceForm } from "@/components/finance/invoices/CreateInvoiceForm";

export default function NewInvoicePage() {
  const { can } = useAuth();
  const canCreateInvoice = can("invoices:manage");

  if (!canCreateInvoice) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Invoice Access Restricted</h1>
        <p className="text-muted-foreground">
          You need invoice management permission to create invoices.
        </p>
        <Link href="/finance/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            New Invoice
          </h1>
          <p className="text-muted-foreground">
            Create a client-ready invoice with service, plan, discounts, and currency.
          </p>
        </div>
      </div>

      <CreateInvoiceForm />
    </div>
  );
}
