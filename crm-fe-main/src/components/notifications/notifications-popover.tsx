"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronRight,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/lib/api";
import { getNotifications, getUnreadNotificationCount } from "@/lib/supabase-queries";
import { formatDistanceToNow } from "date-fns";
import useSWR, { mutate as globalMutate } from "swr";

function NotificationIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (type === "reminder") return <Clock className={cn(cls, "text-amber-500")} />;
  if (type === "success") return <CheckCircle className={cn(cls, "text-emerald-500")} />;
  if (type === "warning" || type === "error") return <AlertCircle className={cn(cls, "text-red-500")} />;
  return <Info className={cn(cls, "text-blue-500")} />;
}

export function NotificationsPopover() {
  const router = useRouter();

  const { data: unreadData } = useSWR(
    "notifications-unread-count",
    () => getUnreadNotificationCount(),
    { refreshInterval: 120000, revalidateOnFocus: false },
  );

  const { data: notifData, isLoading, mutate } = useSWR(
    "notifications-popover",
    () => getNotifications({ limit: 5 }),
    { revalidateOnFocus: false },
  );

  const unreadCount = unreadData?.count || 0;
  const notifications = notifData?.data || [];

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      await mutate();
      await globalMutate("notifications-unread-count", { count: 0 }, { revalidate: false });
    } catch {
      // ignore
    }
  }, [mutate]);

  const handleNotificationClick = useCallback(async (notif: any) => {
    if (!notif.isRead) {
      try {
        await notificationsApi.markAsRead(notif.id);
        await mutate();
        await globalMutate(
          "notifications-unread-count",
          (prev: any) => ({ count: Math.max(0, (prev?.count || 1) - 1) }),
          { revalidate: false },
        );
      } catch {
        // ignore
      }
    }
    if (notif.actionUrl) router.push(notif.actionUrl);
    else router.push("/notifications");
  }, [mutate, router]);

  return (
    <Popover onOpenChange={(open) => { if (open) mutate(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 border-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notif: any) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0",
                  !notif.isRead && "bg-primary/5",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <NotificationIcon type={notif.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", !notif.isRead && "text-foreground", notif.isRead && "text-muted-foreground")}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <button
            onClick={() => router.push("/notifications")}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            See All Notifications
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
