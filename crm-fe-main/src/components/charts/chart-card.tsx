"use client";

import type { ReactNode } from "react";
import { DataCard } from "@/components/shared/data-card";
import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
};

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  height = 220,
}: ChartCardProps) {
  return (
    <DataCard
      title={title}
      description={description}
      action={action}
      className={className}
      contentClassName="px-0 pb-3"
    >
      <div className={cn("w-full min-w-0 px-(--card-spacing)")} style={{ height }}>
        {children}
      </div>
    </DataCard>
  );
}
