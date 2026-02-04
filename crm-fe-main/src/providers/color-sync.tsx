"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";

// Color palette definitions for primary colors
const colorPalettes: Record<string, { light: string; dark: string }> = {
  blue: {
    light: "#3b82f6", // blue-500
    dark: "#60a5fa", // blue-400
  },
  indigo: {
    light: "#6366f1", // indigo-500
    dark: "#818cf8", // indigo-400
  },
  rose: {
    light: "#f43f5e", // rose-500
    dark: "#fb7185", // rose-400
  },
  green: {
    light: "#22c55e", // green-500
    dark: "#4ade80", // green-400
  },
  orange: {
    light: "#f97316", // orange-500
    dark: "#fb923c", // orange-400
  },
  violet: {
    light: "#8b5cf6", // violet-500
    dark: "#a78bfa", // violet-400
  },
  cyan: {
    light: "#06b6d4", // cyan-500
    dark: "#22d3ee", // cyan-400
  },
};

/**
 * Hook to sync user's primary color preference from database and apply to CSS variables.
 * Only applies on initial load to avoid overriding local changes.
 */
export function usePrimaryColorSync() {
  const { user } = useAuth();
  const hasApplied = useRef(false);

  useEffect(() => {
    // Only apply user's color preference once on initial load
    if (user?.primaryColor && !hasApplied.current) {
      applyPrimaryColor(user.primaryColor);
      hasApplied.current = true;
    }
  }, [user?.primaryColor]);
}

/**
 * Apply a primary color to the document by updating CSS variables
 */
export function applyPrimaryColor(colorName: string) {
  const palette = colorPalettes[colorName];
  if (!palette) return;

  const root = document.documentElement;

  // Apply to light mode (root)
  root.style.setProperty("--primary", palette.light);
  root.style.setProperty("--ring", palette.light);

  // For dark mode, we need to apply conditionally
  // We'll use a MutationObserver or check current theme
  const updateDarkMode = () => {
    if (root.classList.contains("dark")) {
      root.style.setProperty("--primary", palette.dark);
      root.style.setProperty("--ring", palette.dark);
    } else {
      root.style.setProperty("--primary", palette.light);
      root.style.setProperty("--ring", palette.light);
    }
  };

  // Initial check
  updateDarkMode();

  // Create observer for theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        updateDarkMode();
      }
    });
  });

  observer.observe(root, { attributes: true, attributeFilter: ["class"] });

  // Store current color in localStorage for faster initial load
  localStorage.setItem("primaryColor", colorName);

  // Cleanup function not needed here as this is a one-time apply
  // The observer will naturally be garbage collected when component unmounts
}

/**
 * Get the current primary color from localStorage or default
 */
export function getStoredPrimaryColor(): string {
  if (typeof window === "undefined") return "blue";
  return localStorage.getItem("primaryColor") || "blue";
}

/**
 * Component that syncs user's primary color preference on mount.
 * Include this in the dashboard layout.
 */
export function PrimaryColorSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  usePrimaryColorSync();

  // Also apply from localStorage on initial mount (before user loads)
  useEffect(() => {
    const storedColor = getStoredPrimaryColor();
    if (storedColor) {
      applyPrimaryColor(storedColor);
    }
  }, []);

  return <>{children}</>;
}

export { colorPalettes };
