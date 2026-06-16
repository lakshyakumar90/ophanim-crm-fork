"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewTeamRedirectPage() {
  useRedirectToListPanel("/sales/teams", "create");
  return null;
}
