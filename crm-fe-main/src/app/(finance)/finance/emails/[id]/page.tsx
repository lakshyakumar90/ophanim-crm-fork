"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EmailDetailRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/finance/emails?id=${id}`);
  }, [id, router]);

  return null;
}
