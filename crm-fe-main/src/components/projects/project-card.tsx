"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, Users2, Link2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  showLeadLink?: boolean;
}

export function ProjectCard({ project, showLeadLink = false }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "in_progress":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "on_hold":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "completed":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10";
      case "medium":
        return "text-yellow-600 border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10";
      case "low":
        return "text-blue-500 border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10";
      default:
        return "";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow group flex flex-col h-full overflow-hidden border-border/50">
      <div
        className={cn(
          "h-1 w-full",
          project.status === "in_progress"
            ? "bg-green-500"
            : project.priority === "high"
              ? "bg-red-500"
              : "bg-primary/20",
        )}
      />
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1.5">
            <Badge
              variant="outline"
              className={cn(
                "capitalize font-normal",
                getStatusColor(project.status),
              )}
            >
              {project.status.replace("_", " ")}
            </Badge>
            <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors text-lg">
              {project.name}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "capitalize text-xs font-normal ml-auto",
              getPriorityColor(project.priority),
            )}
          >
            {project.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 pb-2">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
            {project.description}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {project.startDate
                ? format(new Date(project.startDate), "MMM d")
                : "TBD"}
              {" - "}
              {project.endDate
                ? format(new Date(project.endDate), "MMM d, yyyy")
                : "TBD"}
            </span>
          </div>

          {project.clientName && (
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <User className="w-3.5 h-3.5" />
              <span>{project.clientName}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Users2 className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground font-medium">
              {project.members?.length || 1} team
            </span>
          </div>
          {showLeadLink && project.leadId && (
            <Badge
              variant="outline"
              className="gap-1 text-[10px] text-green-700 border-green-200 bg-green-50"
            >
              <Link2 className="h-3 w-3" />
              Won Lead
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 hover:bg-background hover:text-primary -mr-2"
        >
          <Link href={`/projects/${project.id}`}>
            View Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
