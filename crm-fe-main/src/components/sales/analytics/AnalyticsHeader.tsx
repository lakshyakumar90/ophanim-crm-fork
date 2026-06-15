import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface AnalyticsHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function AnalyticsHeader({ isRefreshing, onRefresh }: AnalyticsHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Role-scoped performance insights across overview and individual contributions.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
