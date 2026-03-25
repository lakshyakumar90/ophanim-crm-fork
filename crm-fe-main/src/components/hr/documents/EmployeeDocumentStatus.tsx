"use client";

import { useMemo, useState } from "react";
import { Check, X, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import type { HrDocumentTypeDto } from "@/types/hr-documents";
import type { HrEmployeeDirectoryRow } from "@/types/hr-leaves";
import { DEFAULT_REQUIRED_DOCUMENT_SLUGS, slugToLabel } from "./document-utils";
import { cn } from "@/lib/utils";

function empName(e: HrEmployeeDirectoryRow) {
  return e.fullName ?? e.full_name ?? "";
}

function empDept(e: HrEmployeeDirectoryRow) {
  return e.departmentName ?? e.department_name ?? "";
}

type CellState = "ok" | "pending" | "missing";

function cellStateForSlug(
  docs: EmployeeDocumentDto[],
  slug: string,
): CellState {
  const relevant = docs.filter((d) => d.documentType === slug);
  if (relevant.length === 0) return "missing";
  if (relevant.some((d) => d.isVerified)) return "ok";
  return "pending";
}

function CellIcon({ state }: { state: CellState }) {
  if (state === "ok")
    return <Check className="h-4 w-4 text-emerald-600 mx-auto" aria-label="Verified" />;
  if (state === "pending")
    return <Clock className="h-4 w-4 text-amber-600 mx-auto" aria-label="Pending verification" />;
  return <X className="h-4 w-4 text-red-600 mx-auto" aria-label="Missing" />;
}

export function EmployeeDocumentStatus({
  documents,
  employees,
  types,
  loading,
  canManage,
}: {
  documents: EmployeeDocumentDto[];
  employees: HrEmployeeDirectoryRow[];
  types: HrDocumentTypeDto[];
  loading: boolean;
  canManage: boolean;
}) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [dept, setDept] = useState("all");
  const [search, setSearch] = useState("");

  const slugLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of types) m.set(t.slug, t.label);
    return m;
  }, [types]);

  const requiredSlugs = useMemo(() => {
    return DEFAULT_REQUIRED_DOCUMENT_SLUGS.filter((s) =>
      types.some((t) => t.slug === s && t.isActive),
    ) as unknown as string[];
  }, [types]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(employees.map(empDept).filter(Boolean) as string[]),
    ).sort();
  }, [employees]);

  const docsByUser = useMemo(() => {
    const m = new Map<string, EmployeeDocumentDto[]>();
    for (const d of documents) {
      if (!m.has(d.userId)) m.set(d.userId, []);
      m.get(d.userId)!.push(d);
    }
    return m;
  }, [documents]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => {
        if (dept !== "all" && empDept(e) !== dept) return false;
        const nm = empName(e).toLowerCase();
        const em = (e.email || "").toLowerCase();
        if (q && !nm.includes(q) && !em.includes(q)) return false;
        const list = docsByUser.get(e.id) || [];
        const completeness =
          requiredSlugs.length === 0
            ? 100
            : Math.round(
                (requiredSlugs.filter((s) => cellStateForSlug(list, s) === "ok").length /
                  requiredSlugs.length) *
                  100,
              );
        if (onlyMissing && completeness === 100) return false;
        return true;
      })
      .map((e) => {
        const list = docsByUser.get(e.id) || [];
        const completeness =
          requiredSlugs.length === 0
            ? 100
            : Math.round(
                (requiredSlugs.filter((s) => cellStateForSlug(list, s) === "ok").length /
                  requiredSlugs.length) *
                  100,
              );
        return { employee: e, list, completeness };
      })
      .sort((a, b) => empName(a.employee).localeCompare(empName(b.employee)));
  }, [employees, docsByUser, dept, search, onlyMissing, requiredSlugs]);

  if (loading && employees.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (requiredSlugs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No active document types match the configured required slugs (
        {DEFAULT_REQUIRED_DOCUMENT_SLUGS.join(", ")}). Add or activate types in the Types tab.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input placeholder="Employee name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-2 w-full sm:w-48">
          <Label className="text-xs text-muted-foreground">Department</Label>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="only-miss" checked={onlyMissing} onCheckedChange={setOnlyMissing} />
          <Label htmlFor="only-miss" className="text-sm cursor-pointer">
            Only with gaps
          </Label>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Employee</TableHead>
              <TableHead className="min-w-[120px]">Department</TableHead>
              {requiredSlugs.map((slug) => (
                <TableHead key={slug} className="text-center min-w-[100px]">
                  {slugLabels.get(slug) || slugToLabel(slug)}
                </TableHead>
              ))}
              <TableHead className="min-w-[140px]">Completeness</TableHead>
              {canManage ? <TableHead className="w-[120px]">Reminder</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={requiredSlugs.length + 3 + (canManage ? 1 : 0)}
                  className="p-12 text-center text-muted-foreground"
                >
                  {employees.length === 0
                    ? "No employees loaded (check HR directory permissions)."
                    : onlyMissing
                      ? "No employees with missing required documents match the filters."
                      : "No employees match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ employee: e, list, completeness }) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{empName(e) || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{empDept(e) || "—"}</TableCell>
                  {requiredSlugs.map((slug) => (
                    <TableCell key={slug} className="text-center">
                      <CellIcon state={cellStateForSlug(list, slug)} />
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[72px]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            completeness >= 80
                              ? "bg-emerald-600"
                              : completeness >= 50
                                ? "bg-amber-500"
                                : "bg-red-600",
                          )}
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-9">{completeness}%</span>
                    </div>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled
                        title="TODO: wire POST to notifications when HR reminder API exists"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Remind
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
