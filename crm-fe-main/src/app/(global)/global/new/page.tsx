"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewUserRedirectPage() {
  useRedirectToListPanel("/global/users", "create");
  return null;
}
