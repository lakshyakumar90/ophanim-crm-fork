"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import type { HREmployee } from "@/types/hr.types";
import { fetchHrEmployeeById } from "@/lib/hr-employee-api";
import {
  canEditEmployees,
  canFetchCompensationHistory,
  canSeeFullCTC,
  normalizeHrStatus,
  shiftLabel,
  statusBadgeClass,
} from "@/lib/employeeHelpers";
import type { ShiftType } from "@/types/hr.types";
import { useAuth } from "@/providers/auth-provider";
import { EmployeeOverviewTab } from "./EmployeeOverviewTab";
import { EmployeeCompensationTab } from "./EmployeeCompensationTab";
import { EmployeeLeaveSummaryTab } from "./EmployeeLeaveSummaryTab";
import { EmployeeDocumentsTab } from "./EmployeeDocumentsTab";
import { EmployeePerformanceTab } from "./EmployeePerformanceTab";
import { EmployeeActivityTab } from "./EmployeeActivityTab";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EmployeeDetailDrawer({
  employee,
  open,
  onOpenChange,
  onUpdated,
  allEmployees = [],
  initialEditMode = false,
}: {
  employee: HREmployee | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: () => void;
  allEmployees?: HREmployee[];
  initialEditMode?: boolean;
}) {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const canEdit = canEditEmployees(perms);
  const canSeeCTC = canSeeFullCTC(perms);
  const canComp = canFetchCompensationHistory(perms);

  const [stack, setStack] = useState<HREmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const openedForId = useRef<string | null>(null);

  const top = stack[stack.length - 1] ?? null;

  useEffect(() => {
    if (!open) {
      setStack([]);
      setTab("overview");
      setEditMode(false);
      openedForId.current = null;
      return;
    }
    if (!employee) return;
    if (openedForId.current !== employee.id) {
      openedForId.current = employee.id;
      setStack([employee]);
      setEditMode(initialEditMode);
    }
  }, [open, employee, initialEditMode]);

  useEffect(() => {
    if (!open || !top?.id) return;
    let cancelled = false;
    setLoading(true);
    void fetchHrEmployeeById(top.id)
      .then((fresh) => {
        if (cancelled) return;
        setStack((s) => {
          if (s.length === 0) return s;
          const next = [...s];
          next[next.length - 1] = fresh;
          return next;
        });
      })
      .catch(() => {
        /* keep list copy */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, top?.id]);

  const openManager = useCallback(
    (managerId: string) => {
      const m = allEmployees.find((e) => e.id === managerId);
      if (m) setStack((s) => [...s, m]);
      else toast.message("Manager not found in current directory list.");
    },
    [allEmployees],
  );

  const popStack = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const refreshTop = useCallback(async () => {
    if (!top?.id) return;
    try {
      const fresh = await fetchHrEmployeeById(top.id);
      setStack((s) => {
        const n = [...s];
        n[n.length - 1] = fresh;
        return n;
      });
      onUpdated?.();
    } catch {
      /* ignore */
    }
  }, [top?.id, onUpdated]);

  if (!employee) return null;

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={loading && !top ? "…" : top?.fullName ?? "Employee"}
      description={
        top
          ? `${top.jobTitle?.replace(/_/g, " ") || "—"} · ${top.departmentName || "No department"}`
          : undefined
      }
      size="2xl"
      className={cn(
        "sm:w-[min(100%,37.5rem)]",
        "[&>div:nth-child(2)]:flex [&>div:nth-child(2)]:flex-col [&>div:nth-child(2)]:overflow-hidden [&>div:nth-child(2)]:p-0",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {stack.length > 1 ? (
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={popStack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={top?.avatarUrl || undefined} />
              <AvatarFallback>{top ? initials(top.fullName) : ""}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              {top ? (
                <Badge className={statusBadgeClass(normalizeHrStatus(top))}>
                  {normalizeHrStatus(top).replace(/_/g, " ")}
                </Badge>
              ) : null}
              {top?.role === "admin" ? (
                <Badge variant="destructive">Admin</Badge>
              ) : top?.role === "manager" ? (
                <Badge className="bg-blue-600">Manager</Badge>
              ) : top?.role === "hr" ? (
                <Badge className="bg-violet-600">HR</Badge>
              ) : (
                <Badge variant="secondary">Employee</Badge>
              )}
              {top?.shiftType ? (
                <Badge variant="outline">{shiftLabel(top.shiftType as ShiftType)}</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            {canEdit && top ? (
              <Button
                type="button"
                size="sm"
                variant={editMode ? "secondary" : "outline"}
                onClick={() => setEditMode((e) => !e)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {editMode ? "View" : "Edit"}
              </Button>
            ) : null}
          </div>
        </div>

        {loading && !top ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : top ? (
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start rounded-none border-b bg-muted/30 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="compensation" className="text-xs sm:text-sm">
                Compensation
              </TabsTrigger>
              <TabsTrigger value="leave" className="text-xs sm:text-sm">
                Leave
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                Documents
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm">
                Performance
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm">
                Activity
              </TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <TabsContent value="overview" className="mt-0 h-full">
                <EmployeeOverviewTab
                  employee={top}
                  editMode={editMode && canEdit}
                  onSaved={refreshTop}
                  onOpenManager={openManager}
                />
              </TabsContent>
              <TabsContent value="compensation" className="mt-0">
                <EmployeeCompensationTab
                  employeeId={top.id}
                  canFetch={canComp}
                  canSeeCTC={canSeeCTC}
                  canEdit={canEdit}
                  active={tab === "compensation"}
                />
              </TabsContent>
              <TabsContent value="leave" className="mt-0">
                <EmployeeLeaveSummaryTab
                  userId={top.id}
                  employeeName={top.fullName}
                  active={tab === "leave"}
                />
              </TabsContent>
              <TabsContent value="documents" className="mt-0">
                <EmployeeDocumentsTab
                  userId={top.id}
                  userName={top.fullName}
                  active={tab === "documents"}
                />
              </TabsContent>
              <TabsContent value="performance" className="mt-0">
                <EmployeePerformanceTab employeeId={top.id} active={tab === "performance"} />
              </TabsContent>
              <TabsContent value="activity" className="mt-0">
                <EmployeeActivityTab
                  employeeId={top.id}
                  canFetchComp={canComp}
                  canSeeCTC={canSeeCTC}
                  active={tab === "activity"}
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : null}
      </div>
    </FormSideSheet>
  );
}
