"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function TeamEditRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/sales/teams", "detail", id as string);
  return null;
}
