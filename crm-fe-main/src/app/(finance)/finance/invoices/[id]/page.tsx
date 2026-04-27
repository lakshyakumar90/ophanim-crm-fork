"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  invoicesApi,
  paymentsApi,
  type CurrencyCode,
  type Invoice,
  type InvoiceLineItem,
  type PaymentMode,
} from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  ArrowLeft,
  Plus,
  Printer,
  Eye,
  Upload,
  Loader2,
  ExternalLink,
  Trash2,
  PencilLine,
  Save,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "CAD", "GBP", "EUR", "INR"];

type LineItemInput = {
  description: string;
  service_name: string;
  plan_name: string;
  quantity: number;
  unit_price: number;
  original_amount: number;
  item_discount_type: "none" | "percentage" | "fixed";
  item_discount_value: number;
};

type InvoiceEditForm = {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  invoice_date: string;
  due_date: string;
  currency: CurrencyCode;
  tax_rate: number;
  discount_rate: number;
  payment_terms: string;
  notes: string;
  line_items: LineItemInput[];
};

const emptyLineItem = (): LineItemInput => ({
  description: "",
  service_name: "",
  plan_name: "",
  quantity: 1,
  unit_price: 0,
  original_amount: 0,
  item_discount_type: "none",
  item_discount_value: 0,
});

function formatCurrency(amount: number, currency: CurrencyCode = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getPaymentModeLabel(mode?: string) {
  return PAYMENT_MODE_OPTIONS.find((item) => item.value === mode)?.label || mode || "-";
}

function getMergedPlanDescription(item: NonNullable<Invoice["line_items"]>[number]) {
  const parts = [item.service_name, item.plan_name, item.description]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const normalized = part.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueParts.push(part);
  }

  return uniqueParts.join(" - ") || "—";
}

