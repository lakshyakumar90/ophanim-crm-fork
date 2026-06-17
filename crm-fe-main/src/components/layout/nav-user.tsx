"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user?.fullName ? getInitials(user.fullName) : "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.fullName}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {user?.role}
                </p>
              </div>
            ) : null}
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={logout}
            tooltip="Logout"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
