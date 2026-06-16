"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function NewPerformanceCycleRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const edit = searchParams.get("edit");

  useEffect(() => {
    router.replace(
      edit ? `/hr/performance?create=1&edit=${edit}` : "/hr/performance?create=1",
    );
  }, [router, edit]);

  return null;
}

export default function NewPerformanceCycleRedirectPage() {
  return (
    <Suspense fallback={null}>
      <NewPerformanceCycleRedirectContent />
    </Suspense>
  );
}
