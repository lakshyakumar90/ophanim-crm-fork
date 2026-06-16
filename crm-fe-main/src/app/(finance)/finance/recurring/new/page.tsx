"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewRecurringRedirectPage() {
  useRedirectToListPanel("/finance/recurring", "create");
  return null;
}
