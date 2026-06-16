"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewTaskRedirectPage() {
  useRedirectToListPanel("/sales/tasks", "create");
  return null;
}
