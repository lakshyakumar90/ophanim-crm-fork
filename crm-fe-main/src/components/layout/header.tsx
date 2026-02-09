"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Bell, Menu, Sun, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/providers/auth-provider";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import useSWR from "swr";
import { notificationsApi, usersApi } from "@/lib/api";
import { useTheme } from "next-themes";
import { DepartmentSwitcher } from "@/components/layout/department-switcher";
import { GlobalSearch } from "@/components/search/global-search";

export function Header() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  // Track the last theme value synced from DB to prevent reverting optimistic updates
  const syncedThemeRef = useRef<string | null>(null);

  // Fetch unread count - use same key as sidebar for shared cache
  const { data: unreadData, mutate } = useSWR(
    user ? "notifications-unread-count" : null,
    () => notificationsApi.getUnreadCount(),
    { refreshInterval: 30000 }, // Refresh every 30 seconds to stay in sync
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

  const refreshNotifications = () => {
    // Manually revalidate
    notificationsApi.getUnreadCount().then((res) => {
      // SWR mutate would be better but simple re-fetch works
      // To do it properly with SWR:
    });
    // Actually we can just use the bound mutate from useSWR if we capture it
  };

  const unreadCount = unreadData?.count || 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1 max-w-xl hidden md:block">
        <GlobalSearch />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <DepartmentSwitcher />

        {/* Refresh Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-accent mr-1"
          onClick={() => mutate("notifications-unread-count")}
          title="Refresh Notifications"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-accent"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>

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
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
            <DropdownMenuItem onClick={logout} className="text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
