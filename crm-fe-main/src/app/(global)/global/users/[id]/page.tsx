"use client";

import { useParams } from "next/navigation";
import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function UserDetailRedirectPage() {
  const { id } = useParams();
  useRedirectToListPanel("/global/users", "detail", id as string);
  return null;
}
