import { DateRange } from "react-day-picker";
import type { LeaderboardRow, UserWiseRow } from "@/hooks/sales/useSalesAnalytics";
import { LeaderboardCard } from "./LeaderboardCard";
import { SectionLabel } from "./SectionLabel";
import { UserPerformanceTable } from "./UserPerformanceTable";

interface UserInsightsSectionProps {
  leaderboard: LeaderboardRow[];
  userWiseRows: UserWiseRow[];
  date: DateRange | undefined;
  teamId: string;
  isManagerOrAbove: boolean;
  isAdmin: boolean;
  userTeamId?: string | null;
}

export function UserInsightsSection({
  leaderboard,
  userWiseRows,
  date,
  teamId,
  isManagerOrAbove,
  isAdmin,
  userTeamId,
}: UserInsightsSectionProps) {
  return (
    <div className="space-y-4">
      <section>
        <SectionLabel>User-wise Insights</SectionLabel>
        <div className="grid grid-cols-1 gap-4">
          <LeaderboardCard
            leaderboard={leaderboard}
            date={date}
            teamId={teamId}
            isManagerOrAbove={isManagerOrAbove}
            isAdmin={isAdmin}
            userTeamId={userTeamId}
          />
          <UserPerformanceTable userWiseRows={userWiseRows} />
        </div>
      </section>
    </div>
  );
}
