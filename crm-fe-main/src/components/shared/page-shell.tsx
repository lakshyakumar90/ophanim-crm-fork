import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function PageShell({
  children,
  className,
  fullWidth = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "space-y-6",
        !fullWidth && "mx-auto w-full max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
