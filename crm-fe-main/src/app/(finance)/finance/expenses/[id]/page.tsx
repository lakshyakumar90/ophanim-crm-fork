"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function ExpenseDetailRedirectPage() {
  const params = useParams();
  useRedirectToListPanel("/finance/expenses", "detail", params.id as string);
  return null;
}
