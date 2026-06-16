"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

export type ProjectMemberDetail = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  primaryRole: string;
  projectRoles: { projectId: string; projectName: string; role: string }[];
};

function getRoleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectMemberDetailSheet({
  member,
  open,
  onOpenChange,
}: {
  member: ProjectMemberDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={member?.fullName || "Team member"}
      description="Project assignments and contact details"
      size="lg"
    >
      {member ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate">{member.fullName}</p>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              <Badge variant="outline" className="mt-2">
                {getRoleLabel(member.primaryRole)}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Project assignments</h3>
            {member.projectRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project assignments.</p>
            ) : (
              <div className="space-y-2">
                {member.projectRoles.map((pr) => (
                  <div
                    key={`${pr.projectId}-${pr.role}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium truncate">{pr.projectName}</span>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {getRoleLabel(pr.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </FormSideSheet>
  );
}
