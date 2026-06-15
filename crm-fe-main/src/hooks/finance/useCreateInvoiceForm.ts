"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  createInvoiceDefaultValues,
  createInvoiceFormSchema,
  emptyLineItem,
  getCreateBaseAmount,
  getCreateInvoiceTotals,
  getCreateItemDiscountAmount,
  getCreateLineTotal,
  type CreateInvoiceFormValues,
} from "@/lib/finance/invoice-form-schema";
import { formatCurrency } from "@/lib/invoice-line-item-math";
import {
  createInvoiceWithOptionalPayment,
  fetchWonLeads,
  getCreateInvoiceErrorMessage,
  getLeadBusiness,
  getLeadEmail,
  getLeadName,
  getLeadPhone,
  normalizeWonLeads,
} from "@/lib/finance/invoice-actions";

export function useCreateInvoiceForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: createInvoiceDefaultValues,
  });

  const { register, control, handleSubmit, watch, setValue } = form;

  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItemField,
  } = useFieldArray({
    control,
    name: "line_items",
  });

  const leadId = watch("lead_id");
  const currency = watch("currency");
  const discountRate = watch("discount_rate");
  const taxRate = watch("tax_rate");
  const lineItems = watch("line_items");

  const { data: wonLeadsData, isLoading: leadsLoading } = useSWR(
    user ? "won-leads-for-invoices" : null,
    fetchWonLeads,
  );

  const wonLeads = useMemo(() => normalizeWonLeads(wonLeadsData), [wonLeadsData]);

  const selectedLead = wonLeads.find((lead: { id: string }) => lead.id === leadId);

  const totals = useMemo(
    () => getCreateInvoiceTotals(lineItems, discountRate, taxRate),
    [lineItems, discountRate, taxRate],
  );

  const handleLeadChange = (id: string) => {
    if (!id) {
      setValue("lead_id", "");
      return;
    }

    setValue("lead_id", id);
    const lead = wonLeads.find((entry: { id: string }) => entry.id === id);
    if (!lead) return;

    setValue("client_name", getLeadBusiness(lead) || getLeadName(lead) || "");
    setValue("client_email", getLeadEmail(lead));
    setValue("client_phone", getLeadPhone(lead));
  };

  const addLineItem = () => {
    appendLineItem(emptyLineItem());
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    removeLineItemField(index);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!values.client_name.trim() || !values.client_email.trim() || !values.due_date) {
      toast.error("Please fill in the client details and due date");
      return;
    }

    const invalidItem = values.line_items.find((item) => {
      const hasDescriptor =
        item.description.trim() || item.service_name.trim() || item.plan_name.trim();
      return !hasDescriptor || item.quantity <= 0 || item.unit_price < 0;
    });

    if (invalidItem) {
      toast.error("Each invoice item needs a service, plan, or description");
      return;
    }

    const initialPaymentAmount = Number.parseFloat(values.payment_amount) || 0;
    if (initialPaymentAmount > 0 && values.invoice_status === "draft") {
      toast.error("Set the invoice status to Sent before adding a payment");
      return;
    }

    const { totalAmount } = getCreateInvoiceTotals(
      values.line_items,
      values.discount_rate,
      values.tax_rate,
    );

    if (initialPaymentAmount > totalAmount) {
      toast.error("Payment amount cannot be more than the invoice total");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceId = await createInvoiceWithOptionalPayment(values);

      toast.success(
        initialPaymentAmount > 0 ? "Invoice and payment created" : "Invoice created",
      );

      router.push(`/finance/invoices/${invoiceId}`);
    } catch (error: unknown) {
      toast.error(getCreateInvoiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    form,
    register,
    control,
    setValue,
    isSubmitting,
    leadPickerOpen,
    setLeadPickerOpen,
    wonLeads,
    leadsLoading,
    selectedLead,
    leadId,
    currency,
    discountRate,
    taxRate,
    lineItems,
    lineItemFields,
    totals,
    handleLeadChange,
    addLineItem,
    removeLineItem,
    onSubmit,
    getCreateBaseAmount,
    getCreateItemDiscountAmount,
    getCreateLineTotal,
    formatCurrency,
    getLeadName,
    getLeadBusiness,
    getLeadEmail,
  };
}
