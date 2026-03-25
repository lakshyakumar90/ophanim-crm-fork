"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import type { HREmployee } from "@/types/hr.types";

const DEFAULT_SHIFT_OPTIONS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "day_shift", label: "Day Shift" },
  { value: "night_shift", label: "Night Shift" },
] as const;

const DEFAULT_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
  { value: "hr", label: "HR" },
] as const;

type EmployeeBulkDraft = {
  email: string;
  fullName: string;
  phone: string;
  role: string;
  departmentId: string;
  teamId: string;
  managerId: string;
  jobTitle: string;
  shiftType: string;
  currentCtc: string;
  basicPct: string;
  hraPct: string;
  allowancePct: string;
  isActive: boolean;
};

type EditableField = keyof EmployeeBulkDraft;

export type EmployeeBulkUpdate = {
  id: string;
  data: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    role?: "admin" | "manager" | "employee" | "hr";
    departmentId?: string | null;
    teamId?: string | null;
    managerId?: string | null;
    jobTitle?: string | null;
    shiftType?: string | null;
    currentCtc?: number | null;
    salaryComponents?: {
      basic_pct?: number;
      hra_pct?: number;
      allowance_pct?: number;
    };
    isActive?: boolean;
  };
};

type BulkRow = Pick<
  HREmployee,
  | "id"
  | "email"
  | "fullName"
  | "phone"
  | "role"
  | "departmentId"
  | "teamId"
  | "managerId"
  | "jobTitle"
  | "shiftType"
  | "currentCtc"
  | "salaryComponents"
  | "isActive"
>;

type FillDragState = {
  field: EditableField;
  sourceRow: number;
  targetRow: number;
};

const numericFields: EditableField[] = ["currentCtc", "basicPct", "hraPct", "allowancePct"];

const FILL_FIELD_LABELS: Record<EditableField, string> = {
  email: "Email",
  fullName: "Name",
  phone: "Phone",
  role: "Role",
  departmentId: "Department",
  teamId: "Team",
  managerId: "Manager",
  jobTitle: "Designation",
  shiftType: "Shift",
  currentCtc: "CTC",
  basicPct: "Basic %",
  hraPct: "HRA %",
  allowancePct: "Allowance %",
  isActive: "Active",
};

function normalizeNumberText(input: string) {
  const stripped = input.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [head, ...tail] = stripped.split(".");
  if (tail.length === 0) return head;
  return `${head}.${tail.join("")}`;
}

function formatWithCommas(value: string) {
  if (!value) return "";
  const normalized = normalizeNumberText(value);
  if (!normalized) return "";

  const [integerPart, decimalPart] = normalized.split(".");
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimalPart === undefined) return formattedInt;
  return `${formattedInt}.${decimalPart}`;
}

