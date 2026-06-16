"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewBudgetRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/budgets?create=1");
  }, [router]);
  return null;
}
