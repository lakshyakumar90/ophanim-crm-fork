"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function GlobalAddMemberRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/global/teams", "detail", id as string);
  return null;
}
