"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, CheckCircle2 } from "lucide-react";

interface Performer {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  leadsWon: number;
  tasksCompleted: number;
  score: number;
}

interface TopPerformersProps {
  performers: Performer[];
}

const rankIcons = [
  { icon: Trophy, color: "text-yellow-500" },
  { icon: Medal, color: "text-gray-400" },
  { icon: Award, color: "text-amber-600" },
];

export function TopPerformers({ performers }: TopPerformersProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (performers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No performance data this month yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Top Performers
        </CardTitle>
        <p className="text-xs text-muted-foreground">This month's leaders</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {performers.map((performer, index) => {
          const RankIcon = rankIcons[index]?.icon || null;
          const rankColor = rankIcons[index]?.color || "text-muted-foreground";

          return (
            <div
              key={performer.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {RankIcon ? (
                  <RankIcon className={`w-5 h-5 ${rankColor}`} />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-9 w-9">
                <AvatarImage src={performer.avatar || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(performer.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name & Role */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{performer.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {performer.role}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{performer.leadsWon}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{performer.tasksCompleted}</span>
                </div>
              </div>

              {/* Score Badge */}
              <Badge
                variant="secondary"
                className="min-w-[50px] justify-center"
              >
                {performer.score} pts
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
