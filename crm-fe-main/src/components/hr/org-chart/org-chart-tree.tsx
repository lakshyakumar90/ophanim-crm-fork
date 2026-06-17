"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OrgChartNodeData = {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  job_title?: string | null;
  designation?: string | null;
  avatar_url?: string | null;
  department_name?: string | null;
  team_name?: string | null;
  children?: OrgChartNodeData[];
  reports?: OrgChartNodeData[];
};

const DEPT_COLORS = [
  "border-blue-300 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/30",
  "border-violet-300 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/30",
  "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30",
  "border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30",
  "border-rose-300 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/30",
  "border-cyan-300 bg-cyan-50/80 dark:border-cyan-800 dark:bg-cyan-950/30",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function PersonCard({ node }: { node: OrgChartNodeData }) {
  const name = node.full_name ?? node.name ?? "Unknown";
  const title = node.designation || node.job_title || "—";

  return (
    <div className="flex w-[168px] flex-col items-center rounded-xl border bg-card px-3 py-2.5 text-center shadow-sm transition-shadow hover:shadow-md">
      <Avatar className="h-9 w-9">
        <AvatarImage src={node.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <p className="mt-2 text-sm font-medium leading-tight line-clamp-2">{name}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{title}</p>
      {node.team_name ? (
        <p className="mt-1 text-[10px] text-muted-foreground/80">{node.team_name}</p>
      ) : null}
    </div>
  );
}

function TreeNode({ node }: { node: OrgChartNodeData }) {
  const children = node.children ?? node.reports ?? [];
  const hasChildren = children.length > 0;

  return (
    <div className="inline-flex flex-col items-center">
      <PersonCard node={node} />
      {hasChildren ? (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="relative flex items-start justify-center gap-6 pt-0">
            {children.length > 1 ? (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "50%",
                  width: `calc(100% - 84px)`,
                  transform: "translateX(-50%)",
                }}
              />
            ) : null}
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-5 w-px bg-border" />
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function collectDepartments(roots: OrgChartNodeData[]) {
  const map = new Map<string, OrgChartNodeData[]>();

  const walk = (node: OrgChartNodeData) => {
    const dept = node.department_name || "General";
    if (!map.has(dept)) map.set(dept, []);
    const children = node.children ?? node.reports ?? [];
    if (children.length === 0) {
      map.get(dept)!.push(node);
    }
    children.forEach(walk);
  };

  roots.forEach(walk);

  if (map.size === 0 && roots.length > 0) {
    map.set("Organization", roots);
  }

  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function OrgChartTree({ roots }: { roots: OrgChartNodeData[] }) {
  const departments = collectDepartments(roots);

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max justify-center px-4">
          {roots.map((root) => (
            <TreeNode key={root.id} node={root} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {departments.map(([dept, members], index) => (
          <div
            key={dept}
            className={cn(
              "rounded-xl border-2 p-4",
              DEPT_COLORS[index % DEPT_COLORS.length],
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{dept}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {members.length} people
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {members.slice(0, 24).map((person) => (
                <PersonCard key={person.id} node={person} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
