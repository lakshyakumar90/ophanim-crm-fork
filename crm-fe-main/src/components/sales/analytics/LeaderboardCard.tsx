import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/hooks/sales/useSalesAnalytics";
import { EmptyState } from "./EmptyState";

interface LeaderboardCardProps {
  leaderboard: LeaderboardRow[];
  date: DateRange | undefined;
  teamId: string;
  isManagerOrAbove: boolean;
  isAdmin: boolean;
  userTeamId?: string | null;
}

export function LeaderboardCard({
  leaderboard,
  date,
  teamId,
  isManagerOrAbove,
  isAdmin,
  userTeamId,
}: LeaderboardCardProps) {
  const router = useRouter();

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Leaderboard
        </CardTitle>
        <CardDescription className="text-xs">
          Ranked by conversions, then leads worked
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaderboard.length === 0 && (
          <EmptyState message="No leaderboard data for selected filters" />
        )}
        {leaderboard.slice(0, 5).map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => {
              if (!isManagerOrAbove || !row.id) return;
              const params = new URLSearchParams();
              params.set("scope", "member");
              if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
              if (date?.to || date?.from)
                params.set("to", format((date?.to || date?.from)!, "yyyy-MM-dd"));
              params.set("preset", "custom");
              if (!isAdmin && userTeamId) params.set("teamId", userTeamId);
              else if (teamId !== "all") params.set("teamId", teamId);
              params.set("userId", row.id);
              router.push(`/activity?${params.toString()}`);
            }}
            className={cn(
              "w-full cursor-pointer text-left flex items-center justify-between rounded-lg border p-2 transition-colors",
              row.rank === 1 && "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70",
              row.rank === 2 && "bg-slate-100/70 border-slate-300 hover:bg-slate-200/70",
              row.rank === 3 && "bg-orange-50/70 border-orange-200 hover:bg-orange-100/70",
              row.rank > 3 && "hover:bg-muted/40",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                #{row.rank} {row.fullName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {row.teamName || "No team"} · {row.conversions} conversions
              </p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {row.winRate.toFixed(1)}%
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