export function BulkEditTable({
  employees,
  departmentOptions,
  teamOptions,
  managerOptions,
  saving,
  onSave,
  roleOptions = DEFAULT_ROLE_OPTIONS,
  shiftOptions = DEFAULT_SHIFT_OPTIONS,
  jobTitleOptions,
  title = "Bulk Edit Employees",
  description = "Google Sheets-style tabular editing for selected rows.",
  onExit,
  onClearSelection,
}: {
  employees: BulkRow[];
  departmentOptions: Array<{ id: string; name: string }>;
  teamOptions: Array<{ id: string; name: string; departmentId?: string | null }>;
  managerOptions: Array<{ id: string; fullName: string }>;
  saving: boolean;
  onSave: (updates: EmployeeBulkUpdate[]) => Promise<void>;
  roleOptions?: ReadonlyArray<{ value: string; label: string }>;
  shiftOptions?: ReadonlyArray<{ value: string; label: string }>;
  jobTitleOptions?: Array<{ value: string; label: string }>;
  title?: string;
  description?: string;
  onExit?: () => void;
  onClearSelection?: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, EmployeeBulkDraft>>({});
  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);
  const numericCellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const next: Record<string, EmployeeBulkDraft> = {};
    for (const emp of employees) {
      next[emp.id] = {
        email: emp.email || "",
        fullName: emp.fullName || "",
        phone: emp.phone || "",
        role: emp.role || "employee",
        departmentId: emp.departmentId || "none",
        teamId: emp.teamId || "none",
        managerId: emp.managerId || "none",
        jobTitle: emp.jobTitle || "",
        shiftType: emp.shiftType || "unassigned",
        currentCtc:
          emp.currentCtc === null || emp.currentCtc === undefined
            ? ""
            : String(emp.currentCtc),
        basicPct:
          emp.salaryComponents?.basic_pct === null || emp.salaryComponents?.basic_pct === undefined
            ? ""
            : String(emp.salaryComponents.basic_pct),
        hraPct:
          emp.salaryComponents?.hra_pct === null || emp.salaryComponents?.hra_pct === undefined
            ? ""
            : String(emp.salaryComponents.hra_pct),
        allowancePct:
          emp.salaryComponents?.allowance_pct === null || emp.salaryComponents?.allowance_pct === undefined
            ? ""
            : String(emp.salaryComponents.allowance_pct),
        isActive: !!emp.isActive,
      };
    }
    setDrafts(next);
  }, [employees]);

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const emp of employees) {
      const d = drafts[emp.id];
      if (!d) continue;
      if (
        d.email !== (emp.email || "") ||
        d.fullName !== (emp.fullName || "") ||
        d.phone !== (emp.phone || "") ||
        d.role !== (emp.role || "employee") ||
        d.departmentId !== (emp.departmentId || "none") ||
        d.teamId !== (emp.teamId || "none") ||
        d.managerId !== (emp.managerId || "none") ||
        d.jobTitle !== (emp.jobTitle || "") ||
        d.shiftType !== (emp.shiftType || "unassigned") ||
        d.currentCtc !==
          (emp.currentCtc === null || emp.currentCtc === undefined ? "" : String(emp.currentCtc)) ||
        d.basicPct !==
          (emp.salaryComponents?.basic_pct === null || emp.salaryComponents?.basic_pct === undefined
            ? ""
            : String(emp.salaryComponents.basic_pct)) ||
        d.hraPct !==
          (emp.salaryComponents?.hra_pct === null || emp.salaryComponents?.hra_pct === undefined
            ? ""
            : String(emp.salaryComponents.hra_pct)) ||
        d.allowancePct !==
          (emp.salaryComponents?.allowance_pct === null || emp.salaryComponents?.allowance_pct === undefined
            ? ""
            : String(emp.salaryComponents.allowance_pct)) ||
        d.isActive !== !!emp.isActive
      ) {
        count += 1;
      }
    }
    return count;
  }, [employees, drafts]);

  const setField = <K extends keyof EmployeeBulkDraft>(
    id: string,
    field: K,
    value: EmployeeBulkDraft[K],
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const setNumericCellRef =
    (rowIndex: number, field: EditableField) => (el: HTMLInputElement | null) => {
      numericCellRefs.current[`${rowIndex}:${field}`] = el;
    };

  const focusNumericCell = (rowIndex: number, field: EditableField) => {
    const next = numericCellRefs.current[`${rowIndex}:${field}`];
    if (!next) return;
    next.focus();
    next.select();
  };

  const handleNumericArrowNavigation = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: EditableField,
  ) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();

    const delta = e.key === "ArrowUp" ? -1 : 1;
    const nextRow = Math.max(0, Math.min(employees.length - 1, rowIndex + delta));
    if (nextRow === rowIndex) return;

    requestAnimationFrame(() => focusNumericCell(nextRow, field));
  };

  const applyDepartmentChange = (employeeId: string, departmentId: string) => {
    setField(employeeId, "departmentId", departmentId);

    if (departmentId !== "none") {
      const currentTeamId = drafts[employeeId]?.teamId || "none";
      if (currentTeamId !== "none") {
        const currentTeam = teamOptions.find((team) => team.id === currentTeamId);
        if (currentTeam && (currentTeam.departmentId || "") !== departmentId) {
          setField(employeeId, "teamId", "none");
        }
      }
    }
  };

  const applyFillToRange = (drag: FillDragState) => {
    const source = employees[drag.sourceRow];
    if (!source) return;

    const sourceDraft = drafts[source.id];
    if (!sourceDraft) return;

    const sourceValue = sourceDraft[drag.field];
    if (drag.targetRow <= drag.sourceRow) return;

    setDrafts((prev) => {
      const next = { ...prev };

      for (let rowIndex = drag.sourceRow + 1; rowIndex <= drag.targetRow; rowIndex += 1) {
        const target = employees[rowIndex];
        if (!target) continue;

        const existing = next[target.id];
        if (!existing) continue;

        const updated: EmployeeBulkDraft = {
          ...existing,
          [drag.field]: sourceValue,
        };

        if (drag.field === "departmentId" && typeof sourceValue === "string") {
          const currentTeamId = existing.teamId || "none";
          if (sourceValue !== "none" && currentTeamId !== "none") {
            const currentTeam = teamOptions.find((team) => team.id === currentTeamId);
            if (currentTeam && (currentTeam.departmentId || "") !== sourceValue) {
              updated.teamId = "none";
            }
          }
        }

        next[target.id] = updated;
      }

      return next;
    });
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (!fillDrag) return;
      applyFillToRange(fillDrag);
      setFillDrag(null);
    };

    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [fillDrag, drafts, employees]);

  useEffect(() => {
    if (!fillDrag) return;

    const previousSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMouseMove = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };

    pointerRef.current = null;
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let rafId = 0;
    const tick = () => {
      const pointer = pointerRef.current;

      if (pointer) {
        const container = scrollContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const edgeThreshold = 48;

          if (pointer.x > rect.right - edgeThreshold) {
            container.scrollLeft += 18;
          } else if (pointer.x < rect.left + edgeThreshold) {
            container.scrollLeft -= 18;
          }
        }

        const verticalEdge = 72;
        if (pointer.y > window.innerHeight - verticalEdge) {
          window.scrollBy({ top: 16, left: 0 });
        } else if (pointer.y < verticalEdge) {
          window.scrollBy({ top: -16, left: 0 });
        }

        const hit = document.elementFromPoint(pointer.x, pointer.y) as HTMLElement | null;
        const rowEl = hit?.closest("tr[data-row-index]") as HTMLElement | null;
        if (rowEl) {
          const rowAttr = rowEl.getAttribute("data-row-index");
          const rowIndex = rowAttr ? Number.parseInt(rowAttr, 10) : Number.NaN;
          if (!Number.isNaN(rowIndex)) {
            setFillDrag((prev) => {
              if (!prev) return prev;
              const nextTarget = Math.max(prev.sourceRow, rowIndex);
              if (nextTarget === prev.targetRow) return prev;
              return { ...prev, targetRow: nextTarget };
            });
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("mousemove", onMouseMove);
      window.cancelAnimationFrame(rafId);
      pointerRef.current = null;
    };
  }, [fillDrag]);

  const handleSave = async () => {
    const updates: EmployeeBulkUpdate[] = [];

    for (const emp of employees) {
      const d = drafts[emp.id];
      if (!d) continue;
      const data: EmployeeBulkUpdate["data"] = {};

      if (d.email !== (emp.email || "")) data.email = d.email;
      if (d.fullName !== (emp.fullName || "")) data.fullName = d.fullName;
      if (d.phone !== (emp.phone || "")) data.phone = d.phone || null;
      if (d.role !== (emp.role || "employee")) {
        data.role = d.role as EmployeeBulkUpdate["data"]["role"];
      }
      if (d.departmentId !== (emp.departmentId || "none")) {
        data.departmentId = d.departmentId === "none" ? null : d.departmentId;
      }
      if (d.teamId !== (emp.teamId || "none")) {
        data.teamId = d.teamId === "none" ? null : d.teamId;
      }
      if (d.managerId !== (emp.managerId || "none")) {
        data.managerId = d.managerId === "none" ? null : d.managerId;
      }
      if (d.jobTitle !== (emp.jobTitle || "")) data.jobTitle = d.jobTitle || null;
      if (d.shiftType !== (emp.shiftType || "unassigned")) {
        data.shiftType = d.shiftType === "unassigned" ? null : d.shiftType;
      }
      if (
        d.currentCtc !==
        (emp.currentCtc === null || emp.currentCtc === undefined ? "" : String(emp.currentCtc))
      ) {
        data.currentCtc = d.currentCtc.trim() === "" ? null : Number(normalizeNumberText(d.currentCtc));
      }

      const salaryChanged =
        d.basicPct !==
          (emp.salaryComponents?.basic_pct === null || emp.salaryComponents?.basic_pct === undefined
            ? ""
            : String(emp.salaryComponents.basic_pct)) ||
        d.hraPct !==
          (emp.salaryComponents?.hra_pct === null || emp.salaryComponents?.hra_pct === undefined
            ? ""
            : String(emp.salaryComponents.hra_pct)) ||
        d.allowancePct !==
          (emp.salaryComponents?.allowance_pct === null || emp.salaryComponents?.allowance_pct === undefined
            ? ""
            : String(emp.salaryComponents.allowance_pct));

      if (salaryChanged) {
        data.salaryComponents = {
          basic_pct: d.basicPct.trim() === "" ? undefined : Number(normalizeNumberText(d.basicPct)),
          hra_pct: d.hraPct.trim() === "" ? undefined : Number(normalizeNumberText(d.hraPct)),
          allowance_pct:
            d.allowancePct.trim() === "" ? undefined : Number(normalizeNumberText(d.allowancePct)),
        };
      }

      if (d.isActive !== !!emp.isActive) data.isActive = d.isActive;

      if (Object.keys(data).length > 0) {
        updates.push({ id: emp.id, data });
      }
    }

    if (updates.length === 0) return;
    await onSave(updates);
  };

  const isCellInFillRange = (rowIndex: number, field: EditableField) => {
    if (!fillDrag || fillDrag.field !== field) return false;
    return rowIndex >= fillDrag.sourceRow && rowIndex <= fillDrag.targetRow;
  };

  const startFillDrag = (field: EditableField, rowIndex: number) => {
    setFillDrag({
      field,
      sourceRow: rowIndex,
      targetRow: rowIndex,
    });
  };

  const maybeStartFillDragFromCorner = (
    e: React.MouseEvent<HTMLDivElement>,
    field: EditableField,
    rowIndex: number,
  ) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cornerSize = 12;
    const inCornerX = e.clientX >= rect.right - cornerSize;
    const inCornerY = e.clientY >= rect.bottom - cornerSize;
    if (!inCornerX || !inCornerY) return;

    e.preventDefault();
    e.stopPropagation();
    startFillDrag(field, rowIndex);
  };

  const renderFillHandle = (field: EditableField, rowIndex: number) => (
    <button
      type="button"
      className="absolute bottom-0.5 right-0.5 z-20 h-2.5 w-2.5 cursor-ns-resize rounded-sm border border-primary bg-primary/90 opacity-0 transition-opacity group-hover/fillcell:opacity-100 group-focus-within/fillcell:opacity-100"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        pointerRef.current = { x: e.clientX, y: e.clientY };
        startFillDrag(field, rowIndex);
      }}
      aria-label="Drag to fill below"
      title="Drag to fill cells below"
    />
  );

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {onExit ? (
            <Button variant="secondary" size="sm" onClick={onExit}>
              Exit bulk edit
            </Button>
          ) : null}
          {onClearSelection ? (
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              Clear selection
            </Button>
          ) : null}
          <Button onClick={() => void handleSave()} disabled={saving || dirtyCount === 0}>
            {saving ? "Saving..." : `Save ${dirtyCount} changed row${dirtyCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto">
        {fillDrag ? (
          <div className="sticky top-0 z-30 flex justify-end pr-2 pt-2 pointer-events-none">
            <div className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              Filling {FILL_FIELD_LABELS[fillDrag.field]} into {fillDrag.targetRow - fillDrag.sourceRow} row
              {fillDrag.targetRow - fillDrag.sourceRow === 1 ? "" : "s"}
            </div>
          </div>
        ) : null}
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>CTC</TableHead>
              <TableHead>Basic %</TableHead>
              <TableHead>HRA %</TableHead>
              <TableHead>Allowance %</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, rowIndex) => {
              const d = drafts[emp.id];
              if (!d) return null;

              const teamsInDepartment =
                d.departmentId === "none"
                  ? teamOptions
                  : teamOptions.filter((t) => (t.departmentId || "") === d.departmentId);

              return (
                <TableRow key={emp.id} data-row-index={rowIndex}>
                  <TableCell>
                    <div className="min-w-45">
                      <p className="font-medium">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "email") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "email", rowIndex)}
                    >
                      <Input
                        value={d.email}
                        onChange={(e) => setField(emp.id, "email", e.target.value)}
                        className="min-w-55"
                      />
                      {renderFillHandle("email", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "fullName") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "fullName", rowIndex)}
                    >
                      <Input
                        value={d.fullName}
                        onChange={(e) => setField(emp.id, "fullName", e.target.value)}
                        className="min-w-45"
                      />
                      {renderFillHandle("fullName", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "phone") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "phone", rowIndex)}
                    >
                      <Input
                        value={d.phone}
                        onChange={(e) => setField(emp.id, "phone", e.target.value)}
                        className="min-w-35"
                      />
                      {renderFillHandle("phone", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "role") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "role", rowIndex)}
                    >
                      <Select value={d.role} onValueChange={(v) => setField(emp.id, "role", v)}>
                        <SelectTrigger className="min-w-35">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFillHandle("role", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn(
                        "relative group/fillcell",
                        isCellInFillRange(rowIndex, "departmentId") && "bg-primary/10 ring-1 ring-primary/30",
                      )}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "departmentId", rowIndex)}
                    >
                      <Select
                        value={d.departmentId || "none"}
                        onValueChange={(v) => applyDepartmentChange(emp.id, v)}
                      >
                        <SelectTrigger className="min-w-45">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departmentOptions.map((dpt) => (
                            <SelectItem key={dpt.id} value={dpt.id}>
                              {dpt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFillHandle("departmentId", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "teamId") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "teamId", rowIndex)}
                    >
                      <Select value={d.teamId || "none"} onValueChange={(v) => setField(emp.id, "teamId", v)}>
                        <SelectTrigger className="min-w-45">
                          <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {teamsInDepartment.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFillHandle("teamId", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn(
                        "relative group/fillcell",
                        isCellInFillRange(rowIndex, "managerId") && "bg-primary/10 ring-1 ring-primary/30",
                      )}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "managerId", rowIndex)}
                    >
                      <Select
                        value={d.managerId || "none"}
                        onValueChange={(v) => setField(emp.id, "managerId", v)}
                      >
                        <SelectTrigger className="min-w-55">
                          <SelectValue placeholder="Manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managerOptions.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFillHandle("managerId", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "jobTitle") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "jobTitle", rowIndex)}
                    >
                      {jobTitleOptions ? (
                        <Select
                          value={jobTitleOptions.some((opt) => opt.value === d.jobTitle) ? d.jobTitle : "none"}
                          onValueChange={(v) => setField(emp.id, "jobTitle", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="min-w-45">
                            <SelectValue placeholder="Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {jobTitleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={d.jobTitle}
                          onChange={(e) => setField(emp.id, "jobTitle", e.target.value)}
                          className="min-w-45"
                        />
                      )}
                      {renderFillHandle("jobTitle", rowIndex)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "shiftType") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "shiftType", rowIndex)}
                    >
                      <Select
                        value={d.shiftType || "unassigned"}
                        onValueChange={(v) => setField(emp.id, "shiftType", v)}
                      >
                        <SelectTrigger className="min-w-35">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shiftOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFillHandle("shiftType", rowIndex)}
                    </div>
                  </TableCell>

                  {numericFields.map((field) => (
                    <TableCell key={field}>
                      <div
                        className={cn(
                          "relative group/fillcell",
                          isCellInFillRange(rowIndex, field) && "bg-primary/10 ring-1 ring-primary/30",
                        )}
                        onMouseDown={(e) => maybeStartFillDragFromCorner(e, field, rowIndex)}
                      >
                        <Input
                          ref={setNumericCellRef(rowIndex, field)}
                          type="text"
                          inputMode="decimal"
                          value={formatWithCommas(d[field] as string)}
                          onChange={(e) => setField(emp.id, field, normalizeNumberText(e.target.value))}
                          onKeyDown={(e) => handleNumericArrowNavigation(e, rowIndex, field)}
                          className={
                            field === "allowancePct"
                              ? "min-w-30"
                              : field === "currentCtc"
                                ? "min-w-35"
                                : "min-w-28"
                          }
                        />
                        {renderFillHandle(field, rowIndex)}
                      </div>
                    </TableCell>
                  ))}

                  <TableCell>
                    <div
                      className={cn("relative group/fillcell", isCellInFillRange(rowIndex, "isActive") && "bg-primary/5")}
                      onMouseDown={(e) => maybeStartFillDragFromCorner(e, "isActive", rowIndex)}
                    >
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={(v) => setField(emp.id, "isActive", !!v)}
                      />
                      {renderFillHandle("isActive", rowIndex)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
