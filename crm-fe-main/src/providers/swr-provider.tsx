"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";
import { toast } from "sonner";

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false, // Huge CPU saver
        revalidateOnReconnect: false, // User requested no auto-polling
        dedupingInterval: 3000, // Reduce duplicate in-flight fetches across views
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        refreshInterval: 0, // Disable polling by default
        shouldRetryOnError: false,
        onError: (error) => {
          if (error.status !== 403 && error.status !== 404) {
            // Only show toast for unexpected errors to avoid spamming
            console.error("SWR Error:", error);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
