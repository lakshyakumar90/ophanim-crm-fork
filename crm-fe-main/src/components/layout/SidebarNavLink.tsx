"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/config/sidebar-nav/types";

export function SidebarNavLink({
  item,
  isActive,
  collapsed,
  badgeCount,
  badgeColor = "red",
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
  badgeCount?: number;
  badgeColor?: "red" | "amber";
}) {
  const badgeVariant = badgeColor === "amber" ? "secondary" : "destructive";

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        collapsed ? "justify-center px-2" : "",
      )}
    >
      <div className="relative">
        <item.icon
          className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            isActive
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        {collapsed && badgeCount && badgeCount > 0 && (
          <Badge
            variant={badgeVariant}
            className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 flex items-center justify-center px-0.5 text-[10px] rounded-full"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </Badge>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.title}</span>
          {badgeCount && badgeCount > 0 && (
            <Badge
              variant={badgeVariant}
              className="h-5 min-w-5 flex items-center justify-center px-1.5 text-[10px]"
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}
