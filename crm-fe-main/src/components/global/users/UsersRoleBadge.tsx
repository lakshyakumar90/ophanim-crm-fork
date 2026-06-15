import { Badge } from "@/components/ui/badge";

type UserRoleBadgeProps = {
  role: string;
  departmentName?: string | null;
};

export function UsersRoleBadge({ role, departmentName }: UserRoleBadgeProps) {
  const deptName = departmentName;

  if (role === "admin") {
    return <Badge variant="destructive">Admin</Badge>;
  }

  const roleLabel = role === "manager" ? "Manager" : "Employee";
  const displayLabel = deptName ? `${deptName} ${roleLabel}` : roleLabel;

  if (role === "manager") {
    return (
      <Badge variant="default" className="bg-blue-500">
        {displayLabel}
      </Badge>
    );
  }

  return <Badge variant="secondary">{displayLabel}</Badge>;
}
