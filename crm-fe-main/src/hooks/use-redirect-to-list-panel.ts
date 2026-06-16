"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect legacy full-page routes to list + side panel query params. */
export function useRedirectToListPanel(
  listPath: string,
  mode: "create" | "detail" | "edit",
  detailId?: string,
) {
  const router = useRouter();
  useEffect(() => {
    if (mode === "create") {
      router.replace(`${listPath}?create=1`);
      return;
    }
    if (mode === "edit" && detailId) {
      router.replace(`${listPath}?edit=${detailId}`);
      return;
    }
    if (mode === "detail" && detailId) {
      router.replace(`${listPath}?id=${detailId}`);
    }
  }, [listPath, mode, detailId, router]);
}
