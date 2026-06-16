"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function PerformanceCycleDetailRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/hr/performance", "detail", id as string);
  return null;
}
