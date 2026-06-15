"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  createRecurringDefaultValues,
  DAY_OF_WEEK_OPTIONS,
  emptyRecurringLineItem,
  getRecurringBaseAmount,
  validateRecurringForm,
  type CreateRecurringFormValues,
  type RecurringLineItemInput,
} from "@/lib/finance/recurring-form-schema";
import {
  createRecurringSchedule,
  fetchLeadsForRecurring,
  getCreateRecurringErrorMessage,
  getLeadClientAutofill,
  normalizeLeads,
} from "@/lib/finance/recurring-actions";

export function useCreateRecurringForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, control } =
    useForm<CreateRecurringFormValues>({
      defaultValues: createRecurringDefaultValues,
    });

  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItemField,
    update: updateLineItemField,
  } = useFieldArray({
    control,
    name: "line_items",
  });

  const frequency = watch("frequency");
  const lineItems = watch("line_items");

  const { data: leadsData } = useSWR(user ? "leads-list" : null, fetchLeadsForRecurring);

  const leads = normalizeLeads(leadsData);

  const baseAmount = useMemo(
    () => getRecurringBaseAmount(lineItems),
    [lineItems],
  );

  const handleLeadChange = (id: string) => {
    setValue("lead_id", id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      const autofill = getLeadClientAutofill(lead);
      setValue("client_name", autofill.client_name);
      setValue("client_email", autofill.client_email);
    }
  };

  const addLineItem = () => {
    appendLineItem(emptyRecurringLineItem());
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      removeLineItemField(index);
    }
  };

  const updateLineItem = <K extends keyof RecurringLineItemInput>(
    index: number,
    field: K,
    value: RecurringLineItemInput[K],
  ) => {
    const current = lineItems[index];
    if (!current) return;
    updateLineItemField(index, { ...current, [field]: value });
  };

  const onSubmit = handleSubmit(async (values) => {
    const validationError = validateRecurringForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecurringSchedule(values);
      toast.success("Recurring schedule created");
      router.push("/finance/recurring");
    } catch (error: unknown) {
      toast.error(getCreateRecurringErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    register,
    watch,
    setValue,
    control,
    frequency,
    lineItems,
    lineItemFields,
    leads,
    baseAmount,
    days: DAY_OF_WEEK_OPTIONS,
    handleLeadChange,
    addLineItem,
    removeLineItem,
    updateLineItem,
    isSubmitting,
    onSubmit,
  };
}
