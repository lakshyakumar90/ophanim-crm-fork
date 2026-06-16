"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function TaskDetailRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/sales/tasks", "detail", id as string);
  return null;
}