function getOriginalAmount(item: NonNullable<Invoice["line_items"]>[number]) {
  const configuredAmount = Number(item.original_amount || 0);
  if (configuredAmount > 0) return configuredAmount;
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

function getItemDiscountAmount(item: NonNullable<Invoice["line_items"]>[number]) {
  const originalAmount = getOriginalAmount(item);
  const discountType = item.item_discount_type || "none";
  const discountValue = Number(item.item_discount_value || 0);

  if (discountType === "percentage") {
    return (originalAmount * discountValue) / 100;
  }

  if (discountType === "fixed") {
    return discountValue;
  }

  return Math.max(originalAmount - Number(item.total || 0), 0);
}

function getItemDiscountLabel(item: NonNullable<Invoice["line_items"]>[number]) {
  const discountAmount = getItemDiscountAmount(item);
  if (discountAmount <= 0) return "—";

  if (item.item_discount_type === "percentage") {
    return `${discountAmount}|${Number(item.item_discount_value || 0)}%`;
  }

  if (item.item_discount_type === "fixed") {
    return `${discountAmount}|Fixed`;
  }

  return `${discountAmount}`;
}

function createLineItemInput(item?: InvoiceLineItem): LineItemInput {
  const quantity = Number(item?.quantity || 1);
  const unitPrice = Number(item?.unit_price || 0);
  const originalAmount = Number(item?.original_amount || 0);

  return {
    description: item?.description || "",
    service_name: item?.service_name || "",
    plan_name: item?.plan_name || "",
    quantity,
    unit_price: unitPrice,
    original_amount: originalAmount > 0 ? originalAmount : quantity * unitPrice,
    item_discount_type: item?.item_discount_type || "none",
    item_discount_value: Number(item?.item_discount_value || 0),
  };
}

function createInvoiceEditForm(invoice: Invoice): InvoiceEditForm {
  return {
    client_name: invoice.client_name || "",
    client_email: invoice.client_email || "",
    client_phone: invoice.client_phone || "",
    client_address: invoice.client_address || "",
    invoice_date: invoice.invoice_date ? invoice.invoice_date.split("T")[0] : "",
    due_date: invoice.due_date ? invoice.due_date.split("T")[0] : "",
    currency: invoice.currency || "INR",
    tax_rate: Number(invoice.tax_rate || 0),
    discount_rate: Number(invoice.discount_rate || 0),
    payment_terms: invoice.payment_terms || "Net 30",
    notes: invoice.notes || "",
    line_items:
      invoice.line_items && invoice.line_items.length > 0
        ? invoice.line_items.map((item) => createLineItemInput(item))
        : [emptyLineItem()],
  };
}

function getEditBaseAmount(item: LineItemInput) {
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

function getEditItemDiscountAmount(item: LineItemInput) {
  const originalAmount = Number(item.original_amount || 0) || getEditBaseAmount(item);

  if (item.item_discount_type === "percentage") {
    return (originalAmount * Number(item.item_discount_value || 0)) / 100;
  }

  if (item.item_discount_type === "fixed") {
    return Number(item.item_discount_value || 0);
  }

  return 0;
}

function getEditLineTotal(item: LineItemInput) {
  const originalAmount = Number(item.original_amount || 0) || getEditBaseAmount(item);
  return Math.max(originalAmount - getEditItemDiscountAmount(item), 0);
}

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const params = useParams();
  const invoiceId = params.id as string;

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [editForm, setEditForm] = useState<InvoiceEditForm | null>(null);
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<"draft" | "sent">("draft");
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>("bank_transfer");
  const [editPaymentTransactionId, setEditPaymentTransactionId] = useState("");
  const [editPaymentNotes, setEditPaymentNotes] = useState("");

  const {
    data: invoice,
    isLoading,
    mutate,
  } = useSWR<Invoice>(user && invoiceId ? ["invoice", invoiceId] : null, () =>
    invoicesApi.get(invoiceId),
  );

  const refreshInvoiceData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshInvoiceData,
    enabled: Boolean(user && invoiceId),
  });

  useEffect(() => {
    if (!invoice) return;
    setEditForm(createInvoiceEditForm(invoice));
    setEditInvoiceStatus(invoice.status === "draft" ? "draft" : "sent");
  }, [invoice]);

  const handleOpenPreview = async () => {
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      toast.error("Preview tab was blocked by the browser");
      return;
    }

    previewWindow.document.write(
      "<!doctype html><html><head><title>Loading preview...</title></head><body style=\"font-family: Arial, sans-serif; padding: 24px;\">Loading invoice preview...</body></html>",
    );
    previewWindow.document.close();

    setIsPreviewLoading(true);

    try {
      const html = await invoicesApi.getPreviewHtml(invoiceId);
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (error: any) {
      previewWindow.close();
      toast.error(error.response?.data?.message || "Failed to load invoice preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    setIsDownloadingPdf(true);

    try {
      const blob = await invoicesApi.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to download invoice PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDeleteInvoice = async () => {
    const confirmed = window.confirm(
      "Delete this invoice permanently? This will also remove its payments and line items.",
    );
    if (!confirmed) return;

    try {
      await invoicesApi.delete(invoiceId);
      toast.success("Invoice deleted");
      window.location.href = "/finance/invoices";
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || Number.parseFloat(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      let proofUrl: string | undefined;
      let proofName: string | undefined;

      if (paymentProofFile) {
        const upload = await paymentsApi.uploadProof(paymentProofFile);
        proofUrl = upload.url;
        proofName = upload.file_name;
      }

      await paymentsApi.record(invoiceId, {
        amount: Number.parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_mode: paymentMode as any,
        transaction_id: transactionId.trim() || undefined,
        transaction_proof_url: proofUrl,
        transaction_proof_name: proofName,
        notes: paymentNotes.trim() || undefined,
      });

      toast.success("Payment recorded");
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setTransactionId("");
      setPaymentNotes("");
      setPaymentProofFile(null);
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSheetChange = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (open && invoice) {
      setEditForm(createInvoiceEditForm(invoice));
      setEditInvoiceStatus(invoice.status === "draft" ? "draft" : "sent");
      setEditPaymentAmount("");
      setEditPaymentDate(new Date().toISOString().split("T")[0]);
      setEditPaymentMode("bank_transfer");
      setEditPaymentTransactionId("");
      setEditPaymentNotes("");
    }
  };

  const updateEditField = <K extends keyof InvoiceEditForm>(
    field: K,
    value: InvoiceEditForm[K],
  ) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateEditLineItem = <K extends keyof LineItemInput>(
    index: number,
    field: K,
    value: LineItemInput[K],
  ) => {
    setEditForm((current) => {
      if (!current) return current;

      return {
        ...current,
        line_items: current.line_items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      };
    });
  };

  const addEditLineItem = () => {
    setEditForm((current) =>
      current ? { ...current, line_items: [...current.line_items, emptyLineItem()] } : current,
    );
  };

  const removeEditLineItem = (index: number) => {
    setEditForm((current) => {
      if (!current || current.line_items.length === 1) return current;
      return {
        ...current,
        line_items: current.line_items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const handleSaveInvoice = async () => {
    if (!editForm) return;

    if (!editForm.client_name.trim() || !editForm.client_email.trim() || !editForm.due_date) {
      toast.error("Please fill in the client details and due date");
      return;
    }

    const invalidItem = editForm.line_items.find((item) => {
      const hasDescriptor =
        item.description.trim() || item.service_name.trim() || item.plan_name.trim();
      return !hasDescriptor || item.quantity <= 0 || item.unit_price < 0;
    });

    if (invalidItem) {
      toast.error("Each invoice item needs a service, plan, or description");
      return;
    }

    const pendingPaymentAmount = Number.parseFloat(editPaymentAmount) || 0;
    if (pendingPaymentAmount > 0 && editInvoiceStatus !== "sent") {
      toast.error("Set the invoice status to Sent before adding a payment");
      return;
    }

    if (pendingPaymentAmount > editTotalAmount) {
      toast.error("Payment amount cannot be more than the invoice total");
      return;
    }

    setIsSavingInvoice(true);

    try {
      const payload = {
        client_name: editForm.client_name.trim(),
        client_email: editForm.client_email.trim(),
        client_phone: editForm.client_phone.trim() || undefined,
        client_address: editForm.client_address.trim() || undefined,
        invoice_date: editForm.invoice_date,
        due_date: editForm.due_date,
        currency: editForm.currency,
        tax_rate: Number(editForm.tax_rate || 0),
        discount_rate: Number(editForm.discount_rate || 0),
        payment_terms: editForm.payment_terms.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        line_items: editForm.line_items.map((item) => {
          const description =
            item.description.trim() ||
            [item.service_name.trim(), item.plan_name.trim()].filter(Boolean).join(" - ");
          const baseAmount = getEditBaseAmount(item);

          return {
            description,
            service_name: item.service_name.trim() || undefined,
            plan_name: item.plan_name.trim() || undefined,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            original_amount: Number(item.original_amount || 0) > 0
              ? Number(item.original_amount || 0)
              : baseAmount,
            item_discount_type: item.item_discount_type,
            item_discount_value:
              item.item_discount_type === "none" ? 0 : Number(item.item_discount_value || 0),
            total: getEditLineTotal(item),
          };
        }),
      };

      await invoicesApi.update(invoiceId, payload);

      if (editInvoiceStatus === "sent" && invoice?.status === "draft") {
        await invoicesApi.markSent(invoiceId);
      }

      if (pendingPaymentAmount > 0) {
        await paymentsApi.record(invoiceId, {
          amount: pendingPaymentAmount,
          payment_date: editPaymentDate,
          payment_mode: editPaymentMode,
          transaction_id: editPaymentTransactionId.trim() || undefined,
          notes: editPaymentNotes.trim() || undefined,
        });
      }

      await mutate();
      setIsEditSheetOpen(false);
      toast.success(
        pendingPaymentAmount > 0 ? "Invoice updated and payment recorded" : "Invoice updated",
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update invoice");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link href="/finance/invoices">
          <Button variant="link">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const currency = invoice.currency || "INR";
  const outstanding = Math.max(
    Number(invoice.total_amount) - Number(invoice.amount_paid),
    0,
  );
  const canRecordPayment =
    (isAdmin || isManager) &&
    outstanding > 0 &&
    ["sent", "overdue"].includes(invoice.status);
  const canManageInvoice = isAdmin || isManager;
  const canEditInvoice = canManageInvoice && invoice.status === "draft";
  const editSubtotal =
    editForm?.line_items.reduce((sum, item) => sum + getEditLineTotal(item), 0) || 0;
  const editDiscountAmount = editSubtotal * ((Number(editForm?.discount_rate || 0)) / 100);
  const editTaxableAmount = editSubtotal - editDiscountAmount;
  const editTaxAmount = editTaxableAmount * ((Number(editForm?.tax_rate || 0)) / 100);
  const editTotalAmount = editTaxableAmount + editTaxAmount;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <FileText className="h-6 w-6 text-primary" />
              {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">{invoice.client_name}</p>
          </div>
          <Badge className={`${STATUS_COLORS[invoice.status]} border-0`}>
            {invoice.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManageInvoice && (
            <Button
              variant="outline"
              onClick={() => handleEditSheetChange(true)}
              disabled={!canEditInvoice}
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Invoice
            </Button>
          )}

          <Button variant="outline" onClick={handleOpenPreview} disabled={isPreviewLoading}>
            {isPreviewLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Preview Invoice
          </Button>

          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
            {isDownloadingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={handleDeleteInvoice}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Invoice
            </Button>
          )}

          {canRecordPayment && (
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>
                      Amount ({formatCurrency(outstanding, currency)} outstanding)
                    </Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      max={outstanding}
                    />
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transaction ID</Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Transaction reference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Proof</Label>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a receipt, screenshot, or gateway confirmation for this payment.
                    </p>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Optional notes for this transaction"
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRecordPayment}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {canManageInvoice && !canEditInvoice && (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Only draft invoices can be edited. This invoice is currently marked as{" "}
          <span className="font-medium capitalize text-foreground">
            {invoice.status.replace("_", " ")}
          </span>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Client Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Name:</span> {invoice.client_name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {invoice.client_email}
            </p>
            {invoice.client_phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span> {invoice.client_phone}
              </p>
            )}
            {invoice.client_address && (
              <p>
                <span className="text-muted-foreground">Address:</span> {invoice.client_address}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Invoice ID:</span>{" "}
              {invoice.invoice_number} / {invoice.id.slice(0, 8).toUpperCase()}
            </p>
            <p>
              <span className="text-muted-foreground">Date:</span>{" "}
              {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span>{" "}
              {format(new Date(invoice.due_date), "dd MMM yyyy")}
            </p>
            <p>
              <span className="text-muted-foreground">Terms:</span>{" "}
              {invoice.payment_terms || "Net 30"}
            </p>
            <p>
              <span className="text-muted-foreground">Currency:</span> {currency}
            </p>
            {invoice.lead && (
              <p>
                <span className="text-muted-foreground">Lead:</span>{" "}
                {invoice.lead.lead_name}
                {(invoice.lead as any).business_name
                  ? ` - ${(invoice.lead as any).business_name}`
                  : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Plan &amp; Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Original Amount</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.line_items?.map((item, index) => {
                const discountLabel = getItemDiscountLabel(item);
                const [discountAmount, discountMeta] =
                  discountLabel === "—" ? ["—", ""] : discountLabel.split("|");

                return (
                  <TableRow key={item.id || index}>
                    <TableCell>{item.service_name || "—"}</TableCell>
                    <TableCell>{getMergedPlanDescription(item)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getOriginalAmount(item), currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {discountAmount === "—" ? (
                        "—"
                      ) : (
                        <div className="space-y-1">
                          <div>{formatCurrency(Number(discountAmount), currency)}</div>
                          {discountMeta ? (
                            <div className="text-xs text-muted-foreground">{discountMeta}</div>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(item.total), currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

            <div className="ml-auto max-w-sm space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(invoice.subtotal), currency)}</span>
              </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount ({invoice.discount_rate}%)</span>
                <span>- {formatCurrency(Number(invoice.discount_amount), currency)}</span>
              </div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                <span>{formatCurrency(Number(invoice.tax_amount), currency)}</span>
              </div>
            )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(Number(invoice.total_amount), currency)}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Payment Made</span>
                  <span>(-) {formatCurrency(Number(invoice.amount_paid), currency)}</span>
                </div>
              )}
              {outstanding > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(outstanding, currency)}</span>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{getPaymentModeLabel(payment.payment_mode)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.transaction_id || "—"}
                    </TableCell>
                    <TableCell>
                      {payment.transaction_proof_url ? (
                        <a
                          href={payment.transaction_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {payment.transaction_proof_name || "View proof"}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(payment.amount), currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Sheet open={isEditSheetOpen} onOpenChange={handleEditSheetChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-3xl">
          <SheetHeader className="gap-2 border-b px-6 py-5 sm:px-8">
            <SheetTitle>Edit Invoice</SheetTitle>
            <SheetDescription>
              Update client details, invoice settings, and line items from this side panel.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {editForm ? (
              <div className="space-y-8 px-6 py-6 sm:px-8">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.id.slice(0, 8).toUpperCase()} / {invoice.status.replace("_", " ")}
                      </p>
                    </div>
                    <Badge className={`${STATUS_COLORS[invoice.status]} border-0 w-fit`}>
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Client Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Keep this aligned with the billing contact shown on the invoice.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client Name</Label>
                      <Input
                        value={editForm.client_name}
                        onChange={(e) => updateEditField("client_name", e.target.value)}
                        placeholder="Client or business name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Email</Label>
                      <Input
                        type="email"
                        value={editForm.client_email}
                        onChange={(e) => updateEditField("client_email", e.target.value)}
                        placeholder="billing@client.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Phone</Label>
                      <Input
                        value={editForm.client_phone}
                        onChange={(e) => updateEditField("client_phone", e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Input
                        value={editForm.payment_terms}
                        onChange={(e) => updateEditField("payment_terms", e.target.value)}
                        placeholder="Net 30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Client Address</Label>
                    <Textarea
                      value={editForm.client_address}
                      onChange={(e) => updateEditField("client_address", e.target.value)}
                      placeholder="Billing address"
                      rows={3}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Invoice Details</h2>
                    <p className="text-sm text-muted-foreground">
                      Control dates, currency, and invoice-level pricing adjustments.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Invoice Date</Label>
                      <Input
                        type="date"
                        value={editForm.invoice_date}
                        onChange={(e) => updateEditField("invoice_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={editForm.due_date}
                        onChange={(e) => updateEditField("due_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={editForm.currency}
                        onValueChange={(value) =>
                          updateEditField("currency", value as CurrencyCode)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editInvoiceStatus}
                        onValueChange={(value) =>
                          setEditInvoiceStatus(value as "draft" | "sent")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.tax_rate}
                        onChange={(e) =>
                          updateEditField("tax_rate", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.discount_rate}
                        onChange={(e) =>
                          updateEditField("discount_rate", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Payment (Optional)</h2>
                    <p className="text-sm text-muted-foreground">
                      Add a payment while saving this invoice. Payments are not shown on the
                      invoice layout itself.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Payment Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPaymentAmount}
                        onChange={(e) => setEditPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Input
                        type="date"
                        value={editPaymentDate}
                        onChange={(e) => setEditPaymentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={editPaymentMode}
                        onValueChange={(value) => setEditPaymentMode(value as PaymentMode)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reference ID</Label>
                      <Input
                        value={editPaymentTransactionId}
                        onChange={(e) => setEditPaymentTransactionId(e.target.value)}
                        placeholder="Transaction reference"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Notes</Label>
                    <Textarea
                      value={editPaymentNotes}
                      onChange={(e) => setEditPaymentNotes(e.target.value)}
                      placeholder="Optional payment note"
                      rows={3}
                    />
                  </div>

                  <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    To record a payment from this panel, save the invoice as{" "}
                    <span className="font-medium text-foreground">Sent</span>. Draft invoices stay
                    editable but cannot accept payments.
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Line Items</h2>
                      <p className="text-sm text-muted-foreground">
                        Edit original amounts and discounts while keeping the final amount visible.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addEditLineItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {editForm.line_items.map((item, index) => {
                      const baseAmount = getEditBaseAmount(item);
                      const itemDiscountAmount = getEditItemDiscountAmount(item);
                      const lineTotal = getEditLineTotal(item);

                      return (
                        <div key={index} className="rounded-2xl border bg-card p-4 sm:p-5">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">Item {index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                Service, description, quantity, and discount configuration.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEditLineItem(index)}
                              disabled={editForm.line_items.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Service</Label>
                              <Input
                                value={item.service_name}
                                onChange={(e) =>
                                  updateEditLineItem(index, "service_name", e.target.value)
                                }
                                placeholder="SEO"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Plan</Label>
                              <Input
                                value={item.plan_name}
                                onChange={(e) =>
                                  updateEditLineItem(index, "plan_name", e.target.value)
                                }
                                placeholder="Platinum Plan"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Description</Label>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateEditLineItem(index, "description", e.target.value)
                                }
                                placeholder="Optional item description"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateEditLineItem(
                                    index,
                                    "quantity",
                                    Number.parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit Price</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateEditLineItem(
                                    index,
                                    "unit_price",
                                    Number.parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Original Amount</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.original_amount}
                                onChange={(e) =>
                                  updateEditLineItem(
                                    index,
                                    "original_amount",
                                    Number.parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Item Discount</Label>
                              <Select
                                value={item.item_discount_type}
                                onValueChange={(value) =>
                                  updateEditLineItem(
                                    index,
                                    "item_discount_type",
                                    value as LineItemInput["item_discount_type"],
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Discount</SelectItem>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {item.item_discount_type !== "none" && (
                              <div className="space-y-2">
                                <Label>
                                  {item.item_discount_type === "percentage"
                                    ? "Discount %"
                                    : "Discount Amount"}
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.item_discount_value}
                                  onChange={(e) =>
                                    updateEditLineItem(
                                      index,
                                      "item_discount_value",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-muted/20 p-4 text-sm md:grid-cols-4">
                            <div>
                              <span className="text-muted-foreground">Base Amount</span>
                              <p className="font-medium">
                                {formatCurrency(baseAmount, editForm.currency)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Original Amount</span>
                              <p className="font-medium">
                                {formatCurrency(
                                  Number(item.original_amount || 0) || baseAmount,
                                  editForm.currency,
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Item Discount</span>
                              <p className="font-medium text-rose-600">
                                {itemDiscountAmount > 0
                                  ? `- ${formatCurrency(itemDiscountAmount, editForm.currency)}`
                                  : "Not applied"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Final Amount</span>
                              <p className="font-semibold">
                                {formatCurrency(lineTotal, editForm.currency)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Notes</h2>
                    <p className="text-sm text-muted-foreground">
                      Add anything the client or team should see on the invoice.
                    </p>
                  </div>

                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => updateEditField("notes", e.target.value)}
                    placeholder="Optional invoice notes"
                    rows={5}
                  />
                </section>

                <section className="rounded-2xl border bg-muted/20 p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-foreground">Totals Preview</h2>
                    <p className="text-sm text-muted-foreground">
                      This preview updates as you edit the invoice.
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(editSubtotal, editForm.currency)}</span>
                    </div>
                    {editDiscountAmount > 0 && (
                      <div className="flex justify-between gap-4 text-rose-600">
                        <span>Discount ({editForm.discount_rate}%)</span>
                        <span>- {formatCurrency(editDiscountAmount, editForm.currency)}</span>
                      </div>
                    )}
                    {editTaxAmount > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Tax ({editForm.tax_rate}%)</span>
                        <span>{formatCurrency(editTaxAmount, editForm.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(editTotalAmount, editForm.currency)}</span>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleEditSheetChange(false)}
              disabled={isSavingInvoice}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveInvoice} disabled={isSavingInvoice}>
              {isSavingInvoice ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
