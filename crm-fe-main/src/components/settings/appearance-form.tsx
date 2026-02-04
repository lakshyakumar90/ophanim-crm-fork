"use client";

import { useAuth } from "@/providers/auth-provider";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usersApi } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

export function AppearanceForm() {
  const { user, refreshUser } = useAuth();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync theme from user preferences on mount
  useEffect(() => {
    if (user?.themePreference && mounted) {
      setTheme(user.themePreference);
    }
  }, [user?.themePreference, mounted, setTheme]);

  const handleThemeChange = useCallback(
    async (val: string) => {
      setTheme(val);
      setIsSaving(true);
      try {
        await usersApi.updatePreferences({ themePreference: val });
        await refreshUser();
        toast.success("Theme updated successfully");
      } catch (error) {
        toast.error("Failed to save theme preference");
      } finally {
        setIsSaving(false);
      }
    },
    [setTheme, refreshUser],
  );

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const themeOptions = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      preview: "bg-white border-gray-200",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      preview: "bg-gray-900 border-gray-700",
    },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      preview: "bg-gradient-to-r from-white to-gray-900",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-medium">Theme</Label>
          <p className="text-sm text-muted-foreground">
            Select your preferred theme for the application
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  disabled={isSaving}
                  className={`
                    relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                    }
                    ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  onClick={() => handleThemeChange(option.value)}
                >
                  <div
                    className={`w-full h-12 rounded-md border ${option.preview}`}
                  />
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}
                    >
                      {option.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Current theme:{" "}
            <span className="font-medium capitalize">{resolvedTheme}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
