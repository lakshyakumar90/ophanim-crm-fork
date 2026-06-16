"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function EditUserRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/global/users", "edit", id as string);
  return null;
}
