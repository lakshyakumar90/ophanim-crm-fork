"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { MAX_ACTIVITY_DISPLAY_COUNT } from "@/lib/sales/sales-dashboard-constants";

interface LeaderboardProps {
  leaderboard: any[];
}

export function Leaderboard({ leaderboard }: LeaderboardProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Sales Leaderboard
        </CardTitle>
        <CardDescription>Top performers by activities & leads</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto pr-1">
        {leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((rep: any, i) => (
              <div key={rep.id || i} className="flex items-center gap-3 py-1">
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0",
                    i === 0
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                      : i === 1
                        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        : i === 2
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100"
                          : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rep.fullName || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rep.teamName || rep.role || ""}
                  </p>
                </div>
                <div className="text-right text-xs flex-shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-primary">
                      {rep.activityCountCapped
                        ? `${MAX_ACTIVITY_DISPLAY_COUNT}+ activities`
                        : `${rep.activityCount || 0} activities`}
                    </p>
                    <p className="text-muted-foreground">
                      {rep.leadCount || 0} leads
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
