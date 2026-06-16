"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewQuoteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sales/quotes?create=1");
  }, [router]);
  return null;
}
