"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HrAnalyticsHeaderProps {
  loading: boolean;
  year: string;
  month: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onRefresh: () => void;
}

export function HrAnalyticsHeader({
  loading,
  year,
  month,
  onYearChange,
  onMonthChange,
  onRefresh,
}: HrAnalyticsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Analytics</h1>
        <p className="text-muted-foreground">
          People analytics and workforce insights.
        </p>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
      <div className="flex items-center gap-2">
        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger className="w-30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3].map((n) => {
              const y = String(new Date().getFullYear() - n);
              return (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="w-30">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {Array.from({ length: 12 }).map((_, idx) => (
              <SelectItem key={idx + 1} value={String(idx + 1)}>
                {idx + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
