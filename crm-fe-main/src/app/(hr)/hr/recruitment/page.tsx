"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useJobPostingsList, useRecruitmentMetricsWidget } from "@/hooks/useRecruitment";
import { JobPostingCard } from "@/components/recruitment/JobPostingCard";
import { CreateJobPostingPanel } from "@/components/recruitment/CreateJobPostingPanel";
import { RecruitmentMetrics } from "@/components/recruitment/RecruitmentMetrics";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";

export default function RecruitmentPage() {
  const router = useRouter();
  const canManage = usePermission("recruitment:manage");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { postings, loading, error, refresh } = useJobPostingsList({
    status: statusFilter,
    department: departmentFilter,
    search,
  });

  const { metrics, loading: metricsLoading } = useRecruitmentMetricsWidget(true);

  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/departments");
        const rows = res.data?.data || [];
        setDeptOptions(
          (Array.isArray(rows) ? rows : [])
            .map((d: { name?: string }) => d.name)
            .filter((n): n is string => Boolean(n)),
        );
      } catch {
        setDeptOptions([]);
      }
    })();
  }, []);

  const departmentSelectOptions = useMemo(() => {
    const fromPostings = new Set(
      postings.map((p) => p.department).filter(Boolean) as string[],
    );
    deptOptions.forEach((d) => fromPostings.add(d));
    return [...fromPostings].sort();
  }, [postings, deptOptions]);

  const stats = useMemo(() => {
    const total = postings.length;
    const open = postings.filter((p) => p.status === "open").length;
    const paused = postings.filter((p) => p.status === "paused").length;
    const closed = postings.filter((p) => p.status === "closed").length;
    return {
      total,
      open,
      paused,
      closed,
      candidates: metrics?.totalCandidates ?? "—",
    };
  }, [postings, metrics]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruitment</h1>
          <p className="text-muted-foreground mt-1">
            Job postings, pipelines, and hiring metrics.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            New job posting
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : (
          <>
            <StatCard label="Total postings" value={stats.total} />
            <StatCard label="Open" value={stats.open} highlight="text-emerald-600" />
            <StatCard label="Paused" value={stats.paused} highlight="text-amber-600" />
            <StatCard label="Closed" value={stats.closed} highlight="text-red-600" />
            <StatCard label="Total candidates" value={stats.candidates} />
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentSelectOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="postings" className="w-full">
        <TabsList>
          <TabsTrigger value="postings">Postings</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="postings" className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : postings.length === 0 ? (
            <div className="rounded-lg border bg-card p-8">
              <EmptyState
                icon={<Briefcase className="h-10 w-10 opacity-20" />}
                title="No job postings"
                description={
                  canManage
                    ? "Create a posting to start hiring."
                    : "No postings match your filters or you may lack access."
                }
                actionLabel={canManage ? "New job posting" : undefined}
                onAction={canManage ? () => router.push("/hr/recruitment/new") : undefined}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {postings.map((p) => (
                <JobPostingCard key={p.id} posting={p} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="metrics" className="mt-4">
          <RecruitmentMetrics metrics={metrics} loading={metricsLoading} />
        </TabsContent>
      </Tabs>

      <CreateJobPostingPanel
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refresh}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className={`text-2xl font-bold tabular-nums ${highlight || ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
