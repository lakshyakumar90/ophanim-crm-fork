"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, AlarmClock, ArrowRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getUnreadNotificationCount, getUpcomingReminders } from "@/lib/supabase-queries";
import { isToday } from "date-fns";

const SESSION_KEY = "login_notice_shown";

interface LoginNoticeDialogProps {
  userId: string;
}

export function LoginNoticeDialog({ userId }: LoginNoticeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayReminderCount, setTodayReminderCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const fetchAndShow = useCallback(async () => {
    // Only show once per session
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      return;
    }

    try {
      const [unread, reminders] = await Promise.all([
        getUnreadNotificationCount(),
        getUpcomingReminders(userId),
      ]);

      const unreadCnt = unread?.count || 0;
      const todayCnt = reminders.filter((r: any) => isToday(new Date(r.dueDate))).length;

      setUnreadCount(unreadCnt);
      setTodayReminderCount(todayCnt);
      setLoaded(true);

      if (unreadCnt > 0 || todayCnt > 0) {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(SESSION_KEY, "1");
        }
        setOpen(true);
      }
    } catch {
      // Non-critical; don't show on error
    }
  }, [userId]);

  useEffect(() => {
    // Small delay so the page finishes loading first
    const timer = setTimeout(fetchAndShow, 1500);
    return () => clearTimeout(timer);
  }, [fetchAndShow]);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 10000);
    return () => clearTimeout(timer);
  }, [open]);

  if (!loaded || (!unreadCount && !todayReminderCount)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Welcome back!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {unreadCount > 0 && (
            <button
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/60 transition-colors text-left group"
            >
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">Tap to view</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          )}

          {todayReminderCount > 0 && (
            <button
              onClick={() => { setOpen(false); router.push("/tasks"); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/60 transition-colors text-left group"
            >
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlarmClock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {todayReminderCount} task reminder{todayReminderCount !== 1 ? "s" : ""} due today
                </p>
                <p className="text-xs text-muted-foreground">Tap to view tasks</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">Auto-dismisses in a few seconds</p>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-7 gap-1 text-xs">
            <X className="h-3 w-3" />
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
