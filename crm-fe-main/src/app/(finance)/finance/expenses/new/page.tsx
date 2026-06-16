"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewExpenseRedirectPage() {
  useRedirectToListPanel("/finance/expenses", "create");
  return null;
}
