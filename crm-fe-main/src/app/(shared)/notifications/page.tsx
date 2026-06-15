"use client";

import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { notificationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { toLocaleStringIST } from "@/lib/date-utils";
import { useAuth } from "@/providers/auth-provider";
import { usePollingCoordinator } from "@/lib/polling-coordinator";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isLeader: isPollingLeader } = usePollingCoordinator();

  // Auto-refresh uses leader-only polling to avoid duplicate tab traffic.
  const { data, isLoading } = useSWR(
    "notifications",
    () => notificationsApi.list(),
    {
      refreshInterval: isPollingLeader ? 120000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const notifications: Notification[] = data?.data || data || [];

  useHeaderRefresh({
    onRefresh: () =>
      Promise.all([
        mutate("notifications"),
        mutate("notifications-unread-count"),
      ]).then(() => undefined),
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      mutate("notifications");
      mutate("notifications-unread-count");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      mutate("notifications");
      mutate("notifications-unread-count");
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      mutate("notifications");
      mutate("notifications-unread-count");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  // Navigate to related entity (lead, task, etc.)
  const handleNavigateToEntity = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
      return;
    }

    if (
      notification.relatedEntityType === "lead" &&
      notification.relatedEntityId
    ) {
      const departmentSlug = user?.departmentSlug || "sales";
      router.push(`/${departmentSlug}/leads/${notification.relatedEntityId}`);
      // Mark as read when clicking
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
    } else if (
      notification.relatedEntityType === "task" &&
      notification.relatedEntityId
    ) {
      const departmentSlug = user?.departmentSlug || "sales";
      router.push(`/${departmentSlug}/tasks`);
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
    }
  };

  // Check if notification has a valid link
  const hasLink = (notification: Notification) => {
    return (
      notification.relatedEntityType &&
      notification.relatedEntityId &&
      ["lead", "task"].includes(notification.relatedEntityType)
    );
  };

  const isLinkedNotification = (notification: Notification) =>
    Boolean(notification.actionUrl) || hasLink(notification);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your activities
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex gap-4 ${
                    !notification.isRead
                      ? "bg-blue-50/50 dark:bg-blue-950/20"
                      : ""
                  } ${isLinkedNotification(notification) ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                  onClick={() =>
                    isLinkedNotification(notification) &&
                    handleNavigateToEntity(notification)
                  }
                >
                  <div
                    className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                      !notification.isRead ? "bg-blue-500" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {notification.title}
                          </h4>
                          {isLinkedNotification(notification) && (
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 break-words">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            {toLocaleStringIST(notification.createdAt)}
                          </p>
                          {notification.relatedEntityType && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground capitalize">
                              {notification.relatedEntityType}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
