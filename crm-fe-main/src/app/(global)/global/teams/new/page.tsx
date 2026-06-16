"use client";

import { useRedirectToListPanel } from "@/hooks/use-redirect-to-list-panel";

export default function NewGlobalTeamRedirectPage() {
  useRedirectToListPanel("/global/teams", "create");
  return null;
}
