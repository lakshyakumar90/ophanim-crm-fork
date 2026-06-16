"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function RecurringDetailRedirectPage() {
  const params = useParams();
  useRedirectToListPanel("/finance/recurring", "detail", params.id as string);
  return null;
}
