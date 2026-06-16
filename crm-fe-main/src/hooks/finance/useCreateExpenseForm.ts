"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  createExpenseDefaultValues,
  validateExpenseForm,
  type CreateExpenseFormValues,
} from "@/lib/finance/expense-form-schema";
import {
  fetchExpenseCategories,
  getSubmitExpenseErrorMessage,
  submitExpense,
} from "@/lib/finance/expense-actions";

export function useCreateExpenseForm(options?: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<CreateExpenseFormValues>({
    defaultValues: createExpenseDefaultValues,
  });

  const categoryId = watch("category_id");

  const { data: categoriesData } = useSWR(
    user ? "expense-categories" : null,
    fetchExpenseCategories,
  );

  const categories = categoriesData || [];

  const onSubmit = handleSubmit(async (values) => {
    const validationError = validateExpenseForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitExpense(values);
      toast.success("Expense submitted for approval");
      if (options?.onSuccess) {
        options.onSuccess();
      } else {
        router.push("/finance/expenses");
      }
    } catch (error: unknown) {
      toast.error(getSubmitExpenseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    register,
    watch,
    setValue,
    categoryId,
    categories,
    isSubmitting,
    onSubmit,
  };
}
