"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function InvoiceDetailRedirectPage() {
  const params = useParams();
  useRedirectToListPanel("/finance/invoices", "detail", params.id as string);
  return null;
}
