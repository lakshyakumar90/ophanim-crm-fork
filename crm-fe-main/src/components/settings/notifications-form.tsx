"use client";

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function NotificationsForm() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<{
    email: boolean;
    push: boolean;
    sms: boolean;
  }>({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    if (user?.notificationPreferences) {
      setPreferences({
        email: user.notificationPreferences.email ?? true,
        push: user.notificationPreferences.push ?? true,
        sms: user.notificationPreferences.sms ?? false,
      });
    }
  }, [user]);

  const handleToggle = async (key: keyof typeof preferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);

    // Optimistic update locally, then save
    try {
      // Debouncing could be good, but for now direct save
      await usersApi.updatePreferences({ notificationPreferences: newPrefs });
      await refreshUser();
      toast.success("Preferences saved");
    } catch (error) {
      toast.error("Failed to save preference");
      setPreferences(preferences); // Revert
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose how you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="email-notifs" className="flex flex-col items-start space-y-1">
            <span>Email Notifications</span>
            <span className="font-normal text-xs text-muted-foreground">
              Receive daily summaries and important alerts via email.
            </span>
          </Label>
          <Switch
            id="email-notifs"
            checked={preferences.email}
            onCheckedChange={() => handleToggle("email")}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="push-notifs" className="flex flex-col items-start space-y-1">
            <span>Push Notifications</span>
            <span className="font-normal text-xs text-muted-foreground">
              Receive real-time alerts on your device.
            </span>
          </Label>
          <Switch
            id="push-notifs"
            checked={preferences.push}
            onCheckedChange={() => handleToggle("push")}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="sms-notifs" className="flex flex-col items-start space-y-1">
            <span>SMS Notifications</span>
            <span className="font-normal text-xs text-muted-foreground">
              Receive critical alerts via SMS (charges may apply).
            </span>
          </Label>
          <Switch
            id="sms-notifs"
            checked={preferences.sms}
            onCheckedChange={() => handleToggle("sms")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
