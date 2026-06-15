"use client";

import { useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { notificationsApi, leadsApi } from "@/lib/api";
import { usePollingCoordinator } from "@/lib/polling-coordinator";
import { fetchPerformanceReminderCounts } from "@/lib/performance-api";
import { useAuth } from "@/providers/auth-provider";

export function useSidebarBadges() {
  const { user } = useAuth();
  const { isLeader: isPollingLeader, publish } = usePollingCoordinator((payload) => {
    if (typeof payload.unreadCount === "number") {
      void globalMutate(
        "notifications-unread-count",
        { count: payload.unreadCount },
        { revalidate: false },
      );
    }
    if (typeof payload.remindersCount === "number") {
      void globalMutate(
        "sidebar-reminders-count",
        { count: payload.remindersCount },
        { revalidate: false },
      );
    }
  });

  const { data: unreadData } = useSWR(
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
  const unreadCount = unreadData?.count || 0;

  const { data: remindersData } = useSWR(
    user ? "sidebar-reminders-count" : null,
    () => leadsApi.getRemindersCount({ status: "pending" }),
    {
      refreshInterval: 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const remindersCount = remindersData?.count || 0;

  const { data: perfReminderCounts } = useSWR(
    user ? "performance-reminder-counts" : null,
    () => fetchPerformanceReminderCounts(),
    {
      refreshInterval: 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const myReviewReminderCount = perfReminderCounts?.myReview || 0;
  const peerFeedbackReminderCount = perfReminderCounts?.peerFeedback || 0;

  useEffect(() => {
    if (!user || !isPollingLeader) return;
    publish({ unreadCount, remindersCount });
  }, [isPollingLeader, publish, remindersCount, unreadCount, user]);

  return {
    unreadCount,
    remindersCount,
    myReviewReminderCount,
    peerFeedbackReminderCount,
  };
}
