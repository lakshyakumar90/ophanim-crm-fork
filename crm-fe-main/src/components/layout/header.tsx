"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sun, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";
import useSWR, { mutate as globalMutate } from "swr";
import { notificationsApi, usersApi } from "@/lib/api";
import { useTheme } from "next-themes";
import { DepartmentSwitcher } from "@/components/layout/department-switcher";
import { GlobalSearch } from "@/components/search/global-search";
import { usePollingCoordinator } from "@/lib/polling-coordinator";
import { useHeaderRefreshController } from "@/providers/header-refresh-provider";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { RemindersPopover } from "@/components/notifications/reminders-popover";

export function Header() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    enabled: isPageRefreshEnabled,
    isRefreshing: isPageRefreshing,
    triggerRefresh,
  } = useHeaderRefreshController();
  const { isLeader: isPollingLeader, publish } = usePollingCoordinator(
    (payload) => {
      if (typeof payload.unreadCount === "number") {
        void globalMutate(
          "notifications-unread-count",
          { count: payload.unreadCount },
          { revalidate: false },
        );
      }
    },
  );
  // Track the last theme value synced from DB to prevent reverting optimistic updates
  const syncedThemeRef = useRef<string | null>(null);

  // Fetch unread count - used to sync via polling coordinator
  const { data: unreadData, mutate: mutateUnreadCount } = useSWR(
    user ? "notifications-unread-count" : null,
    () => notificationsApi.getUnreadCount(),
    {
      refreshInterval: isPollingLeader ? 120000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Sync theme with user preference on load
  useEffect(() => {
    if (
      user?.themePreference &&
      user.themePreference !== syncedThemeRef.current
    ) {
      setTheme(user.themePreference);
      syncedThemeRef.current = user.themePreference;
    }
  }, [user?.themePreference, setTheme]);

  const handleThemeToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (user) {
      try {
        await usersApi.updatePreferences({ themePreference: newTheme });
        // Refresh user to get the latest preference in the auth context
        await refreshUser();
      } catch (error) {
        console.error("Failed to update theme preference", error);
      }
    }
  };

  const unreadCount = unreadData?.count || 0;
  void unreadCount; // Used by polling coordinator publish below

  const handleRefresh = async () => {
    if (!isPageRefreshEnabled || isPageRefreshing) {
      return;
    }

    try {
      await triggerRefresh();
      await mutateUnreadCount();
    } catch (error) {
      console.error("Failed to refresh page data", error);
    }
  };

  useEffect(() => {
    if (!user || !isPollingLeader) return;
    publish({ unreadCount });
  }, [isPollingLeader, publish, unreadCount, user]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-3 lg:px-4">
      {/* Mobile menu */}
      <SidebarTrigger className="lg:hidden" />

      {/* Search */}
      <div className="flex-1 max-w-xl hidden md:block">
        <GlobalSearch />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <DepartmentSwitcher />

        {/* Refresh Page Data */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-accent mr-1"
          onClick={handleRefresh}
          title={
            isPageRefreshEnabled ? "Refresh current page data" : "No page data to refresh"
          }
          disabled={!isPageRefreshEnabled || isPageRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isPageRefreshing ? "animate-spin" : ""}`} />
        </Button>

        {/* Reminders popover */}
        {user && <RemindersPopover />}

        {/* Notifications popover */}
        {user && <NotificationsPopover />}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-accent"
          onClick={handleThemeToggle}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3 text-muted-foreground hover:bg-accent"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.fullName ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">
                {user?.fullName?.split(" ")[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings/password")}>
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
