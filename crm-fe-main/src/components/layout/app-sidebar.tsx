"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <Link
          href="/"
          className="flex h-full items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary">
            <Target className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="truncate text-base font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            CRM
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <NavMain />
      </SidebarContent>
      <NavUser />
      <SidebarRail />
    </Sidebar>
  );
}
