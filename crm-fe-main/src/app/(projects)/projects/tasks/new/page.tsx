"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function NewProjectTaskRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    const qs = new URLSearchParams({ create: "1" });
    if (projectId) qs.set("projectId", projectId);
    router.replace(`/projects/tasks?${qs.toString()}`);
  }, [router, projectId]);

  return null;
}

export default function NewProjectTaskRedirectPage() {
  return (
    <Suspense fallback={null}>
      <NewProjectTaskRedirectContent />
    </Suspense>
  );
}
