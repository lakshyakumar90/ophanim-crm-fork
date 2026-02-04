"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";

/**
 * Hook to sync user's theme preference from database with next-themes.
 * Only applies on initial load to avoid overriding local toggle changes.
 */
export function useThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const hasApplied = useRef(false);

  useEffect(() => {
    // Only apply user's theme preference once on initial load
    if (user?.themePreference && !hasApplied.current) {
      setTheme(user.themePreference);
      hasApplied.current = true;
    }
  }, [user?.themePreference, setTheme]);
}

/**
 * Component that syncs user's theme preference on mount.
 * Include this in the dashboard layout.
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  useThemeSync();
  return <>{children}</>;
}
