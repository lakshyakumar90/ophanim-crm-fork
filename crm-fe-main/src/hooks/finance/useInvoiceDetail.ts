"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { invoicesApi, paymentsApi, type CurrencyCode, type Invoice, type PaymentMode } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import {
  CURRENCY_OPTIONS,
  createInvoiceEditForm,
  emptyLineItem,
  getEditBaseAmount,
  getEditItemDiscountAmount,
  getEditLineTotal,
  type InvoiceEditForm,
  type LineItemInput,
} from "@/lib/invoice-line-item-math";

export function useInvoiceDetail(overrideId?: string | null) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const params = useParams();
  const invoiceId = (overrideId ?? params.id) as string;

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

  const editSubtotal =
    editForm?.line_items.reduce((sum, item) => sum + getEditLineTotal(item), 0) || 0;
  const editDiscountAmount = editSubtotal * (Number(editForm?.discount_rate || 0) / 100);
  const editTaxableAmount = editSubtotal - editDiscountAmount;
  const editTaxAmount = editTaxableAmount * (Number(editForm?.tax_rate || 0) / 100);
  const editTotalAmount = editTaxableAmount + editTaxAmount;

  return {
    user, isAdmin, isManager, invoiceId, invoice, isLoading, mutate,
    isPaymentDialogOpen, setIsPaymentDialogOpen, paymentAmount, setPaymentAmount,
    paymentMode, setPaymentMode, paymentDate, setPaymentDate, transactionId, setTransactionId,
    paymentNotes, setPaymentNotes, paymentProofFile, setPaymentProofFile, isSubmitting,
    isPreviewLoading, isDownloadingPdf, isEditSheetOpen, setIsEditSheetOpen, isSavingInvoice,
    editForm, setEditForm, editInvoiceStatus, setEditInvoiceStatus, editPaymentAmount, setEditPaymentAmount,
    editPaymentDate, setEditPaymentDate, editPaymentMode, setEditPaymentMode,
    editPaymentTransactionId, setEditPaymentTransactionId, editPaymentNotes, setEditPaymentNotes,
    handleOpenPreview, handleDownloadPdf, handleDeleteInvoice, handleRecordPayment,
    handleEditSheetChange, updateEditField, updateEditLineItem, addEditLineItem, removeEditLineItem,
    handleSaveInvoice, editSubtotal, editDiscountAmount, editTaxableAmount, editTaxAmount, editTotalAmount,
  };
}
