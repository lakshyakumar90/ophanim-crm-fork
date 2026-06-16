"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewEmailRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/emails?create=1");
  }, [router]);
  return null;
}
