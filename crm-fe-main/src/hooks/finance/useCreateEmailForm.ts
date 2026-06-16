"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  createEmailDefaultValues,
  validateEmailForm,
  type CreateEmailFormValues,
} from "@/lib/finance/email-form-schema";
import {
  createEmailRequestWithOptionalSubmit,
  fetchInvoicesForEmail,
  fetchLeadsForEmail,
  getCreateEmailErrorMessage,
  getInvoiceAutofill,
  getLeadAutofill,
  normalizeInvoices,
  normalizeLeads,
} from "@/lib/finance/email-actions";

export function useCreateEmailForm(options?: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<CreateEmailFormValues>({
    defaultValues: createEmailDefaultValues,
  });

  const emailType = watch("email_type");
  const invoiceId = watch("invoice_id");

  const { data: invoicesData } = useSWR(
    user ? "invoices-for-email" : null,
    fetchInvoicesForEmail,
  );

  const { data: leadsData } = useSWR(user ? "leads-for-email" : null, fetchLeadsForEmail);

  const invoices = normalizeInvoices(invoicesData);
  const leads = normalizeLeads(leadsData);

  const handleInvoiceChange = (id: string) => {
    setValue("invoice_id", id);
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice) {
      const autofill = getInvoiceAutofill(invoice);
      setValue("recipient_name", autofill.recipient_name);
      setValue("recipient_email", autofill.recipient_email);
      setValue("subject", autofill.subject);
      setValue("body", autofill.body);
    }
  };

  const handleLeadChange = (id: string) => {
    setValue("lead_id", id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      const autofill = getLeadAutofill(lead);
      setValue("recipient_name", autofill.recipient_name);
      setValue("recipient_email", autofill.recipient_email);
    }
  };

  const submitEmail = async (values: CreateEmailFormValues, submitForApproval: boolean) => {
    const validationError = validateEmailForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmailRequestWithOptionalSubmit(values, submitForApproval);

      if (submitForApproval) {
        toast.success("Email request submitted for approval");
      } else {
        toast.success("Email request saved as draft");
      }

      if (options?.onSuccess) {
        options.onSuccess();
      } else {
        router.push("/finance/emails");
      }
    } catch (error: unknown) {
      toast.error(getCreateEmailErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSaveDraft = handleSubmit((values) => submitEmail(values, false));
  const onSubmitForApproval = handleSubmit((values) => submitEmail(values, true));

  const leadId = watch("lead_id");

  return {
    register,
    watch,
    setValue,
    emailType,
    invoiceId,
    leadId,
    invoices,
    leads,
    isSubmitting,
    handleInvoiceChange,
    handleLeadChange,
    onSaveDraft,
    onSubmitForApproval,
  };
}
