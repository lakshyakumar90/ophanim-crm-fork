import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  variant?: "default" | "canvas";
};

export function PageShell({
  children,
  className,
  fullWidth = false,
  variant = "default",
}: PageShellProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        !fullWidth && "mx-auto w-full max-w-7xl",
        variant === "canvas" && "rounded-xl bg-page-canvas p-3 lg:p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
