"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Briefcase, Calendar, User, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { JobPosting } from "@/types/recruitment";
import { isDeadlineExpired } from "@/lib/recruitment-format";
import { cn } from "@/lib/utils";

function statusBadge(status: JobPosting["status"]) {
  switch (status) {
    case "open":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Open</Badge>
      );
    case "paused":
      return (
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-900 hover:bg-amber-200"
        >
          Paused
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="destructive" className="bg-red-600 hover:bg-red-600">
          Closed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function JobPostingCard({ posting }: { posting: JobPosting }) {
  const router = useRouter();
  const expired = isDeadlineExpired(posting.application_deadline);
  const postedBy =
    posting.posted_by_user?.full_name ||
    (posting.posted_by ? "Team member" : "—");

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="font-semibold leading-tight line-clamp-2">
              {posting.title}
            </h3>
          </div>
          {statusBadge(posting.status)}
        </div>
        <p className="text-sm text-muted-foreground">
          {posting.department || "No department"}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-normal">
            {posting.positions_open} position
            {posting.positions_open === 1 ? "" : "s"} open
          </Badge>
          {posting.application_deadline && (
            <Badge
              variant="outline"
              className={cn(
                "font-normal gap-1",
                expired && "border-red-300 bg-red-50 text-red-800",
              )}
            >
              <Calendar className="h-3 w-3" />
              {expired ? "Expired" : "Deadline"}{" "}
              {format(new Date(posting.application_deadline), "MMM d, yyyy")}
            </Badge>
          )}
        </div>
        {posting.required_skills && posting.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.required_skills.slice(0, 6).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs font-normal">
                {s}
              </Badge>
            ))}
            {posting.required_skills.length > 6 && (
              <span className="text-xs text-muted-foreground self-center">
                +{posting.required_skills.length - 6} more
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <User className="h-3.5 w-3.5" />
          <span>Posted by {postedBy}</span>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 pt-3">
        <Button
          className="w-full gap-2"
          variant="default"
          onClick={() => router.push(`/hr/recruitment/${posting.id}`)}
        >
          View pipeline
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
