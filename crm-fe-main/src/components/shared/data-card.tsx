import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DataCardProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DataCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: DataCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "rounded-xl ring-1 ring-border elevation-raised transition-interactive",
        className,
      )}
    >
      <CardHeader className="border-b border-border/60">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("pt-3", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
