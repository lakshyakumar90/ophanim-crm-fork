"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HREmployee } from "@/types/hr.types";
import { updateHrEmployee } from "@/lib/hr-employee-api";
import { departmentsApi, teamsApi, usersApi } from "@/lib/api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { formatJoinedDisplay, formatCTC, canSeeFullCTC } from "@/lib/employeeHelpers";
import { useAuth } from "@/providers/auth-provider";
import { Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSalaryBands } from "@/hooks/hr/usePayroll";

type TeamOpt = {
  id: string;
  name?: string;
  departmentId?: string | null;
  department?: { name?: string | null } | null;
  departmentName?: string | null;
};

type DeptOpt = {
  id: string;
  name?: string;
};

type UserOpt = {
  id: string;
  fullName?: string;
  role?: string;
};

export function EmployeeOverviewTab({
  employee,
  editMode,
  onSaved,
  onOpenManager,
}: {
  employee: HREmployee;
  editMode: boolean;
  onSaved: () => Promise<void>;
  onOpenManager: (managerId: string) => void;
}) {
  const { user } = useAuth();
  const canSeeCTC = canSeeFullCTC(user?.permissions ?? []);

  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [departments, setDepartments] = useState<DeptOpt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [email, setEmail] = useState(employee.email || "");
  const [fullName, setFullName] = useState(employee.fullName);
  const [phone, setPhone] = useState(employee.phone || "");
  const [role, setRole] = useState(employee.role || "employee");
  const [departmentId, setDepartmentId] = useState(employee.departmentId || "");
  const [jobTitle, setJobTitle] = useState(employee.jobTitle || "");
  const [teamId, setTeamId] = useState(employee.teamId || "");
  const [managerId, setManagerId] = useState(employee.managerId || "");
  const [shiftType, setShiftType] = useState(employee.shiftType || "");
  const [isActive, setIsActive] = useState(!!employee.isActive);
  const [currentCtc, setCurrentCtc] = useState(
    employee.currentCtc === null || employee.currentCtc === undefined ? "" : String(employee.currentCtc),
  );
  const [basicPct, setBasicPct] = useState(
    employee.salaryComponents?.basic_pct === null || employee.salaryComponents?.basic_pct === undefined
      ? ""
      : String(employee.salaryComponents.basic_pct),
  );
  const [hraPct, setHraPct] = useState(
    employee.salaryComponents?.hra_pct === null || employee.salaryComponents?.hra_pct === undefined
      ? ""
      : String(employee.salaryComponents.hra_pct),
  );
  const [allowancePct, setAllowancePct] = useState(
    employee.salaryComponents?.allowance_pct === null ||
      employee.salaryComponents?.allowance_pct === undefined
      ? ""
      : String(employee.salaryComponents.allowance_pct),
  );
  const [timezone, setTimezone] = useState(employee.timezone || "");
  const [country, setCountry] = useState(employee.country || "");
  const [address, setAddress] = useState(employee.address || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(employee.email || "");
    setFullName(employee.fullName);
    setPhone(employee.phone || "");
    setRole(employee.role || "employee");
    setDepartmentId(employee.departmentId || "");
    setJobTitle(employee.jobTitle || "");
    setTeamId(employee.teamId || "");
    setManagerId(employee.managerId || "");
    setShiftType(employee.shiftType || "");
    setIsActive(!!employee.isActive);
    setCurrentCtc(
      employee.currentCtc === null || employee.currentCtc === undefined ? "" : String(employee.currentCtc),
    );
    setBasicPct(
      employee.salaryComponents?.basic_pct === null || employee.salaryComponents?.basic_pct === undefined
        ? ""
        : String(employee.salaryComponents.basic_pct),
    );
    setHraPct(
      employee.salaryComponents?.hra_pct === null || employee.salaryComponents?.hra_pct === undefined
        ? ""
        : String(employee.salaryComponents.hra_pct),
    );
    setAllowancePct(
      employee.salaryComponents?.allowance_pct === null ||
        employee.salaryComponents?.allowance_pct === undefined
        ? ""
        : String(employee.salaryComponents.allowance_pct),
    );
    setTimezone(employee.timezone || "");
    setCountry(employee.country || "");
    setAddress(employee.address || "");
  }, [employee]);

  useEffect(() => {
    void (async () => {
      const [t, d, u] = await Promise.allSettled([
        teamsApi.list(),
        departmentsApi.list(),
        usersApi.list({ page: 1, limit: 5000 }),
      ]);

      setTeams(
        t.status === "fulfilled" && Array.isArray(t.value)
          ? (t.value as TeamOpt[])
          : [],
      );
      setDepartments(
        d.status === "fulfilled" && Array.isArray(d.value)
          ? (d.value as DeptOpt[])
          : [],
      );

      if (u.status === "fulfilled") {
        const raw = u.value as any;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setUsers(list as UserOpt[]);
      } else {
        setUsers([]);
      }
    })();
  }, []);

  const teamsInDepartment = useMemo(() => {
    if (!departmentId) return teams;
    return teams.filter((t) => (t.departmentId || (t as any).department_id || "") === departmentId);
  }, [teams, departmentId]);

  const managerOptions = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "manager" || u.role === "hr"),
    [users],
  );

  const selectedTeam = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);
  const selectedDepartmentName =
    (selectedTeam?.department?.name ?? selectedTeam?.departmentName ?? "") || undefined;

  const { bands: salaryBands, isLoading: salaryBandsLoading } = useSalaryBands(selectedDepartmentName);
  const jobTitleOptions = useMemo(() => {
    const opts = Array.from(new Set((salaryBands ?? []).map((b) => b.designation).filter(Boolean)));
    opts.sort((a, b) => String(a).localeCompare(String(b)));
    return opts;
  }, [salaryBands]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const save = async () => {
    const body: Parameters<typeof updateHrEmployee>[1] = {};
    if (email.trim() !== (employee.email || "")) body.email = email.trim();
    if (fullName.trim() !== employee.fullName) body.fullName = fullName.trim();
    if (phone !== (employee.phone || "")) body.phone = phone || null;
    if (role !== (employee.role || "employee")) {
      body.role = role as NonNullable<Parameters<typeof updateHrEmployee>[1]["role"]>;
    }
    if (departmentId !== (employee.departmentId || "")) body.departmentId = departmentId || null;
    if (jobTitle !== (employee.jobTitle || "")) body.jobTitle = jobTitle || null;
    if (teamId !== (employee.teamId || "")) body.teamId = teamId || null;
    if (managerId !== (employee.managerId || "")) body.managerId = managerId || null;
    if (shiftType !== (employee.shiftType || "")) body.shiftType = shiftType || null;
    if (isActive !== !!employee.isActive) body.isActive = isActive;
    if (
      currentCtc !==
      (employee.currentCtc === null || employee.currentCtc === undefined ? "" : String(employee.currentCtc))
    ) {
      body.currentCtc = currentCtc.trim() === "" ? null : Number(currentCtc);
    }
    const salaryChanged =
      basicPct !==
        (employee.salaryComponents?.basic_pct === null || employee.salaryComponents?.basic_pct === undefined
          ? ""
          : String(employee.salaryComponents.basic_pct)) ||
      hraPct !==
        (employee.salaryComponents?.hra_pct === null || employee.salaryComponents?.hra_pct === undefined
          ? ""
          : String(employee.salaryComponents.hra_pct)) ||
      allowancePct !==
        (employee.salaryComponents?.allowance_pct === null ||
        employee.salaryComponents?.allowance_pct === undefined
          ? ""
          : String(employee.salaryComponents.allowance_pct));
    if (salaryChanged) {
      body.salaryComponents = {
        basic_pct: basicPct.trim() === "" ? undefined : Number(basicPct),
        hra_pct: hraPct.trim() === "" ? undefined : Number(hraPct),
        allowance_pct: allowancePct.trim() === "" ? undefined : Number(allowancePct),
      };
    }
    if (timezone !== (employee.timezone || "")) body.timezone = timezone || null;
    if (country !== (employee.country || "")) body.country = country || null;
    if (address !== (employee.address || "")) body.address = address || null;
    if (Object.keys(body).length === 0) {
      toast.message("No changes to save");
      return;
    }
    setSaving(true);
    try {
      await updateHrEmployee(employee.id, body);
      toast.success("Profile updated");
      await onSaved();
    } catch (e) {
      toastHrError(e, "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    email.trim() !== (employee.email || "") ||
    fullName.trim() !== employee.fullName ||
    phone !== (employee.phone || "") ||
    role !== (employee.role || "employee") ||
    departmentId !== (employee.departmentId || "") ||
    jobTitle !== (employee.jobTitle || "") ||
    teamId !== (employee.teamId || "") ||
    managerId !== (employee.managerId || "") ||
    shiftType !== (employee.shiftType || "") ||
    isActive !== !!employee.isActive ||
    currentCtc !== (employee.currentCtc === null || employee.currentCtc === undefined ? "" : String(employee.currentCtc)) ||
    basicPct !==
      (employee.salaryComponents?.basic_pct === null || employee.salaryComponents?.basic_pct === undefined
        ? ""
        : String(employee.salaryComponents.basic_pct)) ||
    hraPct !==
      (employee.salaryComponents?.hra_pct === null || employee.salaryComponents?.hra_pct === undefined
        ? ""
        : String(employee.salaryComponents.hra_pct)) ||
    allowancePct !==
      (employee.salaryComponents?.allowance_pct === null || employee.salaryComponents?.allowance_pct === undefined
        ? ""
        : String(employee.salaryComponents.allowance_pct)) ||
    timezone !== (employee.timezone || "") ||
    country !== (employee.country || "") ||
    address !== (employee.address || "");

  const joined = employee.dateOfJoining || employee.createdAt;

  return (
    <div className="space-y-6">
      {editMode ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role || "employee"} onValueChange={(v) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={departmentId || "__none__"}
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  setDepartmentId(next);
                  if (teamId) {
                    const currentTeam = teams.find((t) => t.id === teamId);
                    const teamDept = (currentTeam?.departmentId || (currentTeam as any)?.department_id || "") as string;
                    if (next && teamDept && teamDept !== next) {
                      setTeamId("");
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name || d.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Job title / designation</Label>
              <Select
                value={jobTitle || "__none__"}
                onValueChange={(v) => setJobTitle(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={salaryBandsLoading ? "Loading…" : "Select designation"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {jobTitleOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                  {jobTitle && !jobTitleOptions.includes(jobTitle) ? (
                    <SelectItem value={jobTitle}>{jobTitle.replace(/_/g, " ")}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Team</Label>
              <Select value={teamId || "__none__"} onValueChange={(v) => setTeamId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {teamsInDepartment.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || t.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Manager</Label>
              <Select value={managerId || "__none__"} onValueChange={(v) => setManagerId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName || m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shiftType || "__none__"} onValueChange={(v) => setShiftType(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  <SelectItem value="day_shift">Day shift</SelectItem>
                  <SelectItem value="night_shift">Night shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current CTC</Label>
              <Input type="number" min="0" value={currentCtc} onChange={(e) => setCurrentCtc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Basic %</Label>
              <Input type="number" min="0" max="100" value={basicPct} onChange={(e) => setBasicPct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>HRA %</Label>
              <Input type="number" min="0" max="100" value={hraPct} onChange={(e) => setHraPct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Allowance %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={allowancePct}
                onChange={(e) => setAllowancePct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Full user profile fields can be updated from this panel.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-1" onClick={() => void copy(employee.email)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="break-all">{employee.email}</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Phone</span>
              <p className="mt-1">{employee.phone || "—"}</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Timezone</span>
              <p className="mt-1">{employee.timezone || "—"}</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Country</span>
              <p className="mt-1">{employee.country || "—"}</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Address</span>
              <p className="mt-1">{employee.address || "—"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Work</h3>
            <p className="text-sm">
              <span className="text-muted-foreground">Role</span>
              <br />
              {employee.role || "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Department</span>
              <br />
              {employee.departmentName || "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Team</span>
              <br />
              {employee.teamName || "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Manager</span>
              <br />
              {employee.reportingManagerId && employee.reportingManagerName ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => onOpenManager(employee.reportingManagerId!)}
                >
                  {employee.reportingManagerName}
                </button>
              ) : (
                "—"
              )}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Joined</span>
              <br />
              {formatJoinedDisplay(joined)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Direct manager</span>
              <br />
              {employee.managerId || "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Shift</span>
              <br />
              {employee.shiftType || "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Account status</span>
              <br />
              {employee.isActive ? "Active" : "Inactive"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Current CTC (directory)</span>
              <br />
              {formatCTC(employee.currentCtc ?? null, canSeeCTC)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Salary components</span>
              <br />
              {`Basic ${employee.salaryComponents?.basic_pct ?? "—"}% | HRA ${employee.salaryComponents?.hra_pct ?? "—"}% | Allowance ${employee.salaryComponents?.allowance_pct ?? "—"}%`}
            </p>
          </div>
        </div>
      )}

      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-2">Emergency contact</h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
          No emergency contact on record (not yet available from API).
        </p>
      </div>
    </div>
  );
}
