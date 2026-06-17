"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ProjectManagementRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}
