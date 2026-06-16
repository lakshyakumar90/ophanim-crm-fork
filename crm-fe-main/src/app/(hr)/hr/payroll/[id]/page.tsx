"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function PayrollRunDetailRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/hr/payroll", "detail", id as string);
  return null;
}
