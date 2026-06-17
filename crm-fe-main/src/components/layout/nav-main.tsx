"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { globalItems } from "@/config/sidebar-nav/global";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useSidebarBadges } from "@/hooks/layout/useSidebarBadges";
import { filterGlobalNav, isNavItemActive } from "@/lib/sidebar-nav-utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavDepartments } from "@/components/layout/nav-departments";

export function NavMain() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const {
    unreadCount,
    remindersCount,
    myReviewReminderCount,
    peerFeedbackReminderCount,
  } = useSidebarBadges();

  const filteredGlobal = filterGlobalNav(
    globalItems,
    user,
    isAdmin,
    isManager,
  );

  const getBadgeCount = (item: (typeof globalItems)[number]) => {
    if (item.showBadge) return unreadCount;
    if (item.showReminderBadge) return remindersCount;
    if (item.showMyReviewBadge) return myReviewReminderCount;
    if (item.showPeerFeedbackBadge) return peerFeedbackReminderCount;
    return undefined;
  };

  const attendanceIndex = filteredGlobal.findIndex(
    (item) => item.title === "Attendance",
  );
  const beforeDepartments =
    attendanceIndex >= 0
      ? filteredGlobal.slice(0, attendanceIndex + 1)
      : filteredGlobal;
  const afterDepartments =
    attendanceIndex >= 0
      ? filteredGlobal.slice(attendanceIndex + 1)
      : [];

  const renderNavItem = (item: (typeof globalItems)[number]) => {
    const badge = getBadgeCount(item);
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isNavItemActive(pathname, item.href)}
          tooltip={item.title}
        >
          <Link href={item.href}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {badge && badge > 0 ? (
          <SidebarMenuBadge>{badge > 9 ? "9+" : badge}</SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {beforeDepartments.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <NavDepartments />
      {afterDepartments.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{afterDepartments.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
    </>
  );
}
